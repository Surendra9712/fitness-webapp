from flask import Blueprint, request, jsonify
from database.connection import get_connection
from middleware.auth import token_required

user_bp = Blueprint('user', __name__)


# ── My Diet Plan ──────────────────────────────────────────────────────────────

@user_bp.route('/my-plan', methods=['GET'])
@token_required
def my_plan():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT a.id AS assignment_id, a.start_date, a.end_date, "
            "dp.id AS plan_id, dp.title, dp.description, dp.goal, dp.total_daily_calories, "
            "u.name AS dietitian_name "
            "FROM user_diet_assignments a "
            "JOIN diet_plans dp ON a.plan_id = dp.id "
            "LEFT JOIN users u ON dp.dietitian_id = u.id "
            "WHERE a.user_id = %s AND a.is_active = TRUE LIMIT 1",
            (request.user_id,),
        )
        assignment = cursor.fetchone()
        if not assignment:
            return jsonify({'plan': None})

        cursor.execute(
            "SELECT dpm.id, dpm.day_of_week, dpm.meal_time, "
            "m.id AS meal_id, m.name AS meal_name, m.calories, m.protein_g, m.carbs_g, m.fat_g, m.category "
            "FROM diet_plan_meals dpm JOIN meals m ON dpm.meal_id = m.id "
            "WHERE dpm.plan_id = %s ORDER BY "
            "FIELD(dpm.day_of_week,'monday','tuesday','wednesday','thursday','friday','saturday','sunday'), "
            "FIELD(dpm.meal_time,'breakfast','lunch','dinner','snack')",
            (assignment['plan_id'],),
        )
        assignment['meals'] = cursor.fetchall()
        return jsonify({'plan': assignment})
    finally:
        cursor.close()
        conn.close()


# ── Meal Logs ─────────────────────────────────────────────────────────────────

@user_bp.route('/meal-logs', methods=['GET'])
@token_required
def get_meal_logs():
    date = request.args.get('date')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if date:
            cursor.execute(
                "SELECT ml.*, m.name AS meal_name, m.calories, m.protein_g, m.carbs_g, m.fat_g "
                "FROM meal_logs ml JOIN meals m ON ml.meal_id = m.id "
                "WHERE ml.user_id = %s AND ml.logged_date = %s ORDER BY ml.meal_time",
                (request.user_id, date),
            )
        else:
            cursor.execute(
                "SELECT ml.*, m.name AS meal_name, m.calories, m.protein_g, m.carbs_g, m.fat_g "
                "FROM meal_logs ml JOIN meals m ON ml.meal_id = m.id "
                "WHERE ml.user_id = %s ORDER BY ml.logged_date DESC, ml.meal_time LIMIT 50",
                (request.user_id,),
            )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/meal-logs', methods=['POST'])
@token_required
def log_meal():
    data = request.get_json() or {}
    if not all([data.get('meal_id'), data.get('logged_date'), data.get('meal_time')]):
        return jsonify({'error': 'meal_id, logged_date and meal_time are required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO meal_logs (user_id, meal_id, logged_date, meal_time, notes) VALUES (%s,%s,%s,%s,%s)",
            (request.user_id, data['meal_id'], data['logged_date'], data['meal_time'], data.get('notes')),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Meal logged'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@user_bp.route('/meal-logs/<int:log_id>', methods=['DELETE'])
@token_required
def delete_meal_log(log_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM meal_logs WHERE id = %s AND user_id = %s", (log_id, request.user_id))
        conn.commit()
        return jsonify({'message': 'Log deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Exercise Logs ─────────────────────────────────────────────────────────────

@user_bp.route('/exercise-logs', methods=['GET'])
@token_required
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
@token_required
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
@token_required
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


# ── Progress / Dashboard Summary ──────────────────────────────────────────────

@user_bp.route('/dashboard', methods=['GET'])
@token_required
def dashboard():
    today = request.args.get('date')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if not today:
            import datetime
            today = datetime.date.today().isoformat()

        # calories consumed today
        cursor.execute(
            "SELECT COALESCE(SUM(m.calories),0) AS calories_in "
            "FROM meal_logs ml JOIN meals m ON ml.meal_id = m.id "
            "WHERE ml.user_id = %s AND ml.logged_date = %s",
            (request.user_id, today),
        )
        calories_in = cursor.fetchone()['calories_in']

        # calories burned today
        cursor.execute(
            "SELECT COALESCE(SUM(calories_burned),0) AS calories_out "
            "FROM exercise_logs WHERE user_id = %s AND logged_date = %s",
            (request.user_id, today),
        )
        calories_out = cursor.fetchone()['calories_out']

        # weekly meal log count
        cursor.execute(
            "SELECT COUNT(*) AS meals_this_week FROM meal_logs "
            "WHERE user_id = %s AND logged_date >= DATE_SUB(%s, INTERVAL 6 DAY)",
            (request.user_id, today),
        )
        meals_this_week = cursor.fetchone()['meals_this_week']

        # weekly exercise minutes
        cursor.execute(
            "SELECT COALESCE(SUM(duration_minutes),0) AS exercise_mins "
            "FROM exercise_logs WHERE user_id = %s AND logged_date >= DATE_SUB(%s, INTERVAL 6 DAY)",
            (request.user_id, today),
        )
        exercise_mins = cursor.fetchone()['exercise_mins']

        return jsonify({
            'date': today,
            'calories_in': int(calories_in),
            'calories_out': int(calories_out),
            'net_calories': int(calories_in) - int(calories_out),
            'meals_this_week': int(meals_this_week),
            'exercise_mins_this_week': int(exercise_mins),
        })
    finally:
        cursor.close()
        conn.close()


# ── Available Meals (for logging) ─────────────────────────────────────────────

@user_bp.route('/meals', methods=['GET'])
@token_required
def available_meals():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, calories, protein_g, carbs_g, fat_g, category FROM meals ORDER BY category, name")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


# ── Available Exercises (for logging) ─────────────────────────────────────────

@user_bp.route('/exercises', methods=['GET'])
@token_required
def available_exercises():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, category, calories_burned_per_hour FROM exercises ORDER BY category, name")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()
