from flask import Blueprint, request, jsonify
import bcrypt
from database.connection import get_connection
from middleware.auth import role_required

admin_bp = Blueprint('admin', __name__)


# ── Categories ────────────────────────────────────────────────────────────────

@admin_bp.route('/categories', methods=['GET'])
@role_required('admin', 'dietitian', 'user')
def list_categories():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, slug, icon, description FROM categories ORDER BY id")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/categories', methods=['POST'])
@role_required('admin')
def create_category():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    slug = data.get('slug', '').strip().lower()
    if not name or not slug:
        return jsonify({'error': 'name and slug are required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO categories (name, slug, icon, description) VALUES (%s,%s,%s,%s)",
            (name, slug, data.get('icon'), data.get('description')),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Category created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/categories/<int:cid>', methods=['PUT'])
@role_required('admin')
def update_category(cid):
    data = request.get_json() or {}
    allowed = ['name', 'slug', 'icon', 'description']
    updates = {k: data[k] for k in allowed if k in data}
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [cid]
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE categories SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'Category updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/categories/<int:cid>', methods=['DELETE'])
@role_required('admin')
def delete_category(cid):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS cnt FROM products WHERE category_id = %s", (cid,))
        if cursor.fetchone()['cnt'] > 0:
            return jsonify({'error': 'Cannot delete category with existing products'}), 409
        cursor.execute("DELETE FROM categories WHERE id = %s", (cid,))
        conn.commit()
        return jsonify({'message': 'Category deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Users ────────────────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@role_required('admin')
def list_users():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, "
            "p.goal, p.weight_kg, p.height_cm "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            "ORDER BY u.created_at DESC"
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users', methods=['POST'])
@role_required('admin')
def create_user():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'user')

    if not all([name, email, password]):
        return jsonify({'error': 'name, email and password are required'}), 400
    if role not in ('admin', 'dietitian', 'user'):
        return jsonify({'error': 'Invalid role'}), 400

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'error': 'Email already registered'}), 409
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
            (name, email, password_hash, role),
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO user_profiles (user_id) VALUES (%s)", (user_id,))
        conn.commit()
        return jsonify({'id': user_id, 'name': name, 'email': email, 'role': role}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:uid>', methods=['PUT'])
@role_required('admin')
def update_user(uid):
    data = request.get_json() or {}
    allowed = ['name', 'role', 'is_active']
    updates = {k: data[k] for k in allowed if k in data}
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [uid]

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE users SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'User updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:uid>', methods=['DELETE'])
@role_required('admin')
def delete_user(uid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM users WHERE id = %s", (uid,))
        conn.commit()
        return jsonify({'message': 'User deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Exercises ────────────────────────────────────────────────────────────────

@admin_bp.route('/exercises', methods=['GET'])
@role_required('admin', 'dietitian', 'user')
def list_exercises():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM exercises ORDER BY category, name")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/exercises', methods=['POST'])
@role_required('admin')
def create_exercise():
    data = request.get_json() or {}
    if not data.get('name') or not data.get('category'):
        return jsonify({'error': 'name and category are required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO exercises (name, category, calories_burned_per_hour, description) VALUES (%s,%s,%s,%s)",
            (data['name'], data['category'], int(data.get('calories_burned_per_hour', 0)), data.get('description')),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Exercise created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/exercises/<int:eid>', methods=['DELETE'])
@role_required('admin')
def delete_exercise(eid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM exercises WHERE id = %s", (eid,))
        conn.commit()
        return jsonify({'message': 'Exercise deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Products ─────────────────────────────────────────────────────────────────

def _resolve_category_id(cursor, slug):
    """Look up category_id for a slug; raises ValueError if not found."""
    cursor.execute("SELECT id FROM categories WHERE slug = %s", (slug,))
    row = cursor.fetchone()
    if not row:
        raise ValueError(f"Unknown category: {slug}")
    return row['id']


PRODUCT_SELECT = (
    "SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
    "c.slug AS category, c.name AS category_name, c.icon AS category_icon, "
    "p.image_url, p.status, p.created_at, u.name AS created_by_name "
    "FROM products p "
    "JOIN categories c ON p.category_id = c.id "
    "LEFT JOIN users u ON p.created_by = u.id "
)


@admin_bp.route('/products', methods=['GET'])
@role_required('admin')
def list_products():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(PRODUCT_SELECT + "ORDER BY p.created_at DESC")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products', methods=['POST'])
@role_required('admin')
def create_product():
    data = request.get_json() or {}
    if not data.get('name') or data.get('price') is None:
        return jsonify({'error': 'name and price are required'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        category_id = _resolve_category_id(cursor, data.get('category', 'strength'))
        cursor.execute(
            "INSERT INTO products (name, description, price, stock_quantity, category_id, image_url, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (
                data['name'], data.get('description'), float(data['price']),
                int(data.get('stock_quantity', 0)), category_id,
                data.get('image_url'), data.get('status', 'active'), request.user_id,
            ),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Product created'}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products/<int:pid>', methods=['PUT'])
@role_required('admin')
def update_product(pid):
    data = request.get_json() or {}
    allowed = ['name', 'description', 'price', 'stock_quantity', 'image_url', 'status']
    updates = {k: data[k] for k in allowed if k in data}

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if 'category' in data:
            updates['category_id'] = _resolve_category_id(cursor, data['category'])

        if not updates:
            return jsonify({'error': 'No valid fields'}), 400

        set_clause = ', '.join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [pid]
        cursor.execute(f"UPDATE products SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'Product updated'})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products/<int:pid>', methods=['DELETE'])
@role_required('admin')
def delete_product(pid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM products WHERE id = %s", (pid,))
        conn.commit()
        return jsonify({'message': 'Product deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Product Requests ──────────────────────────────────────────────────────────

@admin_bp.route('/product-requests', methods=['GET'])
@role_required('admin')
def list_product_requests():
    status_filter = request.args.get('status', 'pending')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base = (
            "SELECT pr.*, u.name AS user_name, u.email AS user_email, "
            "r.name AS reviewed_by_name "
            "FROM product_requests pr JOIN users u ON pr.user_id = u.id "
            "LEFT JOIN users r ON pr.reviewed_by = r.id "
        )
        if status_filter == 'all':
            cursor.execute(base + "ORDER BY pr.created_at DESC")
        else:
            cursor.execute(base + "WHERE pr.status = %s ORDER BY pr.created_at DESC", (status_filter,))
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/product-requests/<int:rid>/approve', methods=['PUT'])
@role_required('admin')
def approve_product_request(rid):
    data = request.get_json() or {}
    if data.get('price') is None:
        return jsonify({'error': 'price is required to approve and list the product'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM product_requests WHERE id = %s", (rid,))
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found'}), 404
        if req['status'] != 'pending':
            return jsonify({'error': 'Request already reviewed'}), 400

        category_id = _resolve_category_id(cursor, data.get('category', 'strength'))

        cursor.execute(
            "INSERT INTO products (name, description, price, stock_quantity, category_id, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,'active',%s)",
            (
                req['product_name'], req['description'],
                float(data['price']), int(data.get('stock_quantity', 0)),
                category_id, request.user_id,
            ),
        )
        product_id = cursor.lastrowid

        cursor.execute(
            "UPDATE product_requests SET status='approved', admin_note=%s, "
            "reviewed_by=%s, reviewed_at=NOW() WHERE id = %s",
            (data.get('admin_note'), request.user_id, rid),
        )
        conn.commit()
        return jsonify({'message': 'Request approved and product added', 'product_id': product_id})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/product-requests/<int:rid>/reject', methods=['PUT'])
@role_required('admin')
def reject_product_request(rid):
    data = request.get_json() or {}
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, status FROM product_requests WHERE id = %s", (rid,))
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found'}), 404
        if req['status'] != 'pending':
            return jsonify({'error': 'Request already reviewed'}), 400

        cursor.execute(
            "UPDATE product_requests SET status='rejected', admin_note=%s, "
            "reviewed_by=%s, reviewed_at=NOW() WHERE id = %s",
            (data.get('admin_note'), request.user_id, rid),
        )
        conn.commit()
        return jsonify({'message': 'Request rejected'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Orders (admin view) ───────────────────────────────────────────────────────

@admin_bp.route('/orders', methods=['GET'])
@role_required('admin')
def list_all_orders():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT o.*, u.name AS user_name, u.email AS user_email "
            "FROM orders o JOIN users u ON o.user_id = u.id "
            "ORDER BY o.created_at DESC"
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


@admin_bp.route('/orders/<int:oid>/status', methods=['PUT'])
@role_required('admin')
def update_order_status(oid):
    data = request.get_json() or {}
    status = data.get('status')
    valid = ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')
    if status not in valid:
        return jsonify({'error': f'status must be one of: {", ".join(valid)}'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (status, oid))
        conn.commit()
        return jsonify({'message': 'Order status updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Trainer Assignments ───────────────────────────────────────────────────────

@admin_bp.route('/trainer-assignments', methods=['GET'])
@role_required('admin')
def list_trainer_assignments():
    status_filter = request.args.get('status', 'pending_admin')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base = (
            "SELECT ta.*, "
            "c.name AS customer_name, c.email AS customer_email, "
            "t.name AS trainer_name,  t.email AS trainer_email, "
            "a.name AS reviewed_by_name "
            "FROM trainer_assignments ta "
            "JOIN users c ON ta.customer_id = c.id "
            "JOIN users t ON ta.trainer_id  = t.id "
            "LEFT JOIN users a ON ta.reviewed_by_admin = a.id "
        )
        if status_filter == 'all':
            cursor.execute(base + "ORDER BY ta.created_at DESC")
        else:
            cursor.execute(base + "WHERE ta.status = %s ORDER BY ta.created_at DESC",
                           (status_filter,))
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/trainer-assignments/<int:aid>/approve', methods=['PUT'])
@role_required('admin')
def approve_trainer_assignment(aid):
    data = request.get_json() or {}
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM trainer_assignments WHERE id = %s", (aid,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assignment not found'}), 404
        if row['status'] != 'pending_admin':
            return jsonify({'error': 'Assignment is not pending admin review'}), 400

        cursor.execute(
            "UPDATE trainer_assignments SET status='approved', admin_note=%s, "
            "reviewed_by_admin=%s, admin_reviewed_at=NOW() WHERE id = %s",
            (data.get('admin_note'), request.user_id, aid),
        )
        conn.commit()
        return jsonify({'message': 'Trainer assignment approved'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/trainer-assignments/<int:aid>/reject', methods=['PUT'])
@role_required('admin')
def reject_trainer_assignment(aid):
    data = request.get_json() or {}
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM trainer_assignments WHERE id = %s", (aid,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assignment not found'}), 404
        if row['status'] not in ('pending_admin', 'pending_trainer'):
            return jsonify({'error': 'Assignment cannot be rejected at this stage'}), 400

        cursor.execute(
            "UPDATE trainer_assignments SET status='rejected', admin_note=%s, "
            "reviewed_by_admin=%s, admin_reviewed_at=NOW() WHERE id = %s",
            (data.get('admin_note'), request.user_id, aid),
        )
        conn.commit()
        return jsonify({'message': 'Trainer assignment rejected'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Dashboard stats ──────────────────────────────────────────────────────────

@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
def stats():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='user'")
        users_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='dietitian'")
        dietitians_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM products WHERE status='active'")
        products_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM orders")
        orders_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM product_requests WHERE status='pending'")
        pending_requests = cursor.fetchone()['total']
        cursor.execute(
            "SELECT u.name, u.email, u.role, u.created_at "
            "FROM users u ORDER BY u.created_at DESC LIMIT 5"
        )
        recent_users = cursor.fetchall()
        return jsonify({
            'users': users_count,
            'dietitians': dietitians_count,
            'products': products_count,
            'orders': orders_count,
            'pending_requests': pending_requests,
            'recent_users': recent_users,
        })
    finally:
        cursor.close()
        conn.close()
