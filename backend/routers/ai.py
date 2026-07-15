import json
import datetime
import os
import sys

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, Response
from pydantic import BaseModel, field_validator
from typing import Optional

from database.connection import get_connection
from dependencies import CurrentUser, require_roles

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

router = APIRouter()


def _get_profile(cursor, user_id):
    cursor.execute(
        "SELECT current_weight_kg, height_cm, date_of_birth, gender, "
        "activity_level, primary_goal, fitness_level, meals_per_day, "
        "avg_sleep_hours, stress_level, dietary_restrictions, allergens, "
        "cuisine_preferences, diet_type FROM user_profiles WHERE user_id = %s",
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


FOOD_SOURCES = {"nepali_kb", "usda", "nutritionix", "manual", "ai"}


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

    @field_validator("food_source")
    @classmethod
    def _coerce_food_source(cls, v):
        return v if v in FOOD_SOURCES else "manual"


class NLQuerySchema(BaseModel):
    text: str


@router.post("/meals/log")
def log_meal(body: LogMealSchema, user: CurrentUser = Depends(require_roles("trainee"))):
    if body.meal_type not in ("breakfast", "lunch", "snack", "dinner"):
        return JSONResponse({"error": "meal_type must be breakfast, lunch, snack, or dinner"}, status_code=400)
    today = datetime.date.today().isoformat()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO meal_logs "
            "(user_id, logged_date, meal_type, food_name, food_source, "
            "quantity, unit, portion_g, calories, protein_g, carbs_g, "
            "fat_g, fiber_g, sugar_g, sodium_mg) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
            (user.user_id, today, body.meal_type, body.food_name,
             body.food_source, body.quantity, body.unit, body.portion_g,
             body.calories, body.protein_g, body.carbs_g, body.fat_g,
             body.fiber_g, body.sugar_g, body.sodium_mg)
        )
        log_id = cursor.lastrowid
        conn.commit()
        return JSONResponse({"id": log_id, "message": f"Logged {body.food_name} to {body.meal_type}"}, status_code=201)
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.get("/meals/today")
def get_todays_meals(request: Request, user: CurrentUser = Depends(require_roles("trainee"))):
    date_str = request.query_params.get("date", datetime.date.today().isoformat())
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, meal_type, food_name, food_source, quantity, unit, "
            "calories, protein_g, carbs_g, fat_g, fiber_g, created_at "
            "FROM meal_logs "
            "WHERE user_id=%s AND logged_date=%s AND deleted_at IS NULL "
            "ORDER BY FIELD(meal_type,'breakfast','lunch','snack','dinner'), created_at",
            (user.user_id, date_str)
        )
        logs = cursor.fetchall()
        grouped = {"breakfast": [], "lunch": [], "snack": [], "dinner": []}
        totals = {"calories": 0.0, "protein_g": 0.0, "carbs_g": 0.0, "fat_g": 0.0, "fiber_g": 0.0}
        for log in logs:
            mt = log.get("meal_type")
            if mt in grouped:
                grouped[mt].append(log)
            for k in totals:
                totals[k] += float(log.get(k) or 0)
        profile = _get_profile(cursor, user.user_id)
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
        return {
            "date": date_str,
            "meals": grouped,
            "totals": {k: round(v, 1) for k, v in totals.items()},
            "targets": targets,
            "total_entries": len(logs),
        }
    finally:
        cursor.close()
        conn.close()


@router.delete("/meals/log/{log_id}")
def delete_meal_log(log_id: int, user: CurrentUser = Depends(require_roles("trainee"))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE meal_logs SET deleted_at=NOW() WHERE id=%s AND user_id=%s",
            (log_id, user.user_id)
        )
        conn.commit()
        return {"message": "Meal log deleted"}
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.get("/food/search")
def food_search(request: Request, user: CurrentUser = Depends(require_roles("trainee"))):
    q = request.query_params.get("q", "").strip()
    if not q or len(q) < 2:
        return {"results": []}
    return {"results": search_food_unified(q, limit=8), "query": q}


@router.post("/food/recognize")
def food_recognize(body: dict, user: CurrentUser = Depends(require_roles("trainee"))):
    text = ((body or {}).get("text") or "").strip()
    if not text:
        return JSONResponse({"error": "text is required"}, status_code=400)
    return recognize_food(text)


@router.post("/nlp/query")
def nlp_query(body: NLQuerySchema, user: CurrentUser = Depends(require_roles("trainee"))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT dietary_restrictions, diet_type FROM user_profiles WHERE user_id=%s",
            (user.user_id,)
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
    return handle_natural_language_query(body.text, dietary=dietary)


@router.get("/recommend/meal")
def recommend_meal(request: Request, user: CurrentUser = Depends(require_roles("trainee"))):
    meal_type = request.query_params.get("meal_type")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        profile = _get_profile(cursor, user.user_id)
        if not profile:
            return JSONResponse({"error": "Complete your profile first"}, status_code=400)
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
                (user.user_id,)
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

        result = recommend_daily_meals(
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
        if meal_type and meal_type in result.get("meal_plan", {}):
            return {
                "nutrition_targets": result["nutrition_targets"],
                "meal_type": meal_type,
                "recommendation": result["meal_plan"][meal_type],
            }
        return result
    finally:
        cursor.close()
        conn.close()


@router.get("/recommend/exercise")
def recommend_exercise_endpoint(user: CurrentUser = Depends(require_roles("trainee"))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        today = datetime.date.today().isoformat()
        cursor.execute(
            "SELECT COALESCE(SUM(calories),0) AS consumed FROM meal_logs "
            "WHERE user_id=%s AND logged_date=%s AND deleted_at IS NULL",
            (user.user_id, today)
        )
        consumed = float((cursor.fetchone() or {}).get("consumed", 0))
        profile = _get_profile(cursor, user.user_id)
        if not profile:
            return JSONResponse({"error": "Complete your profile first"}, status_code=400)
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
        return {**result, "today_calories": consumed,
                "target_calories": t.daily_calories, "calorie_ratio": calorie_ratio}
    finally:
        cursor.close()
        conn.close()


@router.get("/exercise-gif/{exercise_id}")
def exercise_gif(exercise_id: str, request: Request):
    """No auth - <img> tags can't send our JWT header, and gifs aren't
    user-specific data anyway. Proxies ExerciseDB so our RapidAPI key
    stays server-side."""
    resolution = request.query_params.get("resolution", "180")
    content, content_type = fetch_gif_bytes(exercise_id, resolution)
    if content is None:
        return JSONResponse({"error": "gif not found"}, status_code=404)
    return Response(
        content=content,
        media_type=content_type,
        headers={"Cache-Control": "public, max-age=86400"},
    )


@router.get("/report/weekly")
def weekly_report(request: Request, user: CurrentUser = Depends(require_roles("trainee"))):
    today = datetime.date.today()
    ws_str = request.query_params.get("week_start")
    if ws_str:
        try:
            week_start = datetime.date.fromisoformat(ws_str)
        except Exception:
            return JSONResponse({"error": "Invalid week_start (YYYY-MM-DD)"}, status_code=400)
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
            (user.user_id, week_start.isoformat(), week_end.isoformat())
        )
        daily_rows = cursor.fetchall()
        exercise_by_day = {}
        try:
            cursor.execute(
                "SELECT logged_date, COALESCE(SUM(calories_burned),0) AS calories_burned, "
                "COALESCE(SUM(duration_minutes),0) AS total_minutes "
                "FROM exercise_logs WHERE user_id=%s AND logged_date BETWEEN %s AND %s "
                "GROUP BY logged_date",
                (user.user_id, week_start.isoformat(), week_end.isoformat())
            )
            for r in cursor.fetchall():
                exercise_by_day[str(r["logged_date"])] = r
        except Exception:
            pass
        profile = _get_profile(cursor, user.user_id)
        target_calories = 2000
        targets_data = {"calories": 2000, "protein_g": 150, "carbs_g": 200, "fat_g": 65}
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
                                "carbs_g": t.carbs_g, "fat_g": t.fat_g}
            except Exception:
                pass
        daily_data = []
        for i in range(7):
            day = week_start + datetime.timedelta(days=i)
            day_str = day.isoformat()
            m = next((r for r in daily_rows if str(r["logged_date"]) == day_str), None)
            ex = exercise_by_day.get(day_str, {})
            daily_data.append({
                "date": day_str, "day_name": day.strftime("%A"),
                "calories": round(float(m["calories"]), 1) if m else 0,
                "protein_g": round(float(m["protein_g"]), 1) if m else 0,
                "carbs_g": round(float(m["carbs_g"]), 1) if m else 0,
                "fat_g": round(float(m["fat_g"]), 1) if m else 0,
                "meal_count": m["meal_count"] if m else 0,
                "calories_burned": float(ex.get("calories_burned", 0)),
                "exercise_minutes": int(ex.get("total_minutes", 0)),
            })
        logged = [d for d in daily_data if d["meal_count"] > 0]
        avg_cal = round(sum(d["calories"] for d in logged) / len(logged), 1) if logged else 0
        avg_prot = round(sum(d["protein_g"] for d in logged) / len(logged), 1) if logged else 0
        avg_carb = round(sum(d["carbs_g"] for d in logged) / len(logged), 1) if logged else 0
        avg_fat = round(sum(d["fat_g"] for d in logged) / len(logged), 1) if logged else 0
        adherence = round(avg_cal / target_calories * 100, 1) if target_calories else 0
        try:
            cursor.execute(
                "INSERT INTO weekly_reports "
                "(user_id,week_start,week_end,avg_calories,avg_protein_g,"
                "avg_carbs_g,avg_fat_g,total_meals,target_calories,adherence_pct) "
                "VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s) "
                "ON DUPLICATE KEY UPDATE avg_calories=VALUES(avg_calories),"
                "avg_protein_g=VALUES(avg_protein_g),avg_carbs_g=VALUES(avg_carbs_g),"
                "avg_fat_g=VALUES(avg_fat_g),total_meals=VALUES(total_meals),"
                "adherence_pct=VALUES(adherence_pct)",
                (user.user_id, week_start.isoformat(), week_end.isoformat(),
                 avg_cal, avg_prot, avg_carb, avg_fat,
                 sum(d["meal_count"] for d in daily_data), target_calories, adherence)
            )
            conn.commit()
        except Exception:
            conn.rollback()
        return {
            "week_start": week_start.isoformat(), "week_end": week_end.isoformat(),
            "daily_data": daily_data,
            "summary": {"avg_calories": avg_cal, "avg_protein_g": avg_prot,
                        "avg_carbs_g": avg_carb, "avg_fat_g": avg_fat,
                        "target_calories": target_calories, "adherence_pct": adherence,
                        "days_logged": len(logged),
                        "total_meals": sum(d["meal_count"] for d in daily_data)},
            "targets": targets_data,
        }
    finally:
        cursor.close()
        conn.close()


@router.post("/exercise/complete")
def complete_exercise(body: dict, user: CurrentUser = Depends(require_roles("trainee"))):
    """
    Log a completed exercise and calculate calories burned.
    Body: { exercise_id, exercise_name, body_part, duration_minutes, sets, reps }
    Calories burned = MET * weight_kg * (duration_minutes / 60)
    MET values: cardio=7, strength=5, yoga=3, rest=2
    """
    body = body or {}
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
            (user.user_id,)
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
        today = datetime.date.today().isoformat()
        cursor.execute(
            "INSERT INTO exercise_logs (user_id, exercise_id, logged_date, duration_minutes, calories_burned, notes) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (user.user_id, exercise_db_id, today, duration_minutes, calories_burned,
             f"Sets: {sets}, Reps: {reps}" if sets or reps else None)
        )
        log_id = cursor.lastrowid
        conn.commit()

        return JSONResponse({
            "id":               log_id,
            "exercise_name":    exercise_name,
            "duration_minutes": duration_minutes,
            "calories_burned":  calories_burned,
            "logged_date":      today,
            "message":          f"Great work! Burned ~{calories_burned} kcal in {duration_minutes} minutes.",
        }, status_code=201)
    except Exception as e:
        conn.rollback()
        return JSONResponse({"error": str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.get("/plan/weekly")
def weekly_meal_plan(user: CurrentUser = Depends(require_roles("trainee"))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        profile = _get_profile(cursor, user.user_id)
        if not profile:
            return JSONResponse({"error": "Complete your profile first"}, status_code=400)
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
        return result
    finally:
        cursor.close()
        conn.close()
