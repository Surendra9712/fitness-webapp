import base64
import hashlib
import hmac
import json
import os
from typing import Optional

import requests as http_req
from flask import Blueprint, jsonify, request
from database.connection import get_connection
from middleware.auth import role_required

payment_bp = Blueprint('payment', __name__)

ESEWA_SECRET       = os.getenv('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q')
ESEWA_PRODUCT_CODE = os.getenv('ESEWA_PRODUCT_CODE', 'EPAYTEST')
KHALTI_SECRET      = os.getenv('KHALTI_SECRET_KEY', 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234')
KHALTI_LOOKUP_URL  = os.getenv('KHALTI_LOOKUP_URL', 'https://a.khalti.com/api/v2/epayment/lookup/')


def _order_id_from_ref(ref: str) -> Optional[int]:
    # format: "order-{id}-{timestamp_ms}"
    try:
        return int(ref.split('-')[1])
    except (ValueError, IndexError):
        return None


def _user_id_from_sub_ref(ref: str) -> Optional[int]:
    # format: "sub-{user_id}-{timestamp_ms}"
    try:
        return int(ref.split('-')[1])
    except (ValueError, IndexError):
        return None


# ── eSewa subscription verify ────────────────────────────────────────────────

@payment_bp.route('/subscription/esewa/verify', methods=['POST'])
@role_required('trainee')
def esewa_subscription_verify():
    data_b64 = (request.get_json() or {}).get('data', '')
    if not data_b64:
        return jsonify({'error': 'Missing data'}), 400

    try:
        padded = data_b64 + '=' * (-len(data_b64) % 4)
        try:
            payload = json.loads(base64.b64decode(padded).decode('utf-8'))
        except Exception:
            payload = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
    except Exception:
        return jsonify({'error': f'Could not decode eSewa response: {data_b64[:60]}'}), 400

    signed_fields = payload.get('signed_field_names', '').split(',')
    message = ','.join(f"{f}={payload.get(f, '')}" for f in signed_fields)
    digest  = hmac.new(ESEWA_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    computed = base64.b64encode(digest).decode()
    if payload.get('signature') != computed:
        return jsonify({'error': 'Signature mismatch'}), 400

    if payload.get('status') != 'COMPLETE':
        return jsonify({'error': f"eSewa status: {payload.get('status', 'unknown')}"}), 400

    user_id = _user_id_from_sub_ref(payload.get('transaction_uuid', ''))
    if user_id is None or user_id != request.user_id:
        return jsonify({'error': 'Invalid transaction reference'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET subscription_plan='pro', subscription_status='active', "
            "subscription_payment_method='esewa' WHERE id = %s",
            (user_id,),
        )
        conn.commit()
        return jsonify({'message': 'Subscription activated', 'subscription_plan': 'pro', 'subscription_status': 'active'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── eSewa verify ──────────────────────────────────────────────────────────────

@payment_bp.route('/esewa/verify', methods=['POST'])
@role_required('trainee')
def esewa_verify():
    data_b64 = (request.get_json() or {}).get('data', '')
    if not data_b64:
        return jsonify({'error': 'Missing data'}), 400

    try:
        # Add padding if stripped, handle both standard and url-safe base64
        padded = data_b64 + '=' * (-len(data_b64) % 4)
        try:
            payload = json.loads(base64.b64decode(padded).decode('utf-8'))
        except Exception:
            payload = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
    except Exception:
        return jsonify({'error': f'Could not decode eSewa response: {data_b64[:60]}'}), 400

    # Verify signature using the signed_field_names eSewa sends back
    signed_fields = payload.get('signed_field_names', '').split(',')
    message = ','.join(f"{f}={payload.get(f, '')}" for f in signed_fields)
    digest = hmac.new(ESEWA_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    computed = base64.b64encode(digest).decode()
    if payload.get('signature') != computed:
        return jsonify({'error': 'Signature mismatch'}), 400

    if payload.get('status') != 'COMPLETE':
        return jsonify({
            'error': f"eSewa payment status: {payload.get('status', 'unknown')}",
            'detail': payload,
        }), 400

    order_id = _order_id_from_ref(payload.get('transaction_uuid', ''))
    if order_id is None:
        return jsonify({'error': 'Invalid transaction reference'}), 400

    return _mark_paid(order_id, payload.get('transaction_code', ''))


# ── Khalti verify ─────────────────────────────────────────────────────────────

@payment_bp.route('/khalti/verify', methods=['POST'])
@role_required('trainee')
def khalti_verify():
    pidx = (request.get_json() or {}).get('pidx', '')
    if not pidx:
        return jsonify({'error': 'pidx is required'}), 400

    headers = {'Authorization': f'Key {KHALTI_SECRET}'}
    try:
        resp = http_req.post(KHALTI_LOOKUP_URL, json={'pidx': pidx}, headers=headers, timeout=10)
    except http_req.RequestException as e:
        return jsonify({'error': f'Khalti lookup failed: {str(e)}'}), 502

    if not resp.ok:
        return jsonify({'error': 'Khalti verification failed', 'detail': resp.text}), 400

    data = resp.json()
    if data.get('status') != 'Completed':
        return jsonify({'error': f"Payment status: {data.get('status', 'unknown')}"}), 400

    order_id = _order_id_from_ref(data.get('purchase_order_id', ''))
    if order_id is None:
        return jsonify({'error': 'Invalid order reference'}), 400

    return _mark_paid(order_id, data.get('transaction_id', pidx))


# ── Shared helper ─────────────────────────────────────────────────────────────

def _mark_paid(order_id: int, ref: str):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, user_id, payment_status FROM orders WHERE id = %s AND deleted_at IS NULL",
            (order_id,),
        )
        order = cursor.fetchone()
        if not order or order['user_id'] != request.user_id:
            return jsonify({'error': 'Order not found'}), 404
        if order['payment_status'] == 'paid':
            return jsonify({'message': 'Already paid', 'order_id': order_id})

        # Deduct stock now that payment is confirmed
        cursor.execute(
            "SELECT product_id, quantity FROM order_items WHERE order_id = %s",
            (order_id,),
        )
        for item in cursor.fetchall():
            cursor.execute(
                "UPDATE products SET stock_quantity = stock_quantity - %s WHERE id = %s",
                (item['quantity'], item['product_id']),
            )

        cursor.execute(
            "UPDATE orders SET payment_status = 'paid', payment_ref = %s WHERE id = %s",
            (ref, order_id),
        )

        conn.commit()
        return jsonify({'message': 'Payment verified', 'order_id': order_id})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
