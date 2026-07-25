"""
recommendation_engine.py — SmartDiet Pro v4
============================================
Fully cuisine-aware hybrid recommendation engine.
- Nepali cuisine → Nepali Knowledge Base
- International cuisine → USDA FoodData Central
- Mixed → both sources, intelligently rotated

Features:
1.  Cuisine-aware food source selection (Req 1, 15)
2.  AI explanation for every recommendation (Req 13)
3.  Variety enforcement via pre-scoring history filter (Req 10)
4.  Goal-food alignment scoring (Req 8)
5.  Dietary constraint hard filtering (Req 8)
6.  Snack always included regardless of meals_per_day (Req fixed)
7.  Exercise recommendation with MET-based calorie burn (Req 3)
"""
import random
from typing import Optional

from ai_engine.nutrition_calculator import calculate_nutrition_targets, calculate_meal_distribution
from ai_engine.knowledge_base.nepali_foods import (
    NEPALI_FOOD_DB, get_foods_by_meal_type, DRY_FRUITS_GRAMS, get_all_tags_index,
    MULTI_CUISINE_FOODS,
)
from ai_engine.integrations import usda, nutritionix, exercisedb
from ai_engine.nlp.pipeline import process_text
from ai_engine.nlp.fuzzy_matcher import fuzzy_match_multiple
from ai_engine.universal_food_lookup import recognize_food

try:
    from ai_engine.ml.predict import rank_meal_candidates, predict_exercise_category, is_loaded as ml_is_loaded
except Exception:
    def ml_is_loaded(): return False
    def rank_meal_candidates(c, m, ctx, top_n=3, food_history=None): return c[:top_n]
    def predict_exercise_category(ctx): return {"category":"cardio_light","confidence":0.5,"model":"fallback"}

_FOOD_INDEX = get_all_tags_index()

MEAL_WEIGHT_CLASS = {
    "breakfast": {"class":"light",  "max_calories":350, "max_fat_g":12},
    "lunch":     {"class":"heavy",  "min_calories":350, "max_calories":700},
    "snack":     {"class":"light",  "max_calories":220, "max_fat_g":10},
    "dinner":    {"class":"heavy",  "min_calories":280, "max_calories":600},
}

NEPALI_CUISINES      = {"nepali"}
INTERNATIONAL_CUISINES = {
    "italian","chinese","japanese","korean","mexican","thai",
    "mediterranean","american","french","indian",
}


def goal_food_alignment_score(food: dict, goal: str) -> float:
    cal=food.get("calories",200); prot=food.get("protein_g",10)
    carb=food.get("carbs_g",30); fat=food.get("fat_g",10)
    fib=food.get("fiber_g",2); sugar=food.get("sugar_g",5)
    if goal=="lose_weight":
        s=0.0
        if cal<200: s+=0.35
        elif cal<350: s+=0.15
        else: s-=0.20
        if prot>15: s+=0.25
        if fib>3: s+=0.20
        if sugar>20: s-=0.20
        return max(0.0,min(1.0,s+0.5))
    elif goal=="gain_muscle":
        s=0.0
        if prot>20: s+=0.45
        elif prot>12: s+=0.25
        else: s-=0.15
        if carb>30: s+=0.15
        if cal>300: s+=0.10
        return max(0.0,min(1.0,s+0.4))
    elif goal=="maintain":
        s=0.5
        if 150<cal<550: s+=0.20
        if 10<prot<35: s+=0.15
        if fib>2: s+=0.10
        return max(0.0,min(1.0,s))
    elif goal=="improve_health":
        s=0.0
        if fib>4: s+=0.30
        if sugar<10: s+=0.20
        if prot>10: s+=0.15
        if fat<15: s+=0.15
        return max(0.0,min(1.0,s+0.3))
    elif goal=="athletic_performance":
        s=0.0
        if carb>40: s+=0.35
        if prot>15: s+=0.25
        if cal>350: s+=0.15
        return max(0.0,min(1.0,s+0.3))
    return 0.5


def _passes_weight_class(food, meal_type):
    rule=MEAL_WEIGHT_CLASS.get(meal_type)
    if not rule: return True
    cal=food.get("calories",0)
    if "max_calories" in rule and cal>rule["max_calories"]: return False
    if "min_calories" in rule and cal<rule["min_calories"]: return False
    if "max_fat_g" in rule and food.get("fat_g",0)>rule["max_fat_g"]: return False
    return True


def _passes_dietary(food, dietary):
    """Hard dietary constraint check."""
    if dietary.get("is_vegan") and not food.get("is_vegan",False):
        return False
    if dietary.get("is_vegetarian") and not food.get("is_vegetarian",True):
        return False
    if dietary.get("is_diabetic_friendly") and food.get("sugar_g",0)>18:
        return False
    return True


def _build_explanation(food: dict, meal_type: str, cuisine: str,
                        goal: str, source: str, dietary: dict) -> str:
    """
    Req 13: Generate a human-readable explanation for every recommendation.
    """
    name  = food.get("name","this meal")
    cal   = round(food.get("calories",0))
    prot  = round(food.get("protein_g",0))
    align = goal_food_alignment_score(food, goal)

    cuisine_label = cuisine.title() if cuisine else "selected"
    source_label  = "Nepali Food Knowledge Base" if source=="nepali_kb" else "USDA Food Database"

    goal_phrases = {
        "lose_weight":           "supports your weight loss goal with controlled calories",
        "gain_muscle":           "supports your muscle gain goal with high protein content",
        "maintain":              "helps maintain your current weight with balanced macros",
        "improve_health":        "promotes overall health with good fiber and nutrient content",
        "athletic_performance":  "fuels athletic performance with adequate carbs and protein",
    }
    goal_phrase = goal_phrases.get(goal, "aligns with your nutritional goals")

    diet_note = ""
    if dietary.get("is_vegan"):
        diet_note = ", is vegan-friendly"
    elif dietary.get("is_vegetarian"):
        diet_note = ", is vegetarian-friendly"

    match_pct = round(align * 100)

    return (
        f"This {cuisine_label} meal was selected from the {source_label} "
        f"because it matches your cuisine preference, {goal_phrase}, "
        f"provides {cal} kcal and {prot}g protein{diet_note}, "
        f"and has a {match_pct}% goal alignment score."
    )


def _get_candidates_for_cuisine(cuisine: str, meal_type: str,
                                  dietary: dict, recently_eaten: set,
                                  top_n: int = 8) -> list:
    """
    Req 15: Select correct data source based on cuisine.
    Nepali → Knowledge Base, International → USDA.
    """
    cuisine_lower = cuisine.lower()

    if cuisine_lower == "nepali":
        # Use Nepali Knowledge Base
        candidates = [
            f for f in NEPALI_FOOD_DB
            if meal_type in f.get("meal_types",[])
            and f.get("cuisine","nepali") == "nepali"
        ]
        return candidates

    elif cuisine_lower in INTERNATIONAL_CUISINES:
        # First check our local multi-cuisine extension
        local = [
            f for f in MULTI_CUISINE_FOODS
            if f.get("cuisine","") == cuisine_lower
            and meal_type in f.get("meal_types",[])
        ]
        if len(local) >= top_n:
            return local

        # Then fetch from USDA for variety
        usda_foods = usda.get_foods_for_cuisine_meal(
            cuisine_lower, meal_type, dietary, top_n=top_n
        )
        # Merge: local first, then USDA
        seen = {f["name"] for f in local}
        for f in usda_foods:
            if f["name"] not in seen:
                local.append(f)
                seen.add(f["name"])
        return local[:top_n * 2]  # Return more so we have variety

    else:
        # Unknown cuisine — fall back to Nepali KB
        return [f for f in NEPALI_FOOD_DB if meal_type in f.get("meal_types",[])]


def recommend_meal_for_type(meal_type, targets, meals_per_day, dietary,
                              preferred_cuisines=None, top_n=3,
                              recently_eaten=None, recently_eaten_detail=None,
                              goal="maintain", exclude_names=None):
    recently_eaten        = recently_eaten or set()
    recently_eaten_detail = recently_eaten_detail or {}
    exclude_names         = exclude_names or set()
    preferred_cuisines    = [c.lower() for c in (preferred_cuisines or ["nepali"])]

    # Compute meal target
    meal_targets     = calculate_meal_distribution(targets, meals_per_day)
    target_for_meal  = meal_targets.get(meal_type)
    if not target_for_meal:
        # Snack always gets a target
        target_for_meal = {
            "calories": round(targets.daily_calories * 0.15),
            "protein_g": round(targets.protein_g * 0.10, 1),
            "carbs_g":   round(targets.carbs_g * 0.15, 1),
            "fat_g":     round(targets.fat_g * 0.10, 1),
        }

    # ── Req 15: Collect candidates from correct sources per cuisine ───────────
    all_candidates = []
    seen_names     = set()

    # Separate Nepali from international
    nepali_selected = "nepali" in preferred_cuisines
    intl_selected   = [c for c in preferred_cuisines if c != "nepali"]

    # Case 1: Only Nepali
    if nepali_selected and not intl_selected:
        cuisine_source = "nepali"
        candidates = _get_candidates_for_cuisine("nepali", meal_type, dietary, recently_eaten)
        for f in candidates:
            f["_source"] = "nepali_kb"
            f["_cuisine"] = "nepali"
        all_candidates = candidates

    # Case 2: Only International
    elif not nepali_selected and intl_selected:
        cuisine_source = "international"
        for cuisine in intl_selected:
            foods = _get_candidates_for_cuisine(cuisine, meal_type, dietary, recently_eaten, top_n=6)
            for f in foods:
                if f.get("name") not in seen_names:
                    f["_source"]  = "usda" if f.get("source") == "usda" else "local_kb"
                    f["_cuisine"] = cuisine
                    all_candidates.append(f)
                    seen_names.add(f.get("name",""))
        cuisine_source = "international"

    # Case 3: Both Nepali and International
    else:
        cuisine_source = "mixed"
        nepali_foods = _get_candidates_for_cuisine("nepali", meal_type, dietary, recently_eaten)
        for f in nepali_foods:
            if f.get("name") not in seen_names:
                f["_source"]  = "nepali_kb"
                f["_cuisine"] = "nepali"
                all_candidates.append(f)
                seen_names.add(f.get("name",""))

        for cuisine in intl_selected:
            foods = _get_candidates_for_cuisine(cuisine, meal_type, dietary, recently_eaten, top_n=4)
            for f in foods:
                if f.get("name") not in seen_names:
                    f["_source"]  = "usda" if f.get("source") == "usda" else "local_kb"
                    f["_cuisine"] = cuisine
                    all_candidates.append(f)
                    seen_names.add(f.get("name",""))

    # ── Apply dietary hard filters ────────────────────────────────────────────
    eligible = [f for f in all_candidates if _passes_dietary(f, dietary)]
    if not eligible:
        eligible = all_candidates  # relax if nothing passes

    # ── Apply weight class filter ─────────────────────────────────────────────
    weight_ok = [f for f in eligible if _passes_weight_class(f, meal_type)]
    if weight_ok:
        eligible = weight_ok

    # ── Variety: remove foods eaten in last 2 days ────────────────────────────
    two_day_eaten = {
        name for name, detail in recently_eaten_detail.items()
        if detail.get("days_since", 999) <= 2
    }
    fresh = [f for f in eligible if f.get("name") not in two_day_eaten]
    pool  = fresh if len(fresh) >= top_n else eligible

    # ── Cooldown: drop foods already served as a top pick recently ────────────
    # Scoring is deterministic for a given profile, so the same food would win
    # again tomorrow. exclude_names carries the recently-recommended top picks
    # (see routes/ai.py) — relaxed only if it would empty the pool entirely.
    if exclude_names:
        off_cooldown = [f for f in pool if f.get("name") not in exclude_names]
        if off_cooldown:
            pool = off_cooldown

    # ── Score and rank ────────────────────────────────────────────────────────
    if ml_is_loaded():
        ml_ctx = {
            "age":            dietary.get("_age", 25),
            "bmi":            dietary.get("_bmi", 22),
            "gender":         dietary.get("_gender", "male"),
            "activity_level": dietary.get("_activity_level", "moderate"),
            "fitness_level":  dietary.get("_fitness_level", "beginner"),
            "goal":           goal,
            "target_cal":     dietary.get("_target_cal", 2000),
            "calorie_gap":    target_for_meal.get("calories", 0),
            "protein_gap":    target_for_meal.get("protein_g", 0),
            "calorie_ratio":  dietary.get("_calorie_ratio", 0.3),
            "is_vegetarian":  dietary.get("is_vegetarian", False),
            "is_vegan":       dietary.get("is_vegan", False),
            "is_diabetic":    dietary.get("is_diabetic_friendly", False),
            "meals_per_day":  meals_per_day,
        }
        top_results = rank_meal_candidates(
            pool, meal_type, ml_ctx,
            top_n=top_n, food_history=recently_eaten_detail
        )
        scoring = "lightgbm_v3"
    else:
        scored = []
        for f in pool:
            s = 50.0
            fname = f.get("name","")
            align = goal_food_alignment_score(f, goal)
            s += align * 30
            hist = recently_eaten_detail.get(fname, {})
            days_since = hist.get("days_since", 999)
            times_week = hist.get("times_week", 0)
            if days_since == 999: s += 20
            elif days_since >= 7: s += 15
            elif days_since >= 3: s += 5
            elif days_since >= 1: s -= 15
            s -= times_week * 12
            s += random.uniform(-3, 3)
            scored.append({**f, "ai_score": round(s/100, 3)})
        scored.sort(key=lambda x: x["ai_score"], reverse=True)
        top_results = [f for f in scored if f.get("ai_score",0) > 0][:top_n]
        scoring = "rule_based_v4"

    # ── Req 13: Add AI explanation to each recommendation ────────────────────
    for food in top_results:
        food["ai_explanation"] = _build_explanation(
            food, meal_type,
            food.get("_cuisine", preferred_cuisines[0] if preferred_cuisines else "nepali"),
            goal,
            food.get("_source", "nepali_kb"),
            dietary,
        )

    # Fallback
    if not top_results:
        fallback = recognize_food(f"healthy {meal_type} food")
        if fallback["found"]:
            f = fallback["food"]
            f["ai_explanation"] = f"Fallback recommendation for {meal_type}."
            top_results = [f]

    response = {
        "meal_type":       meal_type,
        "meal_class":      MEAL_WEIGHT_CLASS.get(meal_type,{}).get("class","balanced"),
        "target":          target_for_meal,
        "recommendations": top_results,
        "scoring_method":  scoring,
        "cuisine_source":  cuisine_source,
        "cuisines_used":   list(set(f.get("_cuisine","nepali") for f in top_results)),
    }
    if meal_type == "breakfast":
        response["dry_fruits_addon"] = DRY_FRUITS_GRAMS[:3]
    return response


def recommend_daily_meals(weight_kg, height_cm, age, gender, activity_level, goal,
                            meals_per_day=3, dietary=None, preferred_cuisines=None,
                            recently_eaten=None, recently_eaten_detail=None,
                            exclude_names=None):
    dietary               = dietary or {}
    recently_eaten        = recently_eaten or set()
    recently_eaten_detail = recently_eaten_detail or {}
    exclude_names         = set(exclude_names or set())
    targets = calculate_nutrition_targets(weight_kg, height_cm, age, gender, activity_level, goal)
    dietary["_target_cal"] = targets.daily_calories

    # Always recommend all 4 meal types (Req snack fix). Processed sequentially,
    # feeding each pick forward into the next meal type's history as if it had
    # just been eaten (days_since=0). This reuses the same variety-aware
    # scoring already applied to real meal-log history (both the ML model and
    # the rule-based fallback already deprioritize a days_since=0 food) —
    # so a same-day repeat is naturally discouraged but still allowed when
    # it's genuinely the best fit (e.g. dal-bhat for both lunch and dinner),
    # rather than being forcibly banned outright.
    daily_plan  = {}
    today_detail = dict(recently_eaten_detail)
    for mt in ["breakfast", "lunch", "snack", "dinner"]:
        result = recommend_meal_for_type(
            mt, targets, meals_per_day, dietary,
            preferred_cuisines, top_n=3,
            recently_eaten=recently_eaten,
            recently_eaten_detail=today_detail,
            goal=goal,
            exclude_names=exclude_names,
        )
        daily_plan[mt] = result
        top_pick = result["recommendations"][0].get("name") if result["recommendations"] else None
        if top_pick:
            prev = today_detail.get(top_pick, {})
            today_detail = {
                **today_detail,
                top_pick: {
                    "days_since":  0,
                    "times_week":  prev.get("times_week", 0) + 1,
                    "times_total": prev.get("times_total", 0) + 1,
                },
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
    dietary["_target_cal"] = targets.daily_calories
    week = {}
    used = {mt: set() for mt in ["breakfast","lunch","snack","dinner"]}

    for day_num in range(1, 8):
        day_plan = {}
        for mt in ["breakfast","lunch","snack","dinner"]:
            result = recommend_meal_for_type(
                mt, targets, meals_per_day, dietary,
                preferred_cuisines, top_n=6,
                recently_eaten=used[mt], goal=goal,
            )
            recs   = result["recommendations"]
            fresh  = [f for f in recs if f.get("name") not in used[mt]]
            chosen = fresh[0] if fresh else (recs[0] if recs else None)
            if chosen:
                used[mt].add(chosen.get("name",""))
                if len(used[mt]) >= 20:
                    used[mt].clear()
            day_plan[mt] = {
                "chosen":        chosen,
                "alternatives":  recs[1:3],
                "dry_fruits_addon": result.get("dry_fruits_addon"),
            }
        week[f"day_{day_num}"] = day_plan

    return {
        "nutrition_targets": {
            "bmi": targets.bmi, "bmr": targets.bmr, "tdee": targets.tdee,
            "daily_calories": targets.daily_calories,
            "protein_g": targets.protein_g, "carbs_g": targets.carbs_g,
            "fat_g": targets.fat_g, "water_ml": targets.water_ml,
        },
        "weekly_plan": week,
    }


def search_food_unified(query, limit=5):
    results, seen = [], set()
    for m in fuzzy_match_multiple(query, _FOOD_INDEX, limit=limit, threshold=70):
        if m["name"] not in seen:
            results.append({**m, "source":"nepali_kb"})
            seen.add(m["name"])
    if len(results) < limit:
        for f in usda.search_food(query, page_size=limit-len(results)):
            if f["name"] not in seen:
                results.append(f); seen.add(f["name"])
    if len(results) < limit and nutritionix.is_configured():
        for f in nutritionix.search_instant(query):
            if f["name"] not in seen:
                results.append(f); seen.add(f["name"])
    return results[:limit]


def handle_natural_language_query(text, dietary=None):
    dietary    = dietary or {}
    nlp_result = process_text(text)
    response   = {"nlp_analysis": nlp_result.to_dict(), "result": None}
    if nlp_result.intent == "log_meal" and nlp_result.foods_detected:
        totals = {"calories":0,"protein_g":0,"carbs_g":0,"fat_g":0,"fiber_g":0}
        for food in nlp_result.foods_detected:
            for k in totals: totals[k] += food.get(k,0)
        response["result"] = {"type":"logged_meal_nutrition","items":nlp_result.foods_detected,
                               "totals":{k:round(v,1) for k,v in totals.items()}}
    elif nlp_result.intent == "log_meal" and not nlp_result.foods_detected:
        lookup = recognize_food(nlp_result.raw_text)
        if lookup["found"]:
            food = lookup["food"]
            response["result"] = {"type":"logged_meal_nutrition","items":[food],
                                   "totals":{k:food.get(k,0) for k in ("calories","protein_g","carbs_g","fat_g","fiber_g")}}
        else:
            response["result"] = {"type":"not_found","message":lookup["reason"]}
    elif nlp_result.intent == "get_recommendation":
        meal_type  = nlp_result.meal_type or "lunch"
        candidates = get_foods_by_meal_type(meal_type)
        if dietary.get("is_vegan"): candidates=[f for f in candidates if f.get("is_vegan")] or candidates
        elif dietary.get("is_vegetarian"): candidates=[f for f in candidates if f.get("is_vegetarian")] or candidates
        response["result"] = {"type":"recommendation","meal_type":meal_type,"options":candidates[:5]}
    else:
        response["result"] = {"type":"unrecognized","message":"Could not match a food or intent. Try rephrasing."}
    return response


def recommend_exercise(goal, bmi, age, fitness_level, calorie_ratio,
                        activity_level="moderate", today_calories=1200,
                        protein_gap=0, today_protein=60, days_exercised_this_week=0,
                        recently_done=None):
    if ml_is_loaded():
        prediction = predict_exercise_category({
            "age":age,"bmi":bmi,"goal":goal,"fitness_level":fitness_level,
            "calorie_ratio":calorie_ratio,"activity_level":activity_level,
            "today_calories":today_calories,"today_protein":today_protein,
            "days_exercised_this_week":days_exercised_this_week,
        })
        category = prediction["category"]
        pct      = round((calorie_ratio-1)*100)
        if calorie_ratio>1.10:
            reason = f"AI model: calorie intake {pct}% over target — {category.replace('_',' ')} recommended (confidence {prediction['confidence']:.0%})."
        elif calorie_ratio<0.70:
            reason = "AI model: calorie intake significantly below target — rest/recovery recommended."
        else:
            reason = f"AI model recommends {category.replace('_',' ')} based on your profile (confidence {prediction['confidence']:.0%})."
        scoring = prediction["model"]
    else:
        if days_exercised_this_week >= 5: category,reason = "rest_recovery","Already exercised 5+ days this week — rest recommended."
        elif calorie_ratio<0.70: category,reason = "rest_recovery","Intake significantly below target — prioritising recovery."
        elif calorie_ratio>1.35:
            category = "cardio_intense" if fitness_level in("intermediate","advanced") else "cardio_moderate"
            reason = f"Intake {round((calorie_ratio-1)*100)}% over target — higher-intensity cardio recommended."
        elif calorie_ratio>1.20: category,reason = "cardio_moderate",f"Intake {round((calorie_ratio-1)*100)}% over target."
        elif calorie_ratio>1.10: category,reason = "cardio_light","Intake slightly over target — light cardio recommended."
        elif goal=="gain_muscle":
            category = "strength_heavy" if fitness_level in("intermediate","advanced") else "strength_light"
            reason = "Within target — strength training supports muscle gain."
        else: category,reason = "yoga_light","Within target — light activity recommended."
        scoring = "rule_based_v4"

    exercises = exercisedb.get_exercises_for_category(category, limit_per_part=3, recently_done=recently_done)
    for ex in exercises:
        ex["has_animation"] = bool(ex.get("gif_url"))
    return {
        "category":category,"reason":reason,"scoring_method":scoring,
        "exercises":exercises,
        "animated_exercise_count":sum(1 for e in exercises if e["has_animation"]),
        "exercisedb_configured":exercisedb.is_configured(),
    }
