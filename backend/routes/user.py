from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field, ValidationError, field_validator
from pydantic import ConfigDict
from typing import List, Optional
import base64
import datetime
import hashlib
import hmac
import json
import os
import time
import requests as http_req
import stripe
from database.connection import get_connection
from middleware.auth import generate_token, role_required
from routes.dietitian import UpdateTrainerProfileSchema, CertificationSchema
from utils.validation import pydantic_errors
from utils.pagination import parse_page_params, paginated_response
from utils.notify import push, push_to_admins
from utils.fx import npr_to_usd_cents

ESEWA_SECRET       = os.getenv('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q')
ESEWA_PRODUCT_CODE = os.getenv('ESEWA_PRODUCT_CODE', 'EPAYTEST')
ESEWA_URL          = os.getenv('ESEWA_URL', 'https://rc-epay.esewa.com.np/api/epay/main/v2/form')
STRIPE_SECRET_KEY  = os.getenv('STRIPE_SECRET_KEY', '')
STRIPE_CURRENCY    = os.getenv('STRIPE_CURRENCY', 'usd')
FRONTEND_URL       = os.getenv('FRONTEND_URL', 'http://localhost:5173')
stripe.api_key = STRIPE_SECRET_KEY

STRIPE_MIN_USD_CENTS = 50  # Stripe's minimum chargeable amount in USD

user_bp = Blueprint('user', __name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class BecomeTrainerSchema(UpdateTrainerProfileSchema):
    certifications: List[CertificationSchema] = Field(default_factory=list)

class OrderItemSchema(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class PlaceOrderSchema(BaseModel):
    items: list[OrderItemSchema] = Field(min_length=1)
    shipping_address: Optional[str] = None
    payment_method: str = 'cod'
    promo_code: Optional[str] = None
    points_to_redeem: int = Field(default=0, ge=0)

    @field_validator('payment_method')
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        if v not in ('cod', 'esewa', 'stripe'):
            raise ValueError('payment_method must be cod, esewa, or stripe')
        return v


class RequestProductSchema(BaseModel):
    product_name: str = Field(min_length=1)
    description: Optional[str] = None
    reason: Optional[str] = None
    image_url: Optional[str] = None

    @field_validator('product_name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return str(v).strip() if isinstance(v, str) else v


class RequestTrainerSchema(BaseModel):
    trainer_id: int
    customer_note: Optional[str] = None


class ReviewSchema(BaseModel):
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None


class UpdateProfileSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    age: Optional[int] = Field(default=None, ge=1, le=120)
    weight_kg: Optional[float] = Field(default=None, gt=0)
    height_cm: Optional[float] = Field(default=None, gt=0)
    gender: Optional[str] = None
    goal: Optional[str] = None
    activity_level: Optional[str] = None

# ── Dashboard ─────────────────────────────────────────────────────────────────

def _compute_metrics(profile: dict) -> Optional[dict]:
    """Return BMI / BMR / TDEE / macros from a user_profiles row, or None if data missing."""
    w = profile.get('current_weight_kg')
    h = profile.get('height_cm')
    if not w or not h:
        return None
    w, h = float(w), float(h)

    dob = profile.get('date_of_birth')
    try:
        if isinstance(dob, (datetime.date, datetime.datetime)):
            today_d = datetime.date.today()
            age = today_d.year - dob.year - ((today_d.month, today_d.day) < (dob.month, dob.day))
        elif dob:
            d = datetime.date.fromisoformat(str(dob)[:10])
            today_d = datetime.date.today()
            age = today_d.year - d.year - ((today_d.month, today_d.day) < (d.month, d.day))
        else:
            age = 30
    except Exception:
        age = 30

    gender = profile.get('gender', 'male')
    if gender == 'female':
        bmr = 10 * w + 6.25 * h - 5 * age - 161
    else:
        bmr = 10 * w + 6.25 * h - 5 * age + 5

    multipliers = {
        'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55,
        'active': 1.725, 'very_active': 1.9,
    }
    activity = profile.get('activity_level', 'moderate')
    tdee = bmr * multipliers.get(activity, 1.55)

    goal = profile.get('primary_goal', 'maintain')
    if goal == 'lose_weight':
        calories = tdee - 500
    elif goal == 'gain_muscle':
        calories = tdee + 300
    else:
        calories = tdee
    calories = max(calories, 1200)

    protein = w * 1.6
    fat = calories * 0.25 / 9
    carbs = max((calories - protein * 4 - fat * 9) / 4, 0)

    bmi = w / ((h / 100) ** 2)
    if bmi < 18.5:
        bmi_category = 'Underweight'
    elif bmi < 25:
        bmi_category = 'Normal'
    elif bmi < 30:
        bmi_category = 'Overweight'
    else:
        bmi_category = 'Obese'

    return {
        'bmi': round(bmi, 1),
        'bmi_category': bmi_category,
        'bmr': round(bmr),
        'tdee': round(tdee),
        'daily_calories': round(calories),
        'macros': {
            'protein': round(protein),
            'carbs': round(carbs),
            'fat': round(fat),
        },
    }


@user_bp.route('/dashboard', methods=['GET'])
@role_required('trainee')
def dashboard():
    today = request.args.get('date')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS orders_count FROM orders WHERE user_id = %s",
            (request.user_id,),
        )
        orders_count = cursor.fetchone()['orders_count']

        cursor.execute(
            "SELECT COUNT(*) AS pending_requests FROM product_requests WHERE user_id = %s AND status = 'pending'",
            (request.user_id,),
        )
        pending_requests = cursor.fetchone()['pending_requests']

        cursor.execute(
            "SELECT current_weight_kg, height_cm, date_of_birth, gender, activity_level, primary_goal "
            "FROM user_profiles WHERE user_id = %s",
            (request.user_id,),
        )
        profile = cursor.fetchone() or {}
        metrics = _compute_metrics(profile)

        return jsonify({
            'date': today,
            'orders_count': int(orders_count),
            'pending_requests': int(pending_requests),
            'metrics': metrics,
        })
    finally:
        cursor.close()
        conn.close()


# ── Products (shop) ───────────────────────────────────────────────────────────

def _compute_effective_price(price, discount_type, discount_value):
    """Return (effective_price, discounted_price_or_None)."""
    price = float(price)
    if not discount_type or not discount_value or float(discount_value) <= 0:
        return price, None
    dv = float(discount_value)
    if discount_type == 'percentage':
        ep = round(price * (1 - dv / 100), 2)
    else:
        ep = round(max(0.0, price - dv), 2)
    return ep, ep


def _get_global_discount(cursor):
    cursor.execute(
        "SELECT `key`, value FROM site_settings "
        "WHERE `key` IN ('global_discount_type','global_discount_value','global_discount_active')"
    )
    s = {row['key']: row['value'] for row in cursor.fetchall()}
    return {
        'type':      s.get('global_discount_type', 'percentage'),
        'value':     float(s.get('global_discount_value', '0') or '0'),
        'is_active': s.get('global_discount_active', '0') == '1',
    }


@user_bp.route('/products', methods=['GET'])
@role_required('trainee')
def list_products():
    category_slug = request.args.get('category', '').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base = (
            "SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
            "c.slug AS category, c.name AS category_name, p.image_url, "
            "p.discount_type, p.discount_value "
            "FROM products p JOIN categories c ON p.category_id = c.id "
            "WHERE p.status = 'active' AND p.deleted_at IS NULL AND c.deleted_at IS NULL "
        )
        if category_slug:
            cursor.execute(base + "AND c.slug = %s ORDER BY p.name", (category_slug,))
        else:
            cursor.execute(base + "ORDER BY c.name, p.name")
        rows = cursor.fetchall()
        for row in rows:
            _, dp = _compute_effective_price(row['price'], row.get('discount_type'), row.get('discount_value'))
            row['discounted_price'] = dp
        return jsonify(rows)
    finally:
        cursor.close()
        conn.close()


# ── Orders ────────────────────────────────────────────────────────────────────


@user_bp.route('/orders', methods=['POST'])
@role_required('trainee', 'dietitian')
def place_order():
    try:
        body = PlaceOrderSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Resolve products and compute cart total (using effective prices after product discounts)
        item_subtotal = 0.0
        resolved = []
        for item in body.items:
            cursor.execute(
                "SELECT id, name, price, stock_quantity, discount_type, discount_value "
                "FROM products WHERE id = %s AND status = 'active' AND deleted_at IS NULL",
                (item.product_id,),
            )
            product = cursor.fetchone()
            if not product:
                return jsonify({'error': f"Product {item.product_id} not found"}), 404
            if product['stock_quantity'] < item.quantity:
                return jsonify({'error': f"Insufficient stock for '{product['name']}'"}), 400
            effective_price, _ = _compute_effective_price(
                product['price'], product.get('discount_type'), product.get('discount_value')
            )
            item_subtotal += effective_price * item.quantity
            resolved.append({'product': product, 'quantity': item.quantity, 'effective_price': effective_price})

        item_subtotal = round(item_subtotal, 2)

        # --- Global discount ---
        gd = _get_global_discount(cursor)
        global_discount_amount = 0.0
        if gd['is_active'] and gd['value'] > 0:
            if gd['type'] == 'percentage':
                global_discount_amount = round(item_subtotal * gd['value'] / 100, 2)
            else:
                global_discount_amount = min(gd['value'], item_subtotal)
        after_global = round(item_subtotal - global_discount_amount, 2)

        # --- Promo code validation ---
        promo_code_id = None
        discount_amount = 0.0
        if body.promo_code:
            cursor.execute(
                "SELECT id, discount_type, discount_value, min_order_amount, "
                "max_uses, current_uses, valid_from, valid_to, is_active "
                "FROM promo_codes WHERE code = %s",
                (body.promo_code.strip().upper(),),
            )
            promo = cursor.fetchone()
            if not promo:
                return jsonify({'error': 'Promo code not found'}), 404
            if not promo['is_active']:
                return jsonify({'error': 'Promo code is inactive'}), 400
            today = datetime.date.today()
            if promo['valid_from'] and today < promo['valid_from']:
                return jsonify({'error': 'Promo code is not yet valid'}), 400
            if promo['valid_to'] and today > promo['valid_to']:
                return jsonify({'error': 'Promo code has expired'}), 400
            if promo['max_uses'] is not None and promo['current_uses'] >= promo['max_uses']:
                return jsonify({'error': 'Promo code usage limit reached'}), 400
            if after_global < float(promo['min_order_amount']):
                return jsonify({'error': f"Minimum order amount is Rs. {promo['min_order_amount']}"}), 400
            promo_code_id = promo['id']
            if promo['discount_type'] == 'percentage':
                discount_amount = round(after_global * float(promo['discount_value']) / 100, 2)
            else:
                discount_amount = min(float(promo['discount_value']), after_global)

        # --- Points redemption ---
        points_to_redeem = body.points_to_redeem
        points_discount = 0.0
        if points_to_redeem > 0:
            cursor.execute("SELECT reward_points FROM users WHERE id = %s", (request.user_id,))
            u = cursor.fetchone()
            if not u or u['reward_points'] < points_to_redeem:
                return jsonify({'error': 'Insufficient reward points'}), 400
            points_discount = float(points_to_redeem)  # 1 point = Rs. 1

        # --- Final total ---
        final_total = max(0.0, round(after_global - discount_amount - points_discount, 2))

        cursor.execute(
            "INSERT INTO orders (user_id, total_amount, shipping_address, payment_method, payment_status, "
            "promo_code_id, discount_amount, points_redeemed, points_discount, global_discount_amount) "
            "VALUES (%s, %s, %s, %s, 'pending', %s, %s, %s, %s, %s)",
            (request.user_id, final_total, body.shipping_address, body.payment_method,
             promo_code_id, discount_amount, points_to_redeem, points_discount, global_discount_amount),
        )
        order_id = cursor.lastrowid

        for r in resolved:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) "
                "VALUES (%s, %s, %s, %s)",
                (order_id, r['product']['id'], r['quantity'], r['effective_price']),
            )
            if body.payment_method == 'cod':
                cursor.execute(
                    "UPDATE products SET stock_quantity = stock_quantity - %s WHERE id = %s",
                    (r['quantity'], r['product']['id']),
                )

        if promo_code_id:
            cursor.execute(
                "UPDATE promo_codes SET current_uses = current_uses + 1 WHERE id = %s",
                (promo_code_id,),
            )
        if points_to_redeem > 0:
            cursor.execute(
                "UPDATE users SET reward_points = reward_points - %s WHERE id = %s",
                (points_to_redeem, request.user_id),
            )
            cursor.execute(
                "INSERT INTO point_transactions (user_id, points, type, reference_id, description) "
                "VALUES (%s, %s, 'redeemed', %s, %s)",
                (request.user_id, points_to_redeem, order_id, f"Points redeemed for order #{order_id}"),
            )

        push_to_admins(cursor, 'order_received',
                       f"New Order #{order_id} Received",
                       f"A new order of Rs. {final_total} has been placed.",
                       order_id)
        conn.commit()

        # ── COD: return (points awarded when admin marks order as shipped) ──
        if body.payment_method == 'cod':
            return jsonify({
                'id': order_id,
                'total_amount': final_total,
                'payment_method': 'cod',
            }), 201

        transaction_uuid = f"order-{order_id}-{int(time.time() * 1000)}"
        final_str = f"{final_total:.2f}"

        # ── eSewa ────────────────────────────────────────────────────────────
        if body.payment_method == 'esewa':
            message = f"total_amount={final_str},transaction_uuid={transaction_uuid},product_code={ESEWA_PRODUCT_CODE}"
            sig = base64.b64encode(
                hmac.new(ESEWA_SECRET.encode(), message.encode(), hashlib.sha256).digest()
            ).decode()

            esewa_params = {
                'amount': final_str,
                'tax_amount': '0',
                'total_amount': final_str,
                'transaction_uuid': transaction_uuid,
                'product_code': ESEWA_PRODUCT_CODE,
                'product_service_charge': '0',
                'product_delivery_charge': '0',
                'success_url': f"{FRONTEND_URL}/payment/esewa/success",
                'failure_url': f"{FRONTEND_URL}/payment/esewa/failure",
                'signed_field_names': 'total_amount,transaction_uuid,product_code',
                'signature': sig,
            }
            return jsonify({
                'id': order_id,
                'payment_method': 'esewa',
                'esewa_url': ESEWA_URL,
                'esewa_params': esewa_params,
            }), 201

        # ── Stripe ───────────────────────────────────────────────────────────
        if body.payment_method == 'stripe':
            if not STRIPE_SECRET_KEY:
                return jsonify({
                    'error': 'Stripe is not configured. Set STRIPE_SECRET_KEY in backend/.env '
                             '(get a test secret key from https://dashboard.stripe.com/test/apikeys).',
                }), 503

            usd_amount, usd_cents, fx_rate = npr_to_usd_cents(final_total)
            if usd_cents < STRIPE_MIN_USD_CENTS:
                return jsonify({
                    'error': f'Order total is too small to charge via Stripe '
                             f'(minimum ~Rs. {STRIPE_MIN_USD_CENTS / 100 * fx_rate:.0f}). '
                             'Please choose another payment method.',
                }), 400

            try:
                session = stripe.checkout.Session.create(
                    mode='payment',
                    payment_method_types=['card'],
                    line_items=[{
                        'price_data': {
                            'currency': STRIPE_CURRENCY,
                            'product_data': {'name': f"Order #{order_id} (Rs. {final_total:.2f})"},
                            'unit_amount': usd_cents,
                        },
                        'quantity': 1,
                    }],
                    success_url=f"{FRONTEND_URL}/payment/stripe/return?session_id={{CHECKOUT_SESSION_ID}}",
                    cancel_url=f"{FRONTEND_URL}/payment/stripe/cancel",
                    metadata={'order_id': str(order_id)},
                    client_reference_id=transaction_uuid,
                )
            except Exception as e:
                return jsonify({'error': f'Stripe error: {e}'}), 502

            return jsonify({
                'id': order_id,
                'payment_method': 'stripe',
                'stripe_url': session.url,
                'session_id': session.id,
                'usd_amount': usd_amount,
                'fx_rate': fx_rate,
            }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/promo/available', methods=['GET'])
@role_required('trainee', 'dietitian')
def available_promos():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = datetime.date.today()
        cursor.execute(
            """
            SELECT p.id, p.code, p.description, p.discount_type, p.discount_value,
                   p.min_order_amount, p.max_uses, p.current_uses, p.valid_from, p.valid_to
            FROM promo_codes p
            WHERE p.is_active = 1
              AND (p.valid_from IS NULL OR p.valid_from <= %s)
              AND (p.valid_to IS NULL OR p.valid_to >= %s)
              AND (p.max_uses IS NULL OR p.current_uses < p.max_uses)
              AND p.id NOT IN (
                  SELECT promo_code_id FROM orders
                  WHERE user_id = %s AND promo_code_id IS NOT NULL AND deleted_at IS NULL
              )
            ORDER BY p.created_at DESC
            """,
            (today, today, request.user_id),
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/promo/validate', methods=['POST'])
@role_required('trainee', 'dietitian')
def validate_promo():
    body = request.get_json() or {}
    code = (body.get('code') or '').strip().upper()
    order_total = float(body.get('order_total', 0))
    if not code:
        return jsonify({'error': 'code is required'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, code, discount_type, discount_value, min_order_amount, "
            "max_uses, current_uses, valid_from, valid_to, is_active "
            "FROM promo_codes WHERE code = %s",
            (code,),
        )
        promo = cursor.fetchone()
        if not promo:
            return jsonify({'error': 'Promo code not found'}), 404
        if not promo['is_active']:
            return jsonify({'error': 'Promo code is inactive'}), 400
        today = datetime.date.today()
        if promo['valid_from'] and today < promo['valid_from']:
            return jsonify({'error': 'Promo code is not yet valid'}), 400
        if promo['valid_to'] and today > promo['valid_to']:
            return jsonify({'error': 'Promo code has expired'}), 400
        if promo['max_uses'] is not None and promo['current_uses'] >= promo['max_uses']:
            return jsonify({'error': 'Promo code usage limit reached'}), 400
        if order_total > 0 and order_total < float(promo['min_order_amount']):
            return jsonify({'error': f"Minimum order amount is Rs. {promo['min_order_amount']}"}), 400

        if promo['discount_type'] == 'percentage':
            discount = round(order_total * float(promo['discount_value']) / 100, 2) if order_total > 0 else 0
        else:
            discount = min(float(promo['discount_value']), order_total) if order_total > 0 else float(promo['discount_value'])

        return jsonify({
            'promo_id': promo['id'],
            'code': promo['code'],
            'discount_type': promo['discount_type'],
            'discount_value': float(promo['discount_value']),
            'discount_amount': discount,
            'min_order_amount': float(promo['min_order_amount']),
        })
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/points', methods=['GET'])
@role_required('trainee', 'dietitian')
def get_points():
    page, page_size, offset = parse_page_params(default_size=20)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT reward_points FROM users WHERE id = %s AND deleted_at IS NULL",
            (request.user_id,),
        )
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({'error': 'User not found'}), 404
        cursor.execute(
            "SELECT COUNT(*) AS total FROM point_transactions WHERE user_id = %s",
            (request.user_id,),
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            "SELECT id, points, type, reference_id, description, created_at "
            "FROM point_transactions WHERE user_id = %s "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (request.user_id, page_size, offset),
        )
        return jsonify({
            'reward_points': user_row['reward_points'],
            'transactions': cursor.fetchall(),
            'total': total,
        })
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/orders', methods=['GET'])
@role_required('trainee', 'dietitian')
def get_orders():
    page, page_size, offset = parse_page_params(default_size=10, max_size=50)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS total FROM orders WHERE user_id = %s AND deleted_at IS NULL",
            (request.user_id,)
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            "SELECT * FROM orders WHERE user_id = %s AND deleted_at IS NULL "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (request.user_id, page_size, offset)
        )
        orders = cursor.fetchall()
        for order in orders:
            cursor.execute(
                "SELECT oi.*, p.name AS product_name FROM order_items oi "
                "JOIN products p ON oi.product_id = p.id WHERE oi.order_id = %s",
                (order['id'],),
            )
            order['items'] = cursor.fetchall()
        return paginated_response(orders, total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/orders/<int:order_id>', methods=['DELETE'])
@role_required('trainee', 'dietitian')
def cancel_order(order_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM orders WHERE id = %s AND user_id = %s AND deleted_at IS NULL",
            (order_id, request.user_id),
        )
        order = cursor.fetchone()
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        if order['status'] not in ('pending',):
            return jsonify({'error': f"Cannot cancel an order that is '{order['status']}'"}), 400

        # Restore stock only for COD orders (digital payments never decremented stock)
        if order['payment_method'] == 'cod':
            cursor.execute(
                "SELECT product_id, quantity FROM order_items WHERE order_id = %s",
                (order_id,),
            )
            for item in cursor.fetchall():
                cursor.execute(
                    "UPDATE products SET stock_quantity = stock_quantity + %s WHERE id = %s",
                    (item['quantity'], item['product_id']),
                )

        cursor.execute(
            "UPDATE orders SET status = 'cancelled', deleted_at = NOW() WHERE id = %s",
            (order_id,),
        )
        conn.commit()
        return jsonify({'message': 'Order cancelled'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Product Requests ──────────────────────────────────────────────────────────

@user_bp.route('/product-requests', methods=['POST'])
@role_required('trainee')
def request_product():
    try:
        body = RequestProductSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO product_requests (user_id, product_name, description, reason, image_url) VALUES (%s,%s,%s,%s,%s)",
            (request.user_id, body.product_name, body.description, body.reason, body.image_url),
        )
        req_id = cursor.lastrowid
        push_to_admins(cursor, 'product_request',
                       'New Product Request',
                       f"A user requested '{body.product_name}'.",
                       req_id)
        conn.commit()
        return jsonify({'id': req_id, 'message': 'Request submitted'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/product-requests', methods=['GET'])
@role_required('trainee')
def get_product_requests():
    page, page_size, offset = parse_page_params(default_size=10, max_size=50)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS total FROM product_requests WHERE user_id = %s AND deleted_at IS NULL",
            (request.user_id,)
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            "SELECT * FROM product_requests WHERE user_id = %s AND deleted_at IS NULL "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (request.user_id, page_size, offset)
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


# ── Trainer selection ────────────────────────────────────────────────────────

@user_bp.route('/trainers', methods=['GET'])
@role_required('trainee')
def list_trainers():
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    search = request.args.get('search', '').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        search_clause = ""
        search_params = []
        if search:
            search_clause = " AND u.name LIKE %s"
            search_params = [f"%{search}%"]

        base_where = (
            "WHERE u.role = 'dietitian' AND u.status = 'active' AND u.is_verified = 1 "
            "AND u.deleted_at IS NULL "
            "AND NOT EXISTS ("
            "  SELECT 1 FROM trainer_assignments ta2 WHERE ta2.trainer_id = u.id "
            "  AND ta2.customer_id = %s AND ta2.status = 'approved' AND ta2.deleted_at IS NULL"
            ")" + search_clause
        )

        cursor.execute(
            f"SELECT COUNT(*) AS total FROM users u {base_where}",
            [request.user_id] + search_params,
        )
        total = cursor.fetchone()['total']

        cursor.execute(
            f"SELECT u.id, u.name, u.email, u.profile_image_url, "
            f"(SELECT COUNT(*) FROM trainer_assignments ta WHERE ta.trainer_id = u.id "
            f" AND ta.status = 'approved' AND ta.deleted_at IS NULL) AS customer_count, "
            f"(SELECT ta.id FROM trainer_assignments ta WHERE ta.trainer_id = u.id "
            f" AND ta.customer_id = %s AND ta.status IN ('pending_trainer','pending_admin') "
            f" AND ta.deleted_at IS NULL ORDER BY ta.created_at DESC LIMIT 1) AS my_pending_assignment_id, "
            f"(SELECT ta.status FROM trainer_assignments ta WHERE ta.trainer_id = u.id "
            f" AND ta.customer_id = %s AND ta.status IN ('pending_trainer','pending_admin') "
            f" AND ta.deleted_at IS NULL ORDER BY ta.created_at DESC LIMIT 1) AS my_pending_status "
            f"FROM users u {base_where} ORDER BY u.name LIMIT %s OFFSET %s",
            [request.user_id, request.user_id, request.user_id] + search_params + [page_size, offset],
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainers/<int:trainer_id>', methods=['GET'])
@role_required('trainee')
def get_trainer(trainer_id):
    import json as _json
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT
                u.id,
                u.name,
                u.email,
                u.profile_image_url,
                up.bio,
                up.specialization,
                up.experience_years,
                up.available_time,
                up.phone_number,
                up.city,
                up.country,
                up.date_of_birth,
                (
                    SELECT COUNT(*)
                    FROM trainer_assignments ta
                    WHERE ta.trainer_id = u.id
                    AND ta.status = 'approved'
                    AND ta.deleted_at IS NULL
                ) AS customer_count,
                COALESCE(
                    (
                        SELECT ROUND(AVG(r.rating), 1)
                        FROM trainer_reviews r
                        WHERE r.trainer_id = u.id
                    ),
                    0
                ) AS avg_rating,
                (
                    SELECT COUNT(*)
                    FROM trainer_reviews r
                    WHERE r.trainer_id = u.id
                ) AS review_count
            FROM users u
            LEFT JOIN user_profiles up ON up.user_id = u.id
            WHERE u.id = %s
            AND u.role = 'dietitian'
            AND u.status = 'active'
            AND u.is_verified = 1
            AND u.deleted_at IS NULL
            """,
            (trainer_id,),
        )
        trainer = cursor.fetchone()
        if not trainer:
            return jsonify({'error': 'Trainer not found'}), 404
        # Parse available_time JSON
        if isinstance(trainer.get('available_time'), str):
            try:
                trainer['available_time'] = _json.loads(trainer['available_time'])
            except (ValueError, TypeError):
                trainer['available_time'] = []
        elif trainer.get('available_time') is None:
            trainer['available_time'] = []
        # Fetch certifications
        cursor.execute(
            "SELECT id, name, issued_by, issued_date, file_url, file_type "
            "FROM trainer_certifications WHERE user_id = %s ORDER BY created_at",
            (trainer_id,),
        )
        certs = cursor.fetchall()
        for c in certs:
            if hasattr(c.get('issued_date'), 'isoformat'):
                c['issued_date'] = c['issued_date'].isoformat()
        trainer['certifications'] = certs
        return jsonify(trainer)
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainer-assignments', methods=['GET'])
@role_required('trainee')
def get_trainer_assignments():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT ta.*, u.name AS trainer_name, u.email AS trainer_email "
            "FROM trainer_assignments ta "
            "JOIN users u ON ta.trainer_id = u.id "
            "WHERE ta.customer_id = %s AND ta.deleted_at IS NULL "
            "ORDER BY ta.created_at DESC",
            (request.user_id,),
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainer-assignments', methods=['POST'])
@role_required('trainee')
def request_trainer():
    try:
        body = RequestTrainerSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, status FROM trainer_assignments "
            "WHERE customer_id = %s AND trainer_id = %s AND status != 'rejected' AND deleted_at IS NULL LIMIT 1",
            (request.user_id, body.trainer_id),
        )
        existing = cursor.fetchone()
        if existing:
            return jsonify({'error': f"You already have a request with this trainer (status: {existing['status']})"}), 409

        cursor.execute(
            "SELECT id FROM users WHERE id = %s AND role = 'dietitian' AND status = 'active' AND is_verified = 1 AND deleted_at IS NULL",
            (body.trainer_id,),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Trainer not found'}), 404

        cursor.execute(
            "INSERT INTO trainer_assignments (customer_id, trainer_id, customer_note) VALUES (%s,%s,%s)",
            (request.user_id, body.trainer_id, body.customer_note),
        )
        assignment_id = cursor.lastrowid
        cursor.execute("SELECT name FROM users WHERE id = %s", (request.user_id,))
        requester = cursor.fetchone()
        requester_name = requester['name'] if requester else 'A user'
        push(cursor, body.trainer_id, 'trainer_request',
             'New Client Request',
             f"{requester_name} has requested you as their trainer.",
             assignment_id)
        push_to_admins(cursor, 'trainer_request',
                       'New Trainer Request',
                       f"{requester_name} has sent a trainer assignment request.",
                       assignment_id)
        conn.commit()
        return jsonify({'id': assignment_id, 'message': 'Request sent to trainer'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainer-assignments/<int:assignment_id>', methods=['DELETE'])
@role_required('trainee')
def cancel_trainer_assignment(assignment_id):
    """Cancel a pending_trainer request (before trainer reviews it)."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, status FROM trainer_assignments "
            "WHERE id = %s AND customer_id = %s AND status = 'pending_trainer' AND deleted_at IS NULL",
            (assignment_id, request.user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'No cancellable request found'}), 404
        cursor.execute(
            "UPDATE trainer_assignments SET deleted_at = NOW() WHERE id = %s", (row['id'],)
        )
        conn.commit()
        return jsonify({'message': 'Request cancelled'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Reviews ───────────────────────────────────────────────────────────────────

@user_bp.route('/products/<int:product_id>/reviews', methods=['POST'])
@role_required('trainee')
def submit_product_review(product_id):
    try:
        body = ReviewSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT 1 FROM order_items oi JOIN orders o ON oi.order_id = o.id "
            "WHERE o.user_id = %s AND oi.product_id = %s AND o.status != 'cancelled' AND o.deleted_at IS NULL LIMIT 1",
            (request.user_id, product_id),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'You can only review products you have ordered'}), 403

        cursor.execute(
            "INSERT INTO product_reviews (user_id, product_id, rating, comment) VALUES (%s,%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = NOW()",
            (request.user_id, product_id, body.rating, body.comment),
        )
        conn.commit()

        cursor.execute(
            "SELECT r.id, r.user_id, u.name AS user_name, r.rating, r.comment, r.created_at "
            "FROM product_reviews r JOIN users u ON r.user_id = u.id "
            "WHERE r.user_id = %s AND r.product_id = %s",
            (request.user_id, product_id),
        )
        return jsonify(cursor.fetchone()), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/products/<int:product_id>/reviews', methods=['DELETE'])
@role_required('trainee')
def delete_product_review(product_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM product_reviews WHERE user_id = %s AND product_id = %s",
            (request.user_id, product_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Review not found'}), 404
        return jsonify({'message': 'Review deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainers/<int:trainer_id>/reviews', methods=['GET'])
@role_required('trainee')
def list_trainer_reviews(trainer_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT r.id, r.user_id, u.name AS user_name, r.rating, r.comment, r.created_at "
            "FROM trainer_reviews r JOIN users u ON r.user_id = u.id "
            "WHERE r.trainer_id = %s ORDER BY r.created_at DESC",
            (trainer_id,),
        )
        reviews = cursor.fetchall()
        avg = sum(r['rating'] for r in reviews) / len(reviews) if reviews else 0
        return jsonify({'reviews': reviews, 'avg_rating': round(avg, 1), 'count': len(reviews)})
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainers/<int:trainer_id>/reviews', methods=['POST'])
@role_required('trainee')
def submit_trainer_review(trainer_id):
    try:
        body = ReviewSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT 1 FROM trainer_assignments "
            "WHERE customer_id = %s AND trainer_id = %s AND status = 'approved' AND deleted_at IS NULL LIMIT 1",
            (request.user_id, trainer_id),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'You can only review trainers you are assigned to'}), 403

        cursor.execute(
            "INSERT INTO trainer_reviews (user_id, trainer_id, rating, comment) VALUES (%s,%s,%s,%s) "
            "ON DUPLICATE KEY UPDATE rating = VALUES(rating), comment = VALUES(comment), updated_at = NOW()",
            (request.user_id, trainer_id, body.rating, body.comment),
        )
        conn.commit()

        cursor.execute(
            "SELECT r.id, r.user_id, u.name AS user_name, r.rating, r.comment, r.created_at "
            "FROM trainer_reviews r JOIN users u ON r.user_id = u.id "
            "WHERE r.user_id = %s AND r.trainer_id = %s",
            (request.user_id, trainer_id),
        )
        return jsonify(cursor.fetchone()), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainers/<int:trainer_id>/reviews', methods=['DELETE'])
@role_required('trainee')
def delete_trainer_review(trainer_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM trainer_reviews WHERE user_id = %s AND trainer_id = %s",
            (request.user_id, trainer_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Review not found'}), 404
        return jsonify({'message': 'Review deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Profile ───────────────────────────────────────────────────────────────────

@user_bp.route('/profile', methods=['GET'])
@role_required('trainee')
def get_profile():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, p.age, p.weight_kg, p.height_cm, "
            "p.gender, p.goal, p.activity_level "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id WHERE u.id = %s",
            (request.user_id,),
        )
        return jsonify(cursor.fetchone())
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/profile', methods=['PUT'])
@role_required('trainee')
def update_profile():
    try:
        body = UpdateProfileSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [request.user_id]

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE user_profiles SET {set_clause} WHERE user_id = %s", values)
        conn.commit()
        return jsonify({'message': 'Profile updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Subscription ──────────────────────────────────────────────────────────────

@user_bp.route('/subscription', methods=['GET'])
@role_required('trainee')
def get_subscription():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT subscription_plan, subscription_status FROM users WHERE id = %s",
            (request.user_id,),
        )
        row = cursor.fetchone()
        return jsonify(row or {'subscription_plan': 'free', 'subscription_status': 'active'})
    finally:
        cursor.close()
        conn.close()


SUBSCRIPTION_PRICE_NPR = 200  # Rs 200 per month for Pro

@user_bp.route('/subscription', methods=['PUT'])
@role_required('trainee')
def update_subscription():
    body = request.get_json() or {}
    plan   = body.get('plan', '').strip()
    method = body.get('method', 'cash').strip()  # 'cash', 'esewa', or 'stripe'

    if plan not in ('free', 'pro'):
        return jsonify({'error': 'plan must be free or pro'}), 400
    if plan == 'pro' and method not in ('cash', 'esewa', 'stripe'):
        return jsonify({'error': 'method must be cash, esewa, or stripe'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT subscription_plan, subscription_status FROM users WHERE id = %s",
            (request.user_id,),
        )
        current = cursor.fetchone()

        if plan == 'free':
            cursor.execute(
                "UPDATE users SET subscription_plan='free', subscription_status='active', "
                "subscription_payment_method=NULL WHERE id = %s",
                (request.user_id,),
            )
            conn.commit()
            return jsonify({'subscription_plan': 'free', 'subscription_status': 'active'})

        if current and current['subscription_plan'] == 'pro' and current['subscription_status'] == 'active':
            return jsonify({'error': 'Already on Pro plan'}), 400

        if method == 'cash':
            cursor.execute(
                "UPDATE users SET subscription_plan='pro', subscription_status='pending', "
                "subscription_payment_method='cash' WHERE id = %s",
                (request.user_id,),
            )
            push_to_admins(cursor, 'subscription_request',
                           'New Pro Subscription Request',
                           'A user has requested a Pro plan upgrade (cash payment). Please verify and approve.',
                           request.user_id)
            conn.commit()
            return jsonify({'subscription_plan': 'pro', 'subscription_status': 'pending', 'payment_method': 'cash'})

        if method == 'esewa':
            # eSewa — build payment form, don't update plan yet (update on verify)
            amount_str       = f"{SUBSCRIPTION_PRICE_NPR}.00"
            transaction_uuid = f"sub-{request.user_id}-{int(time.time() * 1000)}"
            message = f"total_amount={amount_str},transaction_uuid={transaction_uuid},product_code={ESEWA_PRODUCT_CODE}"
            sig = base64.b64encode(
                hmac.new(ESEWA_SECRET.encode(), message.encode(), hashlib.sha256).digest()
            ).decode()

            esewa_params = {
                'amount':                   amount_str,
                'tax_amount':               '0',
                'total_amount':             amount_str,
                'transaction_uuid':         transaction_uuid,
                'product_code':             ESEWA_PRODUCT_CODE,
                'product_service_charge':   '0',
                'product_delivery_charge':  '0',
                'success_url': f"{FRONTEND_URL}/payment/subscription/esewa/success",
                'failure_url': f"{FRONTEND_URL}/payment/subscription/esewa/failure",
                'signed_field_names': 'total_amount,transaction_uuid,product_code',
                'signature': sig,
            }
            return jsonify({
                'payment_method': 'esewa',
                'esewa_url':    ESEWA_URL,
                'esewa_params': esewa_params,
            })

        # Stripe — initiate payment, don't update plan yet (update on verify)
        if not STRIPE_SECRET_KEY:
            return jsonify({
                'error': 'Stripe is not configured. Set STRIPE_SECRET_KEY in backend/.env '
                         '(get a test secret key from https://dashboard.stripe.com/test/apikeys).',
            }), 503

        usd_amount, usd_cents, fx_rate = npr_to_usd_cents(SUBSCRIPTION_PRICE_NPR)
        if usd_cents < STRIPE_MIN_USD_CENTS:
            return jsonify({'error': 'Subscription price is too small to charge via Stripe.'}), 400

        transaction_uuid = f"sub-{request.user_id}-{int(time.time() * 1000)}"
        try:
            session = stripe.checkout.Session.create(
                mode='payment',
                payment_method_types=['card'],
                line_items=[{
                    'price_data': {
                        'currency': STRIPE_CURRENCY,
                        'product_data': {'name': f'SmartDiet Pro Subscription (Rs. {SUBSCRIPTION_PRICE_NPR})'},
                        'unit_amount': usd_cents,
                    },
                    'quantity': 1,
                }],
                success_url=f"{FRONTEND_URL}/payment/subscription/stripe/return?session_id={{CHECKOUT_SESSION_ID}}",
                cancel_url=f"{FRONTEND_URL}/payment/subscription/stripe/cancel",
                metadata={'user_id': str(request.user_id)},
                client_reference_id=transaction_uuid,
            )
        except Exception as e:
            return jsonify({'error': f'Stripe error: {e}'}), 502

        return jsonify({
            'payment_method': 'stripe',
            'stripe_url': session.url,
            'session_id': session.id,
            'usd_amount': usd_amount,
            'fx_rate': fx_rate,
        })

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Become a trainer ─────────────────────────────────────────────────────────

@user_bp.route('/become-trainer', methods=['POST'])
@role_required('trainee')
def become_trainer():
    try:
        body = BecomeTrainerSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    if not body.experience_years:
        return jsonify({'error': 'Experience years is required'}), 422
    if not body.available_time:
        return jsonify({'error': 'At least one availability slot is required'}), 422
    if not body.certifications:
        return jsonify({'error': 'At least one certification is required'}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT full_name FROM user_profiles WHERE user_id = %s", (request.user_id,),
        )
        row = cursor.fetchone()
        if not row or not row['full_name']:
            return jsonify({'error': 'Complete your profile before requesting to become a trainer'}), 400

        updates = body.model_dump(exclude={'certifications'}, exclude_unset=True)
        user_fields    = {k: v for k, v in updates.items() if k in ('name', 'profile_image_url')}
        profile_fields = {k: v for k, v in updates.items() if k not in ('name',)}
        if 'available_time' in profile_fields:
            profile_fields['available_time'] = json.dumps(profile_fields['available_time'])

        if user_fields:
            set_clause = ', '.join(f"{k} = %s" for k in user_fields)
            cursor.execute(
                f"UPDATE users SET {set_clause} WHERE id = %s",
                list(user_fields.values()) + [request.user_id],
            )
        if profile_fields:
            set_clause = ', '.join(f"{k} = %s" for k in profile_fields)
            cursor.execute(
                f"UPDATE user_profiles SET {set_clause} WHERE user_id = %s",
                list(profile_fields.values()) + [request.user_id],
            )

        for cert in body.certifications:
            cursor.execute(
                "INSERT INTO trainer_certifications (user_id, name, issued_by, issued_date, file_url, file_type) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (request.user_id, cert.name, cert.issued_by or None,
                 cert.issued_date or None, cert.file_url or None, cert.file_type),
            )

        cursor.execute(
            "UPDATE users SET role='dietitian', is_verified=0 WHERE id = %s",
            (request.user_id,),
        )

        cursor.execute("SELECT name, email FROM users WHERE id = %s", (request.user_id,))
        user = cursor.fetchone()
        push_to_admins(cursor, 'trainer_signup_request',
                       'New Trainer Request',
                       f"{user['name']} has requested to become a trainer. Please review and verify.",
                       request.user_id)
        conn.commit()

        token = generate_token(request.user_id, 'dietitian')
        return jsonify({
            'token': token,
            'user': {'id': request.user_id, 'name': user['name'], 'email': user['email'], 'role': 'dietitian'},
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
