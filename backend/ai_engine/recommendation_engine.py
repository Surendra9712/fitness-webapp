"""
recommendation_engine.py
Hybrid AI: LightGBM model re-ranks knowledge-base candidates.
Context-aware: reads user meal history to avoid repetition.
"""
import random
from typing import Optional
from ai_engine.nutrition_calculator import calculate_nutrition_targets, calculate_meal_distribution
from ai_engine.knowledge_base.nepali_foods import get_foods_by_meal_type, DRY_FRUITS_GRAMS, get_all_tags_index
from ai_engine.integrations import usda, nutritionix, wger, exercisedb
from ai_engine.nlp.pipeline import process_text
from ai_engine.nlp.fuzzy_matcher import fuzzy_match_multiple
from ai_engine.universal_food_lookup import recognize_food

try:
    from ai_engine.ml.predict import rank_meal_candidates, predict_exercise_category, is_loaded as ml_is_loaded
except Exception:
    def ml_is_loaded(): return False
    def rank_meal_candidates(c, m, ctx, top_n=3): return c[:top_n]
    def predict_exercise_category(ctx): return {"category": "cardio_light", "confidence": 0.5, "model": "fallback"}

_FOOD_INDEX = get_all_tags_index()

MEAL_WEIGHT_CLASS = {
    "breakfast": {"class": "light",  "max_calories": 350, "max_fat_g": 12},
    "lunch":     {"class": "heavy",  "min_calories": 350, "max_calories": 700},
    "snack":     {"class": "light",  "max_calories": 220, "max_fat_g": 10},
    "dinner":    {"class": "heavy",  "min_calories": 280, "max_calories": 600},
}


def _passes_weight_class(food, meal_type):
    rule = MEAL_WEIGHT_CLASS.get(meal_type)
    if not rule: return True
    cal = food.get("calories", 0)
    if "max_calories" in rule and cal > rule["max_calories"]: return False
    if "min_calories" in rule and cal < rule["min_calories"]: return False
    if "max_fat_g" in rule and food.get("fat_g", 0) > rule["max_fat_g"]: return False
    return True


def _score_food_fit(food, meal_target, dietary, recently_eaten=None):
    """
    Rule-based scoring used when ML model not loaded.
    recently_eaten: set of food names eaten in last 3 days — penalised.
    """
    score = 50.0
    recently_eaten = recently_eaten or set()

    tp = meal_target.get("protein_g", 0)
    if tp > 0:
        pr = food.get("protein_g", 0) / tp
        score += 20 if 0.7 <= pr <= 1.3 else (10 if pr > 1.3 else 0)
    tc = meal_target.get("calories", 0)
    if tc > 0:
        score += max(0, 20 - abs(food.get("calories", 0) - tc) / tc * 40)

    if dietary.get("is_vegan") and not food.get("is_vegan"): score -= 100
    elif dietary.get("is_vegetarian") and not food.get("is_vegetarian"): score -= 100
    if dietary.get("is_diabetic_friendly") and food.get("sugar_g", 0) > 15: score -= 15

    # Penalise recently eaten foods to encourage variety
    if food.get("name") in recently_eaten:
        score -= 30

    # Add small random variation so results differ each call
    score += random.uniform(-3, 3)

    return round(score, 1)


def recommend_meal_for_type(meal_type, targets, meals_per_day, dietary,
                             preferred_cuisines=None, top_n=3,
                             recently_eaten=None, recently_eaten_detail=None):
    recently_eaten = recently_eaten or set()
    recently_eaten_detail = recently_eaten_detail or {}

    meal_targets = calculate_meal_distribution(targets, meals_per_day)
    # Always have a target for every meal type including snack
    target_for_meal = meal_targets.get(meal_type) or meal_targets.get("lunch")
    if meal_type == "snack" and "snack" not in meal_targets:
        # Calculate snack target as ~15% of daily calories
        target_for_meal = {
            "calories": round(targets.daily_calories * 0.15),
            "protein_g": round(targets.protein_g * 0.10, 1),
            "carbs_g": round(targets.carbs_g * 0.15, 1),
            "fat_g": round(targets.fat_g * 0.10, 1),
        }

    candidates = get_foods_by_meal_type(meal_type)

    # Filter by cuisine preference
    if preferred_cuisines:
        cl = [c.lower() for c in preferred_cuisines]
        filtered = [f for f in candidates if f["cuisine"] in cl]
        candidates = filtered if filtered else candidates

    # Filter by weight class (light/heavy)
    weight_filtered = [f for f in candidates if _passes_weight_class(f, meal_type)]
    candidates = weight_filtered if weight_filtered else candidates

    if ml_is_loaded():
        ml_ctx = {
            "age":            dietary.get("_age", 25),
            "bmi":            dietary.get("_bmi", 22),
            "gender":         dietary.get("_gender", "male"),
            "activity_level": dietary.get("_activity_level", "moderate"),
            "fitness_level":  dietary.get("_fitness_level", "beginner"),
            "goal":           dietary.get("_goal", "maintain"),
            "target_cal":     dietary.get("_target_cal", 2000),
            "calorie_gap":    target_for_meal.get("calories", 0),
            "protein_gap":    target_for_meal.get("protein_g", 0),
            "calorie_ratio":  dietary.get("_calorie_ratio", 0.3),
            "is_vegetarian":  dietary.get("is_vegetarian", False),
            "is_vegan":       dietary.get("is_vegan", False),
            "is_diabetic":    dietary.get("is_diabetic_friendly", False),
            "meals_per_day":  meals_per_day,
        }

        # Build per-food history dict so the model knows
        # how recently each food was eaten (v3 variety features)
        food_history = {}
        if recently_eaten_detail:
            food_history = recently_eaten_detail

        # Pre-filter: remove foods eaten in last 2 days from candidate pool
        # This forces the model to score from a fresh pool each day
        two_day_eaten = {
            name for name, detail in food_history.items()
            if detail.get("days_since", 999) <= 2
        }
        fresh_candidates = [f for f in candidates if f.get("name") not in two_day_eaten]
        pool_to_score = fresh_candidates if len(fresh_candidates) >= top_n else candidates

        # Score the pool with per-food history context
        top_results = rank_meal_candidates(
            pool_to_score, meal_type, ml_ctx,
            top_n=top_n, food_history=food_history
        )
        scoring = "lightgbm_v3"
    else:
        scored = [
            {**f, "ai_score": _score_food_fit(f, target_for_meal, dietary, recently_eaten)}
            for f in candidates
        ]
        scored.sort(key=lambda x: x["ai_score"], reverse=True)
        top_results = [f for f in scored if f["ai_score"] > 0][:top_n]
        scoring = "rule_based"

    if not top_results:
        lookup = recognize_food(f"{meal_type} nepali food")
        if lookup["found"]:
            top_results = [lookup["food"]]

    response = {
        "meal_type":     meal_type,
        "meal_class":    MEAL_WEIGHT_CLASS.get(meal_type, {}).get("class", "balanced"),
        "target":        target_for_meal,
        "recommendations": top_results,
        "scoring_method":  scoring,
        "fallback_used":   False,
    }
    if meal_type == "breakfast":
        response["dry_fruits_addon"] = DRY_FRUITS_GRAMS[:3]
    return response


def recommend_daily_meals(weight_kg, height_cm, age, gender, activity_level, goal,
                           meals_per_day=3, dietary=None, preferred_cuisines=None,
                           recently_eaten=None, recently_eaten_detail=None):
    dietary = dietary or {}
    recently_eaten = recently_eaten or set()
    recently_eaten_detail = recently_eaten_detail or {}
    targets = calculate_nutrition_targets(weight_kg, height_cm, age, gender, activity_level, goal)

    # Inject target_cal into dietary for ML context
    dietary["_target_cal"] = targets.daily_calories

    # Always include all 4 meal types — snack is always available
    meal_types = ["breakfast", "lunch", "snack", "dinner"]

    daily_plan = {
        mt: recommend_meal_for_type(
            mt, targets, meals_per_day, dietary,
            preferred_cuisines,
            recently_eaten=recently_eaten,
            recently_eaten_detail=recently_eaten_detail,
        )
        for mt in meal_types
    }

    return {
        "nutrition_targets": {
            "bmi":            targets.bmi,
            "bmr":            targets.bmr,
            "tdee":           targets.tdee,
            "daily_calories": targets.daily_calories,
            "protein_g":      targets.protein_g,
            "carbs_g":        targets.carbs_g,
            "fat_g":          targets.fat_g,
            "water_ml":       targets.water_ml,
        },
        "meal_plan": daily_plan,
    }


def generate_weekly_plan(weight_kg, height_cm, age, gender, activity_level, goal,
                          meals_per_day=3, dietary=None, preferred_cuisines=None):
    dietary = dietary or {}
    targets = calculate_nutrition_targets(weight_kg, height_cm, age, gender, activity_level, goal)
    meal_types = ["breakfast", "lunch", "snack", "dinner"]
    week = {}
    used = {mt: set() for mt in meal_types}

    for day_num in range(1, 8):
        day_plan = {}
        for mt in meal_types:
            result = recommend_meal_for_type(
                mt, targets, meals_per_day, dietary, preferred_cuisines,
                top_n=6, recently_eaten=used[mt]
            )
            recs = result["recommendations"]
            # Pick the first one not recently used
            fresh = [f for f in recs if f["name"] not in used[mt]]
            chosen = fresh[0] if fresh else (recs[0] if recs else None)
            if chosen:
                used[mt].add(chosen["name"])
                if len(used[mt]) >= len(get_foods_by_meal_type(mt)):
                    used[mt].clear()
            day_plan[mt] = {
                "chosen":       chosen,
                "alternatives": recs[1:3],
                "dry_fruits_addon": result.get("dry_fruits_addon"),
            }
        week[f"day_{day_num}"] = day_plan

    return {
        "nutrition_targets": {
            "bmi": targets.bmi, "bmr": targets.bmr, "tdee": targets.tdee,
            "daily_calories": targets.daily_calories, "protein_g": targets.protein_g,
            "carbs_g": targets.carbs_g, "fat_g": targets.fat_g, "water_ml": targets.water_ml,
        },
        "weekly_plan": week,
    }


def search_food_unified(query, limit=5):
    results, seen = [], set()
    for m in fuzzy_match_multiple(query, _FOOD_INDEX, limit=limit, threshold=70):
        if m["name"] not in seen:
            results.append({**m, "source": "nepali_kb"})
            seen.add(m["name"])
    if len(results) < limit:
        for f in usda.search_food(query, page_size=limit - len(results)):
            if f["name"] not in seen:
                results.append(f)
                seen.add(f["name"])
    if len(results) < limit and nutritionix.is_configured():
        for f in nutritionix.search_instant(query):
            if f["name"] not in seen:
                results.append(f)
                seen.add(f["name"])
    return results[:limit]


def handle_natural_language_query(text, dietary=None):
    dietary = dietary or {}
    nlp_result = process_text(text)
    response = {"nlp_analysis": nlp_result.to_dict(), "result": None}

    if nlp_result.intent == "log_meal" and nlp_result.foods_detected:
        totals = {"calories": 0, "protein_g": 0, "carbs_g": 0, "fat_g": 0, "fiber_g": 0}
        for food in nlp_result.foods_detected:
            for k in totals: totals[k] += food.get(k, 0)
        response["result"] = {
            "type": "logged_meal_nutrition",
            "items": nlp_result.foods_detected,
            "totals": {k: round(v, 1) for k, v in totals.items()},
        }
    elif nlp_result.intent == "log_meal" and not nlp_result.foods_detected:
        lookup = recognize_food(nlp_result.raw_text)
        if lookup["found"]:
            food = lookup["food"]
            response["result"] = {
                "type": "logged_meal_nutrition",
                "items": [food],
                "totals": {k: food.get(k, 0) for k in ("calories","protein_g","carbs_g","fat_g","fiber_g")},
                "fallback_source": lookup["source"],
            }
        else:
            response["result"] = {"type": "not_found", "message": lookup["reason"]}
    elif nlp_result.intent == "get_recommendation":
        meal_type = nlp_result.meal_type or "lunch"
        candidates = get_foods_by_meal_type(meal_type)
        if nlp_result.nutrient_focus:
            reverse = nlp_result.nutrient_direction != "low"
            candidates = sorted(candidates, key=lambda f: f.get(nlp_result.nutrient_focus, 0), reverse=reverse)
        if dietary.get("is_vegan"): candidates = [f for f in candidates if f.get("is_vegan")] or candidates
        elif dietary.get("is_vegetarian"): candidates = [f for f in candidates if f.get("is_vegetarian")] or candidates
        response["result"] = {"type": "recommendation", "meal_type": meal_type, "options": candidates[:5]}
    elif nlp_result.intent == "ask_nutrition_info" and nlp_result.foods_detected:
        response["result"] = {"type": "nutrition_info", "foods": nlp_result.foods_detected}
    else:
        response["result"] = {"type": "unrecognized", "message": "Could not match a food or intent. Try rephrasing."}
    return response


def recommend_exercise(goal, bmi, age, fitness_level, calorie_ratio,
                        activity_level="moderate", today_calories=1200,
                        protein_gap=0, today_protein=60):
    if ml_is_loaded():
        prediction = predict_exercise_category({
            "age": age, "bmi": bmi, "goal": goal, "fitness_level": fitness_level,
            "calorie_ratio": calorie_ratio, "activity_level": activity_level,
            "today_calories": today_calories, "today_protein": today_protein,
        })
        category = prediction["category"]
        pct = round((calorie_ratio - 1) * 100)
        if calorie_ratio > 1.10:
            reason = f"AI model: calorie intake {pct}% over target — {category.replace('_',' ')} recommended (confidence {prediction['confidence']:.0%})."
        elif calorie_ratio < 0.70:
            reason = "AI model: calorie intake significantly below target — rest/recovery recommended."
        else:
            reason = f"AI model recommends {category.replace('_',' ')} based on your profile (confidence {prediction['confidence']:.0%})."
        scoring = prediction["model"]
    else:
        if calorie_ratio < 0.70:
            category, reason = "rest_recovery", "Intake significantly below target — prioritising recovery."
        elif calorie_ratio > 1.35:
            category = "cardio_intense" if fitness_level in ("intermediate","advanced") else "cardio_moderate"
            reason = f"Intake {round((calorie_ratio-1)*100)}% over target — higher-intensity cardio recommended."
        elif calorie_ratio > 1.20:
            category, reason = "cardio_moderate", f"Intake {round((calorie_ratio-1)*100)}% over target — moderate cardio recommended."
        elif calorie_ratio > 1.10:
            category, reason = "cardio_light", "Intake slightly over target — light cardio recommended."
        elif goal == "gain_muscle":
            category = "strength_heavy" if fitness_level in ("intermediate","advanced") else "strength_light"
            reason = "Within target — strength training supports muscle gain."
        else:
            category, reason = "yoga_light", "Within target — light activity recommended for maintenance."
        scoring = "rule_based_fallback"

    exercises = exercisedb.get_exercises_for_category(category, limit_per_part=3)
    for ex in exercises:
        ex["has_animation"] = bool(ex.get("gif_url"))

    return {
        "category":               category,
        "reason":                 reason,
        "scoring_method":         scoring,
        "exercises":              exercises,
        "animated_exercise_count": sum(1 for e in exercises if e["has_animation"]),
        "exercisedb_configured":  exercisedb.is_configured(),
    }


def goal_food_alignment_score(food: dict, goal: str) -> float:
    """
    Returns 0.0–1.0 — how well this food fits the user's goal.
    Exported so predict.py can use it for per-food ML context.
    """
    cal   = food.get("calories", 200)
    prot  = food.get("protein_g", 10)
    carb  = food.get("carbs_g", 30)
    fat   = food.get("fat_g", 10)
    fib   = food.get("fiber_g", 2)
    sugar = food.get("sugar_g", 5)

    if goal == "lose_weight":
        score = 0.0
        if cal < 200: score += 0.35
        elif cal < 350: score += 0.15
        else: score -= 0.20
        if prot > 15: score += 0.25
        if fib > 3: score += 0.20
        if sugar > 20: score -= 0.20
        return max(0.0, min(1.0, score + 0.5))

    elif goal == "gain_muscle":
        score = 0.0
        if prot > 20: score += 0.45
        elif prot > 12: score += 0.25
        else: score -= 0.15
        if carb > 30: score += 0.15
        if cal > 300: score += 0.10
        return max(0.0, min(1.0, score + 0.4))

    elif goal == "maintain":
        score = 0.5
        if 150 < cal < 550: score += 0.20
        if 10 < prot < 35: score += 0.15
        if fib > 2: score += 0.10
        return max(0.0, min(1.0, score))

    elif goal == "improve_health":
        score = 0.0
        if fib > 4: score += 0.30
        if sugar < 10: score += 0.20
        if prot > 10: score += 0.15
        if fat < 15: score += 0.15
        return max(0.0, min(1.0, score + 0.3))

    elif goal == "athletic_performance":
        score = 0.0
        if carb > 40: score += 0.35
        if prot > 15: score += 0.25
        if cal > 350: score += 0.15
        return max(0.0, min(1.0, score + 0.3))

    return 0.5
