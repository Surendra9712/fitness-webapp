from flask import Blueprint, request, jsonify
from database.connection import get_connection
from middleware.auth import role_required

dietitian_bp = Blueprint('dietitian', __name__)


# ── Diet Plans ────────────────────────────────────────────────────────────────

@dietitian_bp.route('/plans', methods=['GET'])
@role_required('admin', 'dietitian')
def list_plans():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.user_role == 'admin':
            cursor.execute(
                "SELECT dp.*, u.name AS dietitian_name FROM diet_plans dp "
                "LEFT JOIN users u ON dp.dietitian_id = u.id ORDER BY dp.created_at DESC"
            )
        else:
            cursor.execute(
                "SELECT dp.*, u.name AS dietitian_name FROM diet_plans dp "
                "LEFT JOIN users u ON dp.dietitian_id = u.id "
                "WHERE dp.dietitian_id = %s ORDER BY dp.created_at DESC",
                (request.user_id,),
            )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/plans', methods=['POST'])
@role_required('admin', 'dietitian')
def create_plan():
    data = request.get_json() or {}
    if not data.get('title'):
        return jsonify({'error': 'title is required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO diet_plans (title, description, goal, total_daily_calories, dietitian_id) "
            "VALUES (%s,%s,%s,%s,%s)",
            (
                data['title'], data.get('description'),
                data.get('goal', 'maintain'), data.get('total_daily_calories'),
                request.user_id,
            ),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Plan created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/plans/<int:pid>', methods=['GET'])
@role_required('admin', 'dietitian')
def get_plan(pid):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT dp.*, u.name AS dietitian_name FROM diet_plans dp "
            "LEFT JOIN users u ON dp.dietitian_id = u.id WHERE dp.id = %s",
            (pid,),
        )
        plan = cursor.fetchone()
        if not plan:
            return jsonify({'error': 'Plan not found'}), 404

        cursor.execute(
            "SELECT dpm.*, m.name AS meal_name, m.calories, m.protein_g, m.carbs_g, m.fat_g "
            "FROM diet_plan_meals dpm JOIN meals m ON dpm.meal_id = m.id "
            "WHERE dpm.plan_id = %s ORDER BY dpm.day_of_week, dpm.meal_time",
            (pid,),
        )
        plan['meals'] = cursor.fetchall()
        return jsonify(plan)
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/plans/<int:pid>', methods=['PUT'])
@role_required('admin', 'dietitian')
def update_plan(pid):
    data = request.get_json() or {}
    allowed = ['title', 'description', 'goal', 'total_daily_calories']
    updates = {k: data[k] for k in allowed if k in data}
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [pid]
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE diet_plans SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'Plan updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/plans/<int:pid>', methods=['DELETE'])
@role_required('admin', 'dietitian')
def delete_plan(pid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM diet_plans WHERE id = %s", (pid,))
        conn.commit()
        return jsonify({'message': 'Plan deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Plan Meals ────────────────────────────────────────────────────────────────

@dietitian_bp.route('/plans/<int:pid>/meals', methods=['POST'])
@role_required('admin', 'dietitian')
def add_meal_to_plan(pid):
    data = request.get_json() or {}
    if not all([data.get('meal_id'), data.get('day_of_week'), data.get('meal_time')]):
        return jsonify({'error': 'meal_id, day_of_week and meal_time are required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO diet_plan_meals (plan_id, meal_id, day_of_week, meal_time) VALUES (%s,%s,%s,%s)",
            (pid, data['meal_id'], data['day_of_week'], data['meal_time']),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Meal added to plan'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/plans/<int:pid>/meals/<int:entry_id>', methods=['DELETE'])
@role_required('admin', 'dietitian')
def remove_meal_from_plan(pid, entry_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM diet_plan_meals WHERE id = %s AND plan_id = %s", (entry_id, pid))
        conn.commit()
        return jsonify({'message': 'Meal removed from plan'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Assignments ──────────────────────────────────────────────────────────────

@dietitian_bp.route('/assignments', methods=['GET'])
@role_required('admin', 'dietitian')
def list_assignments():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.user_role == 'admin':
            cursor.execute(
                "SELECT a.*, u.name AS user_name, u.email AS user_email, "
                "dp.title AS plan_title, d.name AS assigned_by_name "
                "FROM user_diet_assignments a "
                "JOIN users u ON a.user_id = u.id "
                "JOIN diet_plans dp ON a.plan_id = dp.id "
                "LEFT JOIN users d ON a.assigned_by = d.id "
                "ORDER BY a.assigned_at DESC"
            )
        else:
            cursor.execute(
                "SELECT a.*, u.name AS user_name, u.email AS user_email, "
                "dp.title AS plan_title "
                "FROM user_diet_assignments a "
                "JOIN users u ON a.user_id = u.id "
                "JOIN diet_plans dp ON a.plan_id = dp.id "
                "WHERE dp.dietitian_id = %s ORDER BY a.assigned_at DESC",
                (request.user_id,),
            )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/assignments', methods=['POST'])
@role_required('admin', 'dietitian')
def assign_plan():
    data = request.get_json() or {}
    if not all([data.get('user_id'), data.get('plan_id'), data.get('start_date')]):
        return jsonify({'error': 'user_id, plan_id and start_date are required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        # deactivate any existing active assignment for this user
        cursor.execute(
            "UPDATE user_diet_assignments SET is_active = FALSE WHERE user_id = %s AND is_active = TRUE",
            (data['user_id'],),
        )
        cursor.execute(
            "INSERT INTO user_diet_assignments (user_id, plan_id, assigned_by, start_date, end_date) "
            "VALUES (%s,%s,%s,%s,%s)",
            (data['user_id'], data['plan_id'], request.user_id, data['start_date'], data.get('end_date')),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Plan assigned'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/assignments/<int:aid>', methods=['DELETE'])
@role_required('admin', 'dietitian')
def remove_assignment(aid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM user_diet_assignments WHERE id = %s", (aid,))
        conn.commit()
        return jsonify({'message': 'Assignment removed'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Users list for dietitian (to assign plans) ───────────────────────────────

@dietitian_bp.route('/users', methods=['GET'])
@role_required('admin', 'dietitian')
def list_users():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, email FROM users WHERE role = 'user' AND is_active = TRUE ORDER BY name")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()
