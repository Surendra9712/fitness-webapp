from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field, ValidationError, field_validator
from pydantic import ConfigDict
from typing import Optional
import base64
import datetime
import hashlib
import hmac
import os
import time
import requests as http_req
from database.connection import get_connection
from middleware.auth import role_required
from utils.validation import pydantic_errors
from utils.pagination import parse_page_params, paginated_response

ESEWA_SECRET       = os.getenv('ESEWA_SECRET_KEY', '8gBm/:&EnhH.1/q')
ESEWA_PRODUCT_CODE = os.getenv('ESEWA_PRODUCT_CODE', 'EPAYTEST')
ESEWA_URL          = os.getenv('ESEWA_URL', 'https://rc-epay.esewa.com.np/api/epay/main/v2/form')
KHALTI_SECRET      = os.getenv('KHALTI_SECRET_KEY', 'test_secret_key_dc74e0fd57cb46cd93832aee0a390234')
KHALTI_INITIATE_URL = os.getenv('KHALTI_INITIATE_URL', 'https://a.khalti.com/api/v2/epayment/initiate/')
FRONTEND_URL       = os.getenv('FRONTEND_URL', 'http://localhost:5173')

user_bp = Blueprint('user', __name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class LogExerciseSchema(BaseModel):
    exercise_id: int
    logged_date: str = Field(min_length=1)
    duration_minutes: int = Field(gt=0)
    notes: Optional[str] = None


class OrderItemSchema(BaseModel):
    product_id: int
    quantity: int = Field(default=1, ge=1)


class PlaceOrderSchema(BaseModel):
    items: list[OrderItemSchema] = Field(min_length=1)
    shipping_address: Optional[str] = None
    payment_method: str = 'cod'

    @field_validator('payment_method')
    @classmethod
    def validate_payment_method(cls, v: str) -> str:
        if v not in ('cod', 'esewa', 'khalti'):
            raise ValueError('payment_method must be cod, esewa, or khalti')
        return v


class RequestProductSchema(BaseModel):
    product_name: str = Field(min_length=1)
    description: Optional[str] = None
    reason: Optional[str] = None

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


# ── Exercise Logs ─────────────────────────────────────────────────────────────

@user_bp.route('/exercise-logs', methods=['GET'])
@role_required('user')
def get_exercise_logs():
    date = request.args.get('date')
    page, page_size, offset = parse_page_params(default_size=10, max_size=50)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if date:
            cursor.execute(
                "SELECT COUNT(*) AS total FROM exercise_logs el "
                "WHERE el.user_id = %s AND el.logged_date = %s AND el.deleted_at IS NULL",
                (request.user_id, date)
            )
            total = cursor.fetchone()['total']
            cursor.execute(
                "SELECT el.*, e.name AS exercise_name, e.category, e.calories_burned_per_hour "
                "FROM exercise_logs el JOIN exercises e ON el.exercise_id = e.id "
                "WHERE el.user_id = %s AND el.logged_date = %s AND el.deleted_at IS NULL "
                "ORDER BY el.logged_at LIMIT %s OFFSET %s",
                (request.user_id, date, page_size, offset),
            )
        else:
            cursor.execute(
                "SELECT COUNT(*) AS total FROM exercise_logs el "
                "WHERE el.user_id = %s AND el.deleted_at IS NULL",
                (request.user_id,)
            )
            total = cursor.fetchone()['total']
            cursor.execute(
                "SELECT el.*, e.name AS exercise_name, e.category, e.calories_burned_per_hour "
                "FROM exercise_logs el JOIN exercises e ON el.exercise_id = e.id "
                "WHERE el.user_id = %s AND el.deleted_at IS NULL "
                "ORDER BY el.logged_date DESC LIMIT %s OFFSET %s",
                (request.user_id, page_size, offset),
            )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/exercise-logs', methods=['POST'])
@role_required('user')
def log_exercise():
    try:
        body = LogExerciseSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT calories_burned_per_hour FROM exercises WHERE id = %s AND deleted_at IS NULL",
            (body.exercise_id,),
        )
        ex = cursor.fetchone()
        if not ex:
            return jsonify({'error': 'Exercise not found'}), 404

        calories_burned = int(ex['calories_burned_per_hour'] * body.duration_minutes / 60)

        cursor.execute(
            "INSERT INTO exercise_logs (user_id, exercise_id, logged_date, duration_minutes, calories_burned, notes) "
            "VALUES (%s,%s,%s,%s,%s,%s)",
            (request.user_id, body.exercise_id, body.logged_date,
             body.duration_minutes, calories_burned, body.notes),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'calories_burned': calories_burned, 'message': 'Exercise logged'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/exercise-logs/<int:log_id>', methods=['DELETE'])
@role_required('user')
def delete_exercise_log(log_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE exercise_logs SET deleted_at = NOW() WHERE id = %s AND user_id = %s",
            (log_id, request.user_id),
        )
        conn.commit()
        return jsonify({'message': 'Log deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Available Exercises ────────────────────────────────────────────────────────

@user_bp.route('/exercises', methods=['GET'])
@role_required('user')
def available_exercises():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, category, calories_burned_per_hour FROM exercises "
            "WHERE deleted_at IS NULL ORDER BY category, name"
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


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
@role_required('user')
def dashboard():
    today = request.args.get('date')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if not today:
            today = datetime.date.today().isoformat()

        cursor.execute(
            "SELECT COALESCE(SUM(calories_burned),0) AS calories_out "
            "FROM exercise_logs WHERE user_id = %s AND logged_date = %s",
            (request.user_id, today),
        )
        calories_out = cursor.fetchone()['calories_out']

        cursor.execute(
            "SELECT COALESCE(SUM(duration_minutes),0) AS exercise_mins "
            "FROM exercise_logs WHERE user_id = %s AND logged_date >= DATE_SUB(%s, INTERVAL 6 DAY)",
            (request.user_id, today),
        )
        exercise_mins = cursor.fetchone()['exercise_mins']

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
            'calories_out': int(calories_out),
            'exercise_mins_this_week': int(exercise_mins),
            'orders_count': int(orders_count),
            'pending_requests': int(pending_requests),
            'metrics': metrics,
        })
    finally:
        cursor.close()
        conn.close()


# ── Products (shop) ───────────────────────────────────────────────────────────

@user_bp.route('/products', methods=['GET'])
@role_required('user')
def list_products():
    category_slug = request.args.get('category', '').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base = (
            "SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
            "c.slug AS category, c.name AS category_name, p.image_url "
            "FROM products p JOIN categories c ON p.category_id = c.id "
            "WHERE p.status = 'active' AND p.deleted_at IS NULL AND c.deleted_at IS NULL "
        )
        if category_slug:
            cursor.execute(base + "AND c.slug = %s ORDER BY p.name", (category_slug,))
        else:
            cursor.execute(base + "ORDER BY c.name, p.name")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


# ── Orders ────────────────────────────────────────────────────────────────────

@user_bp.route('/orders', methods=['POST'])
@role_required('user')
def place_order():
    try:
        body = PlaceOrderSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Resolve products and compute total
        total = 0.0
        resolved = []
        for item in body.items:
            cursor.execute(
                "SELECT id, name, price, stock_quantity FROM products "
                "WHERE id = %s AND status = 'active' AND deleted_at IS NULL",
                (item.product_id,),
            )
            product = cursor.fetchone()
            if not product:
                return jsonify({'error': f"Product {item.product_id} not found"}), 404
            if product['stock_quantity'] < item.quantity:
                return jsonify({'error': f"Insufficient stock for '{product['name']}'"}), 400
            total += float(product['price']) * item.quantity
            resolved.append({'product': product, 'quantity': item.quantity})

        total = round(total, 2)

        # For COD confirm immediately; for digital payments mark payment_status pending
        payment_status = 'pending' if body.payment_method in ('esewa', 'khalti') else 'pending'

        cursor.execute(
            "INSERT INTO orders (user_id, total_amount, shipping_address, payment_method, payment_status) "
            "VALUES (%s, %s, %s, %s, %s)",
            (request.user_id, total, body.shipping_address, body.payment_method, payment_status),
        )
        order_id = cursor.lastrowid

        for r in resolved:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) "
                "VALUES (%s, %s, %s, %s)",
                (order_id, r['product']['id'], r['quantity'], r['product']['price']),
            )
            # Decrement stock only for COD; for digital payments deduct after verification
            if body.payment_method == 'cod':
                cursor.execute(
                    "UPDATE products SET stock_quantity = stock_quantity - %s WHERE id = %s",
                    (r['quantity'], r['product']['id']),
                )

        conn.commit()

        # ── COD: done ────────────────────────────────────────────────────────
        if body.payment_method == 'cod':
            return jsonify({'id': order_id, 'total_amount': total, 'payment_method': 'cod'}), 201

        transaction_uuid = f"order-{order_id}-{int(time.time() * 1000)}"

        # ── eSewa ────────────────────────────────────────────────────────────
        if body.payment_method == 'esewa':
            total_str = f"{total:.2f}"   # must be "500.00" not "500.0"
            message = f"total_amount={total_str},transaction_uuid={transaction_uuid},product_code={ESEWA_PRODUCT_CODE}"
            sig = base64.b64encode(
                hmac.new(ESEWA_SECRET.encode(), message.encode(), hashlib.sha256).digest()
            ).decode()

            esewa_params = {
                'amount': total_str,
                'tax_amount': '0',
                'total_amount': total_str,
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

        # ── Khalti ───────────────────────────────────────────────────────────
        if body.payment_method == 'khalti':
            cursor.execute("SELECT name, email FROM users WHERE id = %s", (request.user_id,))
            user = cursor.fetchone() or {}

            headers = {'Authorization': f'Key {KHALTI_SECRET}'}
            payload = {
                'return_url': f"{FRONTEND_URL}/payment/khalti/return",
                'website_url': FRONTEND_URL,
                'amount': int(total * 100),   # paisa
                'purchase_order_id': transaction_uuid,
                'purchase_order_name': f"SmartDiet Order #{order_id}",
                'customer_info': {
                    'name': user.get('name', ''),
                    'email': user.get('email', ''),
                },
            }
            try:
                resp = http_req.post(KHALTI_INITIATE_URL, json=payload, headers=headers, timeout=10)
                resp.raise_for_status()
            except http_req.RequestException as e:
                # Roll back the order if Khalti initiation fails
                cursor.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
                cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
                conn.commit()
                return jsonify({'error': f'Khalti initiation failed: {str(e)}'}), 502

            khalti_data = resp.json()
            return jsonify({
                'id': order_id,
                'payment_method': 'khalti',
                'payment_url': khalti_data.get('payment_url'),
                'pidx': khalti_data.get('pidx'),
            }), 201

    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/orders', methods=['GET'])
@role_required('user')
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
@role_required('user')
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
@role_required('user')
def request_product():
    try:
        body = RequestProductSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO product_requests (user_id, product_name, description, reason) VALUES (%s,%s,%s,%s)",
            (request.user_id, body.product_name, body.description, body.reason),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Request submitted'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/product-requests', methods=['GET'])
@role_required('user')
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
@role_required('user')
def list_trainers():
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    search = request.args.get('search', '').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_where = "WHERE u.role = 'dietitian' AND u.is_active = TRUE AND u.deleted_at IS NULL"
        params = []
        if search:
            base_where += " AND u.name LIKE %s"
            params.append(f"%{search}%")
        cursor.execute(f"SELECT COUNT(*) AS total FROM users u {base_where}", params)
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT u.id, u.name, u.email, "
            f"(SELECT COUNT(*) FROM trainer_assignments ta "
            f" WHERE ta.trainer_id = u.id AND ta.status = 'approved' AND ta.deleted_at IS NULL) AS customer_count "
            f"FROM users u {base_where} ORDER BY u.name LIMIT %s OFFSET %s",
            params + [page_size, offset]
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainers/<int:trainer_id>', methods=['GET'])
@role_required('user')
def get_trainer(trainer_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, "
            "(SELECT COUNT(*) FROM trainer_assignments ta "
            " WHERE ta.trainer_id = u.id AND ta.status = 'approved' AND ta.deleted_at IS NULL) AS customer_count, "
            "COALESCE((SELECT ROUND(AVG(r.rating), 1) FROM trainer_reviews r WHERE r.trainer_id = u.id), 0) AS avg_rating, "
            "(SELECT COUNT(*) FROM trainer_reviews r WHERE r.trainer_id = u.id) AS review_count "
            "FROM users u WHERE u.id = %s AND u.role = 'dietitian' AND u.is_active = TRUE AND u.deleted_at IS NULL",
            (trainer_id,),
        )
        trainer = cursor.fetchone()
        if not trainer:
            return jsonify({'error': 'Trainer not found'}), 404
        return jsonify(trainer)
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainer-assignment', methods=['GET'])
@role_required('user')
def get_trainer_assignment():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT ta.*, u.name AS trainer_name, u.email AS trainer_email "
            "FROM trainer_assignments ta "
            "JOIN users u ON ta.trainer_id = u.id "
            "WHERE ta.customer_id = %s AND ta.deleted_at IS NULL "
            "ORDER BY ta.created_at DESC LIMIT 1",
            (request.user_id,),
        )
        return jsonify(cursor.fetchone())
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainer-assignment', methods=['POST'])
@role_required('user')
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
            "WHERE customer_id = %s AND status != 'rejected' AND deleted_at IS NULL LIMIT 1",
            (request.user_id,),
        )
        existing = cursor.fetchone()
        if existing:
            return jsonify({'error': f"You already have an active assignment (status: {existing['status']})"}), 409

        cursor.execute(
            "SELECT id FROM users WHERE id = %s AND role = 'dietitian' AND is_active = TRUE AND deleted_at IS NULL",
            (body.trainer_id,),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Trainer not found'}), 404

        cursor.execute(
            "INSERT INTO trainer_assignments (customer_id, trainer_id, customer_note) VALUES (%s,%s,%s)",
            (request.user_id, body.trainer_id, body.customer_note),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Request sent to trainer'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/trainer-assignment', methods=['DELETE'])
@role_required('user')
def cancel_trainer_assignment():
    """Cancel a pending_trainer request (before trainer reviews it)."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, status FROM trainer_assignments "
            "WHERE customer_id = %s AND status = 'pending_trainer' AND deleted_at IS NULL LIMIT 1",
            (request.user_id,),
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
@role_required('user')
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
@role_required('user')
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
@role_required('user')
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
@role_required('user')
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
@role_required('user')
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
@role_required('user')
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
@role_required('user')
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
