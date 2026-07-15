import base64
import hashlib
import hmac
import json
import os
from typing import Optional

import stripe
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse

from database.connection import get_connection
from dependencies import CurrentUser, require_roles

router = APIRouter()

ESEWA_SECRET       = os.getenv('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q')
ESEWA_PRODUCT_CODE = os.getenv('ESEWA_PRODUCT_CODE', 'EPAYTEST')
STRIPE_SECRET_KEY  = os.getenv('STRIPE_SECRET_KEY', '')
stripe.api_key = STRIPE_SECRET_KEY


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

@router.post('/subscription/esewa/verify')
def esewa_subscription_verify(body: dict, user: CurrentUser = Depends(require_roles('trainee'))):
    data_b64 = (body or {}).get('data', '')
    if not data_b64:
        return JSONResponse({'error': 'Missing data'}, status_code=400)

    try:
        padded = data_b64 + '=' * (-len(data_b64) % 4)
        try:
            payload = json.loads(base64.b64decode(padded).decode('utf-8'))
        except Exception:
            payload = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
    except Exception:
        return JSONResponse({'error': f'Could not decode eSewa response: {data_b64[:60]}'}, status_code=400)

    signed_fields = payload.get('signed_field_names', '').split(',')
    message = ','.join(f"{f}={payload.get(f, '')}" for f in signed_fields)
    digest  = hmac.new(ESEWA_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    computed = base64.b64encode(digest).decode()
    if payload.get('signature') != computed:
        return JSONResponse({'error': 'Signature mismatch'}, status_code=400)

    if payload.get('status') != 'COMPLETE':
        return JSONResponse({'error': f"eSewa status: {payload.get('status', 'unknown')}"}, status_code=400)

    user_id = _user_id_from_sub_ref(payload.get('transaction_uuid', ''))
    if user_id is None or user_id != user.user_id:
        return JSONResponse({'error': 'Invalid transaction reference'}, status_code=400)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET subscription_plan='pro', subscription_status='active', "
            "subscription_payment_method='esewa' WHERE id = %s",
            (user_id,),
        )
        conn.commit()
        return {'message': 'Subscription activated', 'subscription_plan': 'pro', 'subscription_status': 'active'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Stripe subscription verify ───────────────────────────────────────────────

@router.post('/subscription/stripe/verify')
def stripe_subscription_verify(body: dict, user: CurrentUser = Depends(require_roles('trainee'))):
    session_id = (body or {}).get('session_id', '').strip()
    if not session_id:
        return JSONResponse({'error': 'Missing session_id'}, status_code=400)
    if not STRIPE_SECRET_KEY:
        return JSONResponse({'error': 'Stripe is not configured. Set STRIPE_SECRET_KEY in backend/.env.'}, status_code=503)

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        return JSONResponse({'error': f'Stripe error: {e}'}, status_code=502)

    if session.payment_status != 'paid':
        return JSONResponse({'error': f"Stripe payment status: {session.payment_status}"}, status_code=400)

    user_id_raw = getattr(session.metadata, 'user_id', None)
    if user_id_raw is None or int(user_id_raw) != user.user_id:
        return JSONResponse({'error': 'Invalid transaction reference'}, status_code=400)
    user_id = int(user_id_raw)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET subscription_plan='pro', subscription_status='active', "
            "subscription_payment_method='stripe' WHERE id = %s",
            (user_id,),
        )
        conn.commit()
        return {'message': 'Subscription activated', 'subscription_plan': 'pro', 'subscription_status': 'active'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── eSewa verify ──────────────────────────────────────────────────────────────

@router.post('/esewa/verify')
def esewa_verify(body: dict, user: CurrentUser = Depends(require_roles('trainee'))):
    data_b64 = (body or {}).get('data', '')
    if not data_b64:
        return JSONResponse({'error': 'Missing data'}, status_code=400)

    try:
        # Add padding if stripped, handle both standard and url-safe base64
        padded = data_b64 + '=' * (-len(data_b64) % 4)
        try:
            payload = json.loads(base64.b64decode(padded).decode('utf-8'))
        except Exception:
            payload = json.loads(base64.urlsafe_b64decode(padded).decode('utf-8'))
    except Exception:
        return JSONResponse({'error': f'Could not decode eSewa response: {data_b64[:60]}'}, status_code=400)

    # Verify signature using the signed_field_names eSewa sends back
    signed_fields = payload.get('signed_field_names', '').split(',')
    message = ','.join(f"{f}={payload.get(f, '')}" for f in signed_fields)
    digest = hmac.new(ESEWA_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    computed = base64.b64encode(digest).decode()
    if payload.get('signature') != computed:
        return JSONResponse({'error': 'Signature mismatch'}, status_code=400)

    if payload.get('status') != 'COMPLETE':
        return JSONResponse({
            'error': f"eSewa payment status: {payload.get('status', 'unknown')}",
            'detail': payload,
        }, status_code=400)

    order_id = _order_id_from_ref(payload.get('transaction_uuid', ''))
    if order_id is None:
        return JSONResponse({'error': 'Invalid transaction reference'}, status_code=400)

    return _mark_paid(order_id, payload.get('transaction_code', ''), user.user_id)


# ── Stripe verify ─────────────────────────────────────────────────────────────

@router.post('/stripe/verify')
def stripe_verify(body: dict, user: CurrentUser = Depends(require_roles('trainee'))):
    session_id = (body or {}).get('session_id', '').strip()
    if not session_id:
        return JSONResponse({'error': 'Missing session_id'}, status_code=400)
    if not STRIPE_SECRET_KEY:
        return JSONResponse({'error': 'Stripe is not configured. Set STRIPE_SECRET_KEY in backend/.env.'}, status_code=503)

    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except Exception as e:
        return JSONResponse({'error': f'Stripe error: {e}'}, status_code=502)

    if session.payment_status != 'paid':
        return JSONResponse({'error': f"Stripe payment status: {session.payment_status}"}, status_code=400)

    order_id = getattr(session.metadata, 'order_id', None)
    if not order_id:
        return JSONResponse({'error': 'Missing order reference on Stripe session'}, status_code=400)

    return _mark_paid(int(order_id), session.payment_intent or session.id, user.user_id)


# ── Shared helper ─────────────────────────────────────────────────────────────

def _mark_paid(order_id: int, ref: str, requesting_user_id: int):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, user_id, payment_status FROM orders WHERE id = %s AND deleted_at IS NULL",
            (order_id,),
        )
        order = cursor.fetchone()
        if not order or order['user_id'] != requesting_user_id:
            return JSONResponse({'error': 'Order not found'}, status_code=404)
        if order['payment_status'] == 'paid':
            return {'message': 'Already paid', 'order_id': order_id}

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
        return {'message': 'Payment verified', 'order_id': order_id}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
