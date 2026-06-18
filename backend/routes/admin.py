from flask import Blueprint, request, jsonify
import bcrypt
from database.connection import get_connection
from middleware.auth import role_required

admin_bp = Blueprint('admin', __name__)


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


# ── Meals ────────────────────────────────────────────────────────────────────

@admin_bp.route('/meals', methods=['GET'])
@role_required('admin', 'dietitian')
def list_meals():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT m.*, u.name AS created_by_name FROM meals m "
            "LEFT JOIN users u ON m.created_by = u.id ORDER BY m.category, m.name"
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/meals', methods=['POST'])
@role_required('admin', 'dietitian')
def create_meal():
    data = request.get_json() or {}
    required = ['name', 'calories', 'category']
    if not all(data.get(f) for f in required):
        return jsonify({'error': 'name, calories and category are required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO meals (name, description, calories, protein_g, carbs_g, fat_g, category, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (
                data['name'], data.get('description'), int(data['calories']),
                float(data.get('protein_g', 0)), float(data.get('carbs_g', 0)),
                float(data.get('fat_g', 0)), data['category'], request.user_id,
            ),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Meal created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/meals/<int:mid>', methods=['PUT'])
@role_required('admin', 'dietitian')
def update_meal(mid):
    data = request.get_json() or {}
    allowed = ['name', 'description', 'calories', 'protein_g', 'carbs_g', 'fat_g', 'category']
    updates = {k: data[k] for k in allowed if k in data}
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [mid]
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE meals SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'Meal updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/meals/<int:mid>', methods=['DELETE'])
@role_required('admin')
def delete_meal(mid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM meals WHERE id = %s", (mid,))
        conn.commit()
        return jsonify({'message': 'Meal deleted'})
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
        cursor.execute("SELECT COUNT(*) AS total FROM diet_plans")
        plans_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM meals")
        meals_count = cursor.fetchone()['total']
        cursor.execute(
            "SELECT u.name, u.email, u.role, u.created_at "
            "FROM users u ORDER BY u.created_at DESC LIMIT 5"
        )
        recent_users = cursor.fetchall()
        return jsonify({
            'users': users_count,
            'dietitians': dietitians_count,
            'diet_plans': plans_count,
            'meals': meals_count,
            'recent_users': recent_users,
        })
    finally:
        cursor.close()
        conn.close()
