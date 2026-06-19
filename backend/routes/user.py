from flask import Blueprint, request, jsonify
from database.connection import get_connection
from middleware.auth import role_required

user_bp = Blueprint('user', __name__)


# ── Exercise Logs ─────────────────────────────────────────────────────────────

@user_bp.route('/exercise-logs', methods=['GET'])
@role_required('user')
def get_exercise_logs():
    date = request.args.get('date')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if date:
            cursor.execute(
                "SELECT el.*, e.name AS exercise_name, e.category, e.calories_burned_per_hour "
                "FROM exercise_logs el JOIN exercises e ON el.exercise_id = e.id "
                "WHERE el.user_id = %s AND el.logged_date = %s ORDER BY el.logged_at",
                (request.user_id, date),
            )
        else:
            cursor.execute(
                "SELECT el.*, e.name AS exercise_name, e.category, e.calories_burned_per_hour "
                "FROM exercise_logs el JOIN exercises e ON el.exercise_id = e.id "
                "WHERE el.user_id = %s ORDER BY el.logged_date DESC LIMIT 50",
                (request.user_id,),
            )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/exercise-logs', methods=['POST'])
@role_required('user')
def log_exercise():
    data = request.get_json() or {}
    if not all([data.get('exercise_id'), data.get('logged_date'), data.get('duration_minutes')]):
        return jsonify({'error': 'exercise_id, logged_date and duration_minutes are required'}), 400

    duration = int(data['duration_minutes'])
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT calories_burned_per_hour FROM exercises WHERE id = %s", (data['exercise_id'],))
        ex = cursor.fetchone()
        if not ex:
            return jsonify({'error': 'Exercise not found'}), 404

        calories_burned = int(ex['calories_burned_per_hour'] * duration / 60)

        cursor.execute(
            "INSERT INTO exercise_logs (user_id, exercise_id, logged_date, duration_minutes, calories_burned, notes) "
            "VALUES (%s,%s,%s,%s,%s,%s)",
            (request.user_id, data['exercise_id'], data['logged_date'], duration, calories_burned, data.get('notes')),
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
        cursor.execute("DELETE FROM exercise_logs WHERE id = %s AND user_id = %s", (log_id, request.user_id))
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
        cursor.execute("SELECT id, name, category, calories_burned_per_hour FROM exercises ORDER BY category, name")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


# ── Dashboard ─────────────────────────────────────────────────────────────────

@user_bp.route('/dashboard', methods=['GET'])
@role_required('user')
def dashboard():
    today = request.args.get('date')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if not today:
            import datetime
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

        return jsonify({
            'date': today,
            'calories_out': int(calories_out),
            'exercise_mins_this_week': int(exercise_mins),
            'orders_count': int(orders_count),
            'pending_requests': int(pending_requests),
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
            "c.slug AS category, c.name AS category_name, c.icon AS category_icon, p.image_url "
            "FROM products p JOIN categories c ON p.category_id = c.id "
            "WHERE p.status = 'active' "
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
    data = request.get_json() or {}
    items = data.get('items', [])
    if not items:
        return jsonify({'error': 'Order must contain at least one item'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        total = 0.0
        resolved = []
        for item in items:
            cursor.execute(
                "SELECT id, name, price, stock_quantity FROM products WHERE id=%s AND status='active'",
                (item['product_id'],),
            )
            product = cursor.fetchone()
            if not product:
                return jsonify({'error': f"Product {item['product_id']} not found"}), 404
            qty = int(item.get('quantity', 1))
            if product['stock_quantity'] < qty:
                return jsonify({'error': f"Insufficient stock for '{product['name']}'"}), 400
            total += float(product['price']) * qty
            resolved.append({'product': product, 'quantity': qty})

        cursor.execute(
            "INSERT INTO orders (user_id, total_amount, shipping_address) VALUES (%s,%s,%s)",
            (request.user_id, round(total, 2), data.get('shipping_address')),
        )
        order_id = cursor.lastrowid

        for r in resolved:
            cursor.execute(
                "INSERT INTO order_items (order_id, product_id, quantity, price_at_purchase) VALUES (%s,%s,%s,%s)",
                (order_id, r['product']['id'], r['quantity'], r['product']['price']),
            )
            cursor.execute(
                "UPDATE products SET stock_quantity = stock_quantity - %s WHERE id = %s",
                (r['quantity'], r['product']['id']),
            )

        conn.commit()
        return jsonify({'id': order_id, 'total_amount': round(total, 2), 'message': 'Order placed'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/orders', methods=['GET'])
@role_required('user')
def get_orders():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM orders WHERE user_id = %s ORDER BY created_at DESC",
            (request.user_id,),
        )
        orders = cursor.fetchall()
        for order in orders:
            cursor.execute(
                "SELECT oi.*, p.name AS product_name FROM order_items oi "
                "JOIN products p ON oi.product_id = p.id WHERE oi.order_id = %s",
                (order['id'],),
            )
            order['items'] = cursor.fetchall()
        return jsonify(orders)
    finally:
        cursor.close()
        conn.close()


# ── Product Requests ──────────────────────────────────────────────────────────

@user_bp.route('/product-requests', methods=['POST'])
@role_required('user')
def request_product():
    data = request.get_json() or {}
    if not data.get('product_name', '').strip():
        return jsonify({'error': 'product_name is required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO product_requests (user_id, product_name, description, reason) VALUES (%s,%s,%s,%s)",
            (request.user_id, data['product_name'].strip(), data.get('description'), data.get('reason')),
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
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM product_requests WHERE user_id = %s ORDER BY created_at DESC",
            (request.user_id,),
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


# ── Trainer selection ────────────────────────────────────────────────────────

@user_bp.route('/trainers', methods=['GET'])
@role_required('user')
def list_trainers():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, "
            "(SELECT COUNT(*) FROM trainer_assignments ta "
            " WHERE ta.trainer_id = u.id AND ta.status = 'approved') AS customer_count "
            "FROM users u WHERE u.role = 'dietitian' AND u.is_active = TRUE ORDER BY u.name"
        )
        return jsonify(cursor.fetchall())
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
            "WHERE ta.customer_id = %s "
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
    data = request.get_json() or {}
    trainer_id = data.get('trainer_id')
    if not trainer_id:
        return jsonify({'error': 'trainer_id is required'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Block if an active (non-rejected) assignment already exists
        cursor.execute(
            "SELECT id, status FROM trainer_assignments "
            "WHERE customer_id = %s AND status != 'rejected' LIMIT 1",
            (request.user_id,),
        )
        existing = cursor.fetchone()
        if existing:
            return jsonify({'error': f"You already have an active assignment (status: {existing['status']})"}), 409

        # Verify trainer exists and is active
        cursor.execute(
            "SELECT id FROM users WHERE id = %s AND role = 'dietitian' AND is_active = TRUE",
            (trainer_id,),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Trainer not found'}), 404

        cursor.execute(
            "INSERT INTO trainer_assignments (customer_id, trainer_id, customer_note) VALUES (%s,%s,%s)",
            (request.user_id, trainer_id, data.get('customer_note')),
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
            "WHERE customer_id = %s AND status = 'pending_trainer' LIMIT 1",
            (request.user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'No cancellable request found'}), 404
        cursor.execute("DELETE FROM trainer_assignments WHERE id = %s", (row['id'],))
        conn.commit()
        return jsonify({'message': 'Request cancelled'})
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
    data = request.get_json() or {}
    allowed = ['age', 'weight_kg', 'height_cm', 'gender', 'goal', 'activity_level']
    updates = {k: data[k] for k in allowed if k in data}
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
