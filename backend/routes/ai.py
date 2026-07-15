import json
import datetime
import os
import sys
from flask import Blueprint, request, jsonify, Response
from pydantic import BaseModel, ValidationError, field_validator
from typing import Optional
from database.connection import get_connection
from middleware.auth import role_required
from utils.devtime import DEV_MODE, get_effective_today

_backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _backend_dir not in sys.path:
    sys.path.insert(0, _backend_dir)

from ai_engine.recommendation_engine import (
    recommend_daily_meals, generate_weekly_plan,
    recommend_exercise, search_food_unified, handle_natural_language_query,
)
from ai_engine.universal_food_lookup import recognize_food
from ai_engine.nutrition_calculator import calculate_nutrition_targets
from ai_engine.integrations.exercisedb import fetch_gif_bytes

try:
    from ai_engine.ml.predict import load_models
    load_models()
except Exception as e:
    print(f"  AI models not loaded ({e}) - using rule-based fallback")

ai_bp = Blueprint("ai", __name__)


def _pydantic_errors(exc):
    return [{"field": e["loc"][-1], "message": e["msg"]} for e in exc.errors()]


def _get_profile(cursor, user_id):
    cursor.execute(
        "SELECT current_weight_kg, height_cm, date_of_birth, gender, "
        "activity_level, primary_goal, fitness_level, meals_per_day, "
        "avg_sleep_hours, stress_level, dietary_restrictions, allergens, "
        "cuisine_preferences, diet_type, daily_water_target_ml "
        "FROM user_profiles WHERE user_id = %s",
        (user_id,)
    )
    row = cursor.fetchone()
    if not row:
        return {}
    for jf in ("dietary_restrictions", "allergens", "cuisine_preferences"):
        if isinstance(row.get(jf), str):
            try:
                row[jf] = json.loads(row[jf])
            except Exception:
                row[jf] = []
        elif row.get(jf) is None:
            row[jf] = []
    dob = row.get("date_of_birth")
    age = 25
    if dob:
        try:
            if isinstance(dob, (datetime.date, datetime.datetime)):
                t = datetime.date.today()
                age = t.year - dob.year - ((t.month, t.day) < (dob.month, dob.day))
            else:
                d = datetime.date.fromisoformat(str(dob)[:10])
                t = datetime.date.today()
                age = t.year - d.year - ((t.month, t.day) < (d.month, d.day))
        except Exception:
            age = 25
    row["age"] = age
    dt = row.get("diet_type", "none") or "none"
    rs = row.get("dietary_restrictions", []) or []
    row["dietary"] = {
        "is_vegetarian": dt in ("vegetarian", "vegan") or "vegetarian" in rs,
        "is_vegan": dt == "vegan" or "vegan" in rs,
        "is_diabetic_friendly": dt == "diabetic" or "diabetic" in rs,
        "is_gluten_free": "gluten_free" in rs,
    }
    return row


FOOD_SOURCES = {"nepali_kb", "usda", "nutritionix", "manual","ai"}


class LogMealSchema(BaseModel):
    meal_type: str
    food_name: str
    quantity: float = 1.0
    unit: str = "serving"
    food_source: Optional[str] = "manual"
    calories: float = 0
    protein_g: float = 0
    carbs_g: float = 0
    fat_g: float = 0
    fiber_g: float = 0
    sugar_g: float = 0
    sodium_mg: float = 0
    portion_g: Optional[float] = None
    is_consumed: int = 1
    ai_explanation: Optional[str] = None
    cuisine: Optional[str] = None

    @field_validator("food_source")
    @classmethod
    def _coerce_food_source(cls, v):
        return v if v in FOOD_SOURCES else "manual"


class NLQuerySchema(BaseModel):
    text: str


@ai_bp.route("/meals/log", methods=["POST"])
@role_required("trainee")
def log_meal():
    try:
        body = LogMealSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({"errors": _pydantic_errors(exc)}), 422
    if body.meal_type not in ("breakfast", "lunch", "snack", "dinner"):
        return jsonify({"error": "meal_type must be breakfast, lunch, snack, or dinner"}), 400
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = get_effective_today(cursor, request.user_id).isoformat()
        cursor.execute(
            "INSERT INTO meal_logs "
            "(user_id, logged_date, meal_type, food_name, food_source, "
            "quantity, unit, portion_g, calories, protein_g, carbs_g, "
            "fat_g, fiber_g, sugar_g, sodium_mg, is_consumed, ai_explanation, cuisine) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (request.user_id, today, body.meal_type, body.food_name,
             body.food_source, body.quantity, body.unit, body.portion_g,
             body.calories, body.protein_g, body.carbs_g, body.fat_g,
             body.fiber_g, body.sugar_g, body.sodium_mg,
             body.is_consumed, body.ai_explanation, body.cuisine)
        )
        log_id = cursor.lastrowid
        conn.commit()
        return jsonify({"id": log_id, "message": f"Logged {body.food_name} to {body.meal_type}"}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/meals/today", methods=["GET"])
@role_required("trainee")
def get_todays_meals():
    requested_date = request.args.get("date")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # In dev mode this endpoint always represents "today" for the user,
        # which may be a simulated day ahead of the real calendar date —
        # so the client-supplied date is ignored in favor of the effective one.
        date_str = (
            get_effective_today(cursor, request.user_id).isoformat()
            if DEV_MODE else
            (requested_date or datetime.date.today().isoformat())
        )
        cursor.execute(
            "SELECT id, meal_type, food_name, food_source, quantity, unit, "
            "calories, protein_g, carbs_g, fat_g, fiber_g, is_consumed, "
            "ai_explanation, cuisine, created_at "
            "FROM meal_logs "
            "WHERE user_id=%s AND logged_date=%s AND deleted_at IS NULL "
            "ORDER BY FIELD(meal_type,'breakfast','lunch','snack','dinner'), created_at",
            (request.user_id, date_str)
        )
        logs = cursor.fetchall()
        grouped = {"breakfast": [], "lunch": [], "snack": [], "dinner": []}
        totals = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0}
        for log in logs:
            mt = log.get("meal_type")
            if mt in grouped:
                grouped[mt].append(log)
            if log.get("is_consumed", 1):
                for k in totals:
                    totals[k] += float(log.get(k) or 0)
        profile = _get_profile(cursor, request.user_id)
        targets = {"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65}
        if profile.get("current_weight_kg") and profile.get("height_cm"):
            try:
                t = calculate_nutrition_targets(
                    weight_kg=float(profile["current_weight_kg"]),
                    height_cm=float(profile["height_cm"]),
                    age=profile.get("age", 25),
                    gender=profile.get("gender", "male"),
                    activity_level=profile.get("activity_level", "moderate"),
                    goal=profile.get("primary_goal", "maintain"),
                )
                targets = {
                    "calories": t.daily_calories, "protein_g": t.protein_g,
                    "carbs_g": t.carbs_g, "fat_g": t.fat_g,
                }
            except Exception:
                pass

        cursor.execute(
            "SELECT is_completed FROM daily_meal_summaries WHERE user_id=%s AND summary_date=%s",
            (request.user_id, date_str)
        )
        summary_row = cursor.fetchone()
        day_ended = bool(summary_row and summary_row.get("is_completed"))

        cursor.execute(
            "SELECT COALESCE(SUM(amount_ml),0) AS consumed_ml FROM water_logs "
            "WHERE user_id=%s AND logged_date=%s",
            (request.user_id, date_str)
        )
        water_consumed = int((cursor.fetchone() or {}).get("consumed_ml") or 0)
        water_target = int(profile.get("daily_water_target_ml") or 2500)
        water_pct = round(water_consumed / water_target * 100, 1) if water_target else 0

        return jsonify({
            "date": date_str,
            "meals": grouped,
            "totals": {k: round(v, 1) for k, v in totals.items()},
            "targets": targets,
            "total_entries": len(logs),
            "day_ended": day_ended,
            "water": {
                "consumed_ml": water_consumed,
                "target_ml": water_target,
                "pct": water_pct,
            },
        })
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/water/log", methods=["POST"])
@role_required("trainee")
def log_water():
    body = request.get_json() or {}
    try:
        amount_ml = int(body.get("amount_ml") or 250)
    except (TypeError, ValueError):
        return jsonify({"error": "amount_ml must be a number"}), 400
    if amount_ml <= 0:
        return jsonify({"error": "amount_ml must be positive"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = get_effective_today(cursor, request.user_id).isoformat()
        cursor.execute(
            "INSERT INTO water_logs (user_id, logged_date, amount_ml) VALUES (%s,%s,%s)",
            (request.user_id, today, amount_ml)
        )
        conn.commit()
        return jsonify({"message": f"Logged {amount_ml}ml of water", "amount_ml": amount_ml}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/meals/log/<int:log_id>/consume", methods=["PATCH"])
@role_required("trainee")
def toggle_meal_consumed(log_id):
    body = request.get_json() or {}
    is_consumed = 1 if body.get("is_consumed") else 0
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE meal_logs SET is_consumed=%s WHERE id=%s AND user_id=%s",
            (is_consumed, log_id, request.user_id)
        )
        conn.commit()
        return jsonify({"message": "Updated", "is_consumed": is_consumed})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/meals/log/<int:log_id>", methods=["DELETE"])
@role_required("trainee")
def delete_meal_log(log_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE meal_logs SET deleted_at=NOW() WHERE id=%s AND user_id=%s",
            (log_id, request.user_id)
        )
        conn.commit()
        return jsonify({"message": "Meal log deleted"})
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/meals/end-day", methods=["POST"])
@role_required("trainee")
def end_meal_day():
    """
    Finalize a day's nutrition into daily_meal_summaries and hand back
    tomorrow's AI meal plan. Normally always operates on the server's
    current date (a client can't end an arbitrary day) and is idempotent —
    safe to call again the same day (e.g. after editing a log entry);
    re-running just recomputes and re-saves the same day's summary via the
    unique (user_id, summary_date) key.

    In dev mode (MODE=dev) that changes: if a summary already exists for
    today (or later), the day to finalize advances by one instead of
    re-targeting today, so repeated calls simulate consecutive days.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = get_effective_today(cursor, request.user_id).isoformat()

        profile = _get_profile(cursor, request.user_id)

        targets = {"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65}
        if profile.get("current_weight_kg") and profile.get("height_cm"):
            try:
                t = calculate_nutrition_targets(
                    weight_kg=float(profile["current_weight_kg"]),
                    height_cm=float(profile["height_cm"]),
                    age=profile.get("age", 25),
                    gender=profile.get("gender", "male"),
                    activity_level=profile.get("activity_level", "moderate"),
                    goal=profile.get("primary_goal", "maintain"),
                )
                targets = {"calories": t.daily_calories, "protein_g": t.protein_g,
                           "carbs_g": t.carbs_g, "fat_g": t.fat_g}
            except Exception:
                pass

        cursor.execute(
            "SELECT COALESCE(SUM(calories),0) AS calories, "
            "COALESCE(SUM(protein_g),0) AS protein_g, "
            "COALESCE(SUM(carbs_g),0) AS carbs_g, "
            "COALESCE(SUM(fat_g),0) AS fat_g, COUNT(*) AS meal_count "
            "FROM meal_logs WHERE user_id=%s AND logged_date=%s "
            "AND is_consumed=1 AND deleted_at IS NULL",
            (request.user_id, today)
        )
        totals = cursor.fetchone()
        total_calories = float(totals["calories"])
        total_protein  = float(totals["protein_g"])
        total_carbs    = float(totals["carbs_g"])
        total_fat      = float(totals["fat_g"])
        meal_count     = int(totals["meal_count"])
        adherence_pct  = round(total_calories / targets["calories"] * 100, 1) if targets["calories"] else 0

        cursor.execute(
            "INSERT INTO daily_meal_summaries "
            "(user_id, summary_date, total_calories, total_protein_g, total_carbs_g, total_fat_g, "
            "target_calories, target_protein_g, target_carbs_g, target_fat_g, meal_count, "
            "is_completed, completed_at, adherence_pct) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,1,NOW(),%s) "
            "ON DUPLICATE KEY UPDATE "
            "total_calories=VALUES(total_calories), total_protein_g=VALUES(total_protein_g), "
            "total_carbs_g=VALUES(total_carbs_g), total_fat_g=VALUES(total_fat_g), "
            "target_calories=VALUES(target_calories), target_protein_g=VALUES(target_protein_g), "
            "target_carbs_g=VALUES(target_carbs_g), target_fat_g=VALUES(target_fat_g), "
            "meal_count=VALUES(meal_count), is_completed=1, completed_at=NOW(), "
            "adherence_pct=VALUES(adherence_pct)",
            (request.user_id, today, total_calories, total_protein, total_carbs, total_fat,
             targets["calories"], targets["protein_g"], targets["carbs_g"], targets["fat_g"],
             meal_count, adherence_pct)
        )
        conn.commit()

        tomorrow_plan = {}
        if profile:
            try:
                tomorrow_plan = _build_meal_recommendation(cursor, request.user_id, profile)
            except Exception:
                tomorrow_plan = {}

        return jsonify({
            "message": "Today's nutrition saved. Here's tomorrow's plan.",
            "today_summary": {
                "date": today,
                "total_calories": round(total_calories, 1),
                "total_protein_g": round(total_protein, 1),
                "total_carbs_g": round(total_carbs, 1),
                "total_fat_g": round(total_fat, 1),
                "meal_count": meal_count,
                "target_calories": targets["calories"],
                "adherence_pct": adherence_pct,
            },
            "tomorrow_plan": tomorrow_plan,
        })
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/food/search", methods=["GET"])
@role_required("trainee")
def food_search():
    q = request.args.get("q", "").strip()
    if not q or len(q) < 2:
        return jsonify({"results": []})
    return jsonify({"results": search_food_unified(q, limit=8), "query": q})


@ai_bp.route("/food/recognize", methods=["POST"])
@role_required("trainee")
def food_recognize():
    body = request.get_json() or {}
    text = (body.get("text") or "").strip()
    if not text:
        return jsonify({"error": "text is required"}), 400
    return jsonify(recognize_food(text))


@ai_bp.route("/nlp/query", methods=["POST"])
@role_required("trainee")
def nlp_query():
    try:
        body = NLQuerySchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({"errors": _pydantic_errors(exc)}), 422
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT dietary_restrictions, diet_type FROM user_profiles WHERE user_id=%s",
            (request.user_id,)
        )
        profile = cursor.fetchone() or {}
        dietary = {}
        if profile.get("dietary_restrictions"):
            try:
                rs = json.loads(profile["dietary_restrictions"])
            except Exception:
                rs = []
            dt = profile.get("diet_type", "none") or "none"
            dietary = {
                "is_vegetarian": dt in ("vegetarian", "vegan") or "vegetarian" in rs,
                "is_vegan": dt == "vegan",
            }
    finally:
        cursor.close()
        conn.close()
    return jsonify(handle_natural_language_query(body.text, dietary=dietary))


def _build_meal_recommendation(cursor, user_id, profile):
    """Fetch recent food history and build a fresh daily meal plan for the profile.
    Shared by /recommend/meal and /meals/end-day (tomorrow's plan)."""
    # Build detailed food history for v3 ML variety features
    # {food_name: {days_since, times_week, times_total}}
    recently_eaten = set()
    recently_eaten_detail = {}
    try:
        cursor.execute(
            """SELECT food_name,
                      MIN(DATEDIFF(CURDATE(), logged_date)) AS days_since,
                      SUM(CASE WHEN logged_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
                               THEN 1 ELSE 0 END) AS times_week,
                      COUNT(*) AS times_total
               FROM meal_logs
               WHERE user_id=%s
                 AND logged_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
                 AND deleted_at IS NULL
               GROUP BY food_name""",
            (user_id,)
        )
        for row in cursor.fetchall():
            fname = row["food_name"]
            recently_eaten.add(fname)
            recently_eaten_detail[fname] = {
                "days_since":  int(row["days_since"] or 999),
                "times_week":  int(row["times_week"] or 0),
                "times_total": int(row["times_total"] or 0),
            }
    except Exception:
        pass

    return recommend_daily_meals(
        weight_kg=float(profile.get("current_weight_kg") or 70),
        height_cm=float(profile.get("height_cm") or 170),
        age=profile.get("age", 25),
        gender=profile.get("gender", "male"),
        activity_level=profile.get("activity_level", "moderate"),
        goal=profile.get("primary_goal", "maintain"),
        meals_per_day=int(profile.get("meals_per_day") or 3),
        dietary=profile.get("dietary", {}),
        preferred_cuisines=profile.get("cuisine_preferences") or ["nepali"],
        recently_eaten=recently_eaten,
        recently_eaten_detail=recently_eaten_detail,
    )


@ai_bp.route("/recommend/meal", methods=["GET"])
@role_required("trainee")
def recommend_meal():
    meal_type = request.args.get("meal_type")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        profile = _get_profile(cursor, request.user_id)
        if not profile:
            return jsonify({"error": "Complete your profile first"}), 400
        result = _build_meal_recommendation(cursor, request.user_id, profile)
        if meal_type and meal_type in result.get("meal_plan", {}):
            return jsonify({
                "nutrition_targets": result["nutrition_targets"],
                "meal_type": meal_type,
                "recommendation": result["meal_plan"][meal_type],
            })
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/recommend/exercise", methods=["GET"])
@role_required("trainee")
def recommend_exercise_endpoint():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = get_effective_today(cursor, request.user_id).isoformat()
        cursor.execute(
            "SELECT COALESCE(SUM(calories),0) AS consumed FROM meal_logs "
            "WHERE user_id=%s AND logged_date=%s AND deleted_at IS NULL",
            (request.user_id, today)
        )
        consumed = float((cursor.fetchone() or {}).get("consumed", 0))
        profile = _get_profile(cursor, request.user_id)
        if not profile:
            return jsonify({"error": "Complete your profile first"}), 400
        t = calculate_nutrition_targets(
            weight_kg=float(profile.get("current_weight_kg") or 70),
            height_cm=float(profile.get("height_cm") or 170),
            age=profile.get("age", 25),
            gender=profile.get("gender", "male"),
            activity_level=profile.get("activity_level", "moderate"),
            goal=profile.get("primary_goal", "maintain"),
        )
        calorie_ratio = round(consumed / t.daily_calories, 3) if t.daily_calories else 1.0
        result = recommend_exercise(
            goal=profile.get("primary_goal", "maintain"),
            bmi=t.bmi,
            age=profile.get("age", 25),
            fitness_level=profile.get("fitness_level", "beginner"),
            calorie_ratio=calorie_ratio,
            activity_level=profile.get("activity_level", "moderate"),
            today_calories=consumed,
        )

        # Mark exercises already logged today so the UI can lock them until
        # the day changes (real rollover, or an End Meal Today advance).
        cursor.execute(
            "SELECT DISTINCT e.name FROM exercise_logs el "
            "JOIN exercises e ON e.id = el.exercise_id "
            "WHERE el.user_id=%s AND el.logged_date=%s",
            (request.user_id, today)
        )
        completed_names = {row["name"] for row in cursor.fetchall()}
        for item in result.get("exercises", []):
            item["is_completed"] = item.get("name") in completed_names

        return jsonify({**result, "today_calories": consumed,
                        "target_calories": t.daily_calories, "calorie_ratio": calorie_ratio})
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/exercise-gif/<exercise_id>", methods=["GET"])
def exercise_gif(exercise_id):
    """No auth - <img> tags can't send our JWT header, and gifs aren't
    user-specific data anyway. Proxies ExerciseDB so our RapidAPI key
    stays server-side."""
    resolution = request.args.get("resolution", "180")
    content, content_type = fetch_gif_bytes(exercise_id, resolution)
    if content is None:
        return jsonify({"error": "gif not found"}), 404
    resp = Response(content, mimetype=content_type)
    resp.headers["Cache-Control"] = "public, max-age=86400"
    return resp


@ai_bp.route("/report/weekly", methods=["GET"])
@role_required("trainee")
def weekly_report():
    today = datetime.date.today()
    ws_str = request.args.get("week_start")
    if ws_str:
        try:
            week_start = datetime.date.fromisoformat(ws_str)
        except Exception:
            return jsonify({"error": "Invalid week_start (YYYY-MM-DD)"}), 400
    else:
        week_start = today - datetime.timedelta(days=today.weekday())
    week_end = week_start + datetime.timedelta(days=6)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT logged_date, COALESCE(SUM(calories),0) AS calories, "
            "COALESCE(SUM(protein_g),0) AS protein_g, "
            "COALESCE(SUM(carbs_g),0) AS carbs_g, "
            "COALESCE(SUM(fat_g),0) AS fat_g, COUNT(*) AS meal_count "
            "FROM meal_logs WHERE user_id=%s "
            "AND logged_date BETWEEN %s AND %s AND deleted_at IS NULL "
            "GROUP BY logged_date ORDER BY logged_date",
            (request.user_id, week_start.isoformat(), week_end.isoformat())
        )
        daily_rows = cursor.fetchall()
        exercise_by_day = {}
        try:
            cursor.execute(
                "SELECT el.logged_date, "
                "COALESCE(SUM(el.calories_burned),0) AS calories_burned, "
                "COALESCE(SUM(el.duration_minutes),0) AS total_minutes, "
                "COUNT(*) AS workout_count, "
                "GROUP_CONCAT(DISTINCT e.name ORDER BY e.name SEPARATOR ', ') AS exercises_done "
                "FROM exercise_logs el JOIN exercises e ON e.id = el.exercise_id "
                "WHERE el.user_id=%s AND el.logged_date BETWEEN %s AND %s "
                "GROUP BY el.logged_date",
                (request.user_id, week_start.isoformat(), week_end.isoformat())
            )
            for r in cursor.fetchall():
                exercise_by_day[str(r["logged_date"])] = r
        except Exception:
            pass

        most_frequent_exercise = None
        try:
            cursor.execute(
                "SELECT e.name, COUNT(*) AS cnt "
                "FROM exercise_logs el JOIN exercises e ON e.id = el.exercise_id "
                "WHERE el.user_id=%s AND el.logged_date BETWEEN %s AND %s "
                "GROUP BY e.name ORDER BY cnt DESC LIMIT 1",
                (request.user_id, week_start.isoformat(), week_end.isoformat())
            )
            top = cursor.fetchone()
            most_frequent_exercise = top["name"] if top else None
        except Exception:
            pass

        water_by_day = {}
        try:
            cursor.execute(
                "SELECT logged_date, COALESCE(SUM(amount_ml),0) AS water_ml "
                "FROM water_logs WHERE user_id=%s AND logged_date BETWEEN %s AND %s "
                "GROUP BY logged_date",
                (request.user_id, week_start.isoformat(), week_end.isoformat())
            )
            for r in cursor.fetchall():
                water_by_day[str(r["logged_date"])] = r
        except Exception:
            pass

        profile = _get_profile(cursor, request.user_id)
        water_target = int(profile.get("daily_water_target_ml") or 2500)
        target_calories = 2000
        targets_data = {"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65,
                         "water_ml": water_target}
        if profile.get("current_weight_kg") and profile.get("height_cm"):
            try:
                t = calculate_nutrition_targets(
                    weight_kg=float(profile["current_weight_kg"]),
                    height_cm=float(profile["height_cm"]),
                    age=profile.get("age", 25),
                    gender=profile.get("gender", "male"),
                    activity_level=profile.get("activity_level", "moderate"),
                    goal=profile.get("primary_goal", "maintain"),
                )
                target_calories = t.daily_calories
                targets_data = {"calories": t.daily_calories, "protein_g": t.protein_g,
                                "carbs_g": t.carbs_g, "fat_g": t.fat_g, "water_ml": water_target}
            except Exception:
                pass
        daily_data = []
        for i in range(7):
            day = week_start + datetime.timedelta(days=i)
            day_str = day.isoformat()
            m = next((r for r in daily_rows if str(r["logged_date"]) == day_str), None)
            ex = exercise_by_day.get(day_str, {})
            w = water_by_day.get(day_str, {})
            water_ml = int(w.get("water_ml", 0))
            daily_data.append({
                "date": day_str, "day_name": day.strftime("%A"),
                "calories": round(float(m["calories"]), 1) if m else 0,
                "protein_g": round(float(m["protein_g"]), 1) if m else 0,
                "carbs_g": round(float(m["carbs_g"]), 1) if m else 0,
                "fat_g": round(float(m["fat_g"]), 1) if m else 0,
                "meal_count": m["meal_count"] if m else 0,
                "calories_burned": float(ex.get("calories_burned", 0)),
                "exercise_minutes": int(ex.get("total_minutes", 0)),
                "workout_count": int(ex.get("workout_count", 0)),
                "exercises_done": ex.get("exercises_done") or "",
                "water_ml": water_ml,
                "water_pct": round(water_ml / water_target * 100, 1) if water_target else 0,
            })
        logged = [d for d in daily_data if d["meal_count"] > 0]
        avg_cal = round(sum(d["calories"] for d in logged) / len(logged), 1) if logged else 0
        avg_prot = round(sum(d["protein_g"] for d in logged) / len(logged), 1) if logged else 0
        avg_carb = round(sum(d["carbs_g"] for d in logged) / len(logged), 1) if logged else 0
        avg_fat = round(sum(d["fat_g"] for d in logged) / len(logged), 1) if logged else 0
        adherence = round(avg_cal / target_calories * 100, 1) if target_calories else 0

        total_calories_burned = round(sum(d["calories_burned"] for d in daily_data), 1)
        total_exercise_mins = sum(d["exercise_minutes"] for d in daily_data)
        total_workouts = sum(d["workout_count"] for d in daily_data)
        water_logged = [d for d in daily_data if d["water_ml"] > 0]
        avg_water_ml = round(sum(d["water_ml"] for d in water_logged) / len(water_logged), 1) if water_logged else 0

        try:
            cursor.execute(
                "INSERT INTO weekly_reports "
                "(user_id,week_start,week_end,avg_calories,avg_protein_g,"
                "avg_carbs_g,avg_fat_g,total_meals,target_calories,adherence_pct,"
                "total_calories,total_protein_g,total_carbs_g,total_fat_g,"
                "total_exercise_mins,total_calories_burned,workout_count,most_done_exercise) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                "ON DUPLICATE KEY UPDATE avg_calories=VALUES(avg_calories),"
                "avg_protein_g=VALUES(avg_protein_g),avg_carbs_g=VALUES(avg_carbs_g),"
                "avg_fat_g=VALUES(avg_fat_g),total_meals=VALUES(total_meals),"
                "adherence_pct=VALUES(adherence_pct),total_calories=VALUES(total_calories),"
                "total_protein_g=VALUES(total_protein_g),total_carbs_g=VALUES(total_carbs_g),"
                "total_fat_g=VALUES(total_fat_g),total_exercise_mins=VALUES(total_exercise_mins),"
                "total_calories_burned=VALUES(total_calories_burned),"
                "workout_count=VALUES(workout_count),most_done_exercise=VALUES(most_done_exercise)",
                (request.user_id, week_start.isoformat(), week_end.isoformat(),
                 avg_cal, avg_prot, avg_carb, avg_fat,
                 sum(d["meal_count"] for d in daily_data), target_calories, adherence,
                 sum(d["calories"] for d in daily_data), sum(d["protein_g"] for d in daily_data),
                 sum(d["carbs_g"] for d in daily_data), sum(d["fat_g"] for d in daily_data),
                 total_exercise_mins, total_calories_burned, total_workouts, most_frequent_exercise)
            )
            conn.commit()
        except Exception:
            conn.rollback()
        return jsonify({
            "week_start": week_start.isoformat(), "week_end": week_end.isoformat(),
            "daily_data": daily_data,
            "summary": {"avg_calories": avg_cal, "avg_protein_g": avg_prot,
                        "avg_carbs_g": avg_carb, "avg_fat_g": avg_fat,
                        "target_calories": target_calories, "adherence_pct": adherence,
                        "days_logged": len(logged),
                        "total_meals": sum(d["meal_count"] for d in daily_data),
                        "total_calories_burned": total_calories_burned,
                        "total_exercise_mins": total_exercise_mins,
                        "total_workouts": total_workouts,
                        "most_frequent_exercise": most_frequent_exercise,
                        "avg_water_ml": avg_water_ml,
                        "water_target_ml": water_target},
            "targets": targets_data,
        })
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/exercise/complete", methods=["POST"])
@role_required("trainee")
def complete_exercise():
    """
    Log a completed exercise and calculate calories burned.
    Body: { exercise_id, exercise_name, body_part, duration_minutes, sets, reps }
    Calories burned = MET * weight_kg * (duration_minutes / 60)
    MET values: cardio=7, strength=5, yoga=3, rest=2
    """
    body = request.get_json() or {}
    exercise_name    = body.get("exercise_name", "Unknown Exercise")
    body_part        = body.get("body_part", "cardio")
    duration_minutes = int(body.get("duration_minutes", 30))
    sets             = int(body.get("sets", 0))
    reps             = int(body.get("reps", 0))
    exercise_id_ext  = body.get("exercise_id", "")  # ExerciseDB id (not our DB id)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Get user weight for calorie calculation
        cursor.execute(
            "SELECT current_weight_kg FROM user_profiles WHERE user_id=%s",
            (request.user_id,)
        )
        profile = cursor.fetchone() or {}
        weight_kg = float(profile.get("current_weight_kg") or 70)

        # MET-based calorie calculation
        MET_MAP = {
            "cardio":     7.0,
            "upper arms": 4.5,
            "upper legs": 5.0,
            "chest":      5.0,
            "back":       4.5,
            "shoulders":  4.0,
            "waist":      3.5,
            "neck":       2.5,
        }
        met = MET_MAP.get(body_part.lower(), 5.0)
        calories_burned = round(met * weight_kg * (duration_minutes / 60))

        # Find or create a matching exercise in our exercises table
        cursor.execute(
            "SELECT id FROM exercises WHERE name = %s LIMIT 1",
            (exercise_name,)
        )
        row = cursor.fetchone()
        if row:
            exercise_db_id = row["id"]
        else:
            # Insert a new exercise record
            category_map = {
                "cardio": "cardio", "chest": "strength", "back": "strength",
                "shoulders": "strength", "upper legs": "strength", "upper arms": "strength",
                "waist": "flexibility",
            }
            cat = category_map.get(body_part.lower(), "other")
            cursor.execute(
                "INSERT INTO exercises (name, category, calories_burned_per_hour, description) "
                "VALUES (%s, %s, %s, %s)",
                (exercise_name, cat, round(met * weight_kg), f"From ExerciseDB: {exercise_id_ext}")
            )
            exercise_db_id = cursor.lastrowid

        # Log the exercise
        today = get_effective_today(cursor, request.user_id).isoformat()
        cursor.execute(
            "INSERT INTO exercise_logs (user_id, exercise_id, logged_date, duration_minutes, calories_burned, notes) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (request.user_id, exercise_db_id, today, duration_minutes, calories_burned,
             f"Sets: {sets}, Reps: {reps}" if sets or reps else None)
        )
        log_id = cursor.lastrowid
        conn.commit()

        return jsonify({
            "id":               log_id,
            "exercise_name":    exercise_name,
            "duration_minutes": duration_minutes,
            "calories_burned":  calories_burned,
            "logged_date":      today,
            "message":          f"Great work! Burned ~{calories_burned} kcal in {duration_minutes} minutes.",
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@ai_bp.route("/plan/weekly", methods=["GET"])
@role_required("trainee")
def weekly_meal_plan():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        profile = _get_profile(cursor, request.user_id)
        if not profile:
            return jsonify({"error": "Complete your profile first"}), 400
        result = generate_weekly_plan(
            weight_kg=float(profile.get("current_weight_kg") or 70),
            height_cm=float(profile.get("height_cm") or 170),
            age=profile.get("age", 25),
            gender=profile.get("gender", "male"),
            activity_level=profile.get("activity_level", "moderate"),
            goal=profile.get("primary_goal", "maintain"),
            meals_per_day=int(profile.get("meals_per_day") or 3),
            dietary=profile.get("dietary", {}),
            preferred_cuisines=profile.get("cuisine_preferences") or ["nepali"],
        )
        return jsonify(result)
    finally:
        cursor.close()
        conn.close()