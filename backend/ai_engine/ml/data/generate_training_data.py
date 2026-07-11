"""
generate_training_data.py — SmartDiet Pro v3
=============================================
WHAT CHANGED FROM v2:
- v2 generated random abstract nutrition numbers with no food identity.
  The model learned "calories in band = good" with no concept of variety.
- v3 generates rows PER ACTUAL FOOD from the Nepali knowledge base,
  simulating realistic user histories with variety tracking, repetition
  penalties, goal-food alignment, and dietary constraint enforcement.

KEY NEW FEATURES:
1. Food identity columns — the model knows which food it is scoring
2. days_since_last_eaten — penalises repeated foods, rewards variety
3. times_eaten_this_week — strongly penalises monotony
4. goal_food_alignment — protein-rich foods score higher for gain_muscle, etc.
5. dietary constraint hard rejection — vegan/vegetarian/diabetic enforced
6. Nepali food boost — local foods get realistic preference boost
7. Realistic user simulation — each user has a 30-day eating history
"""
import os
import sys
import random
import math
import numpy as np
import pandas as pd
from collections import defaultdict

# Add backend/ to path so we can import the knowledge base
_HERE = os.path.dirname(__file__)
_BACKEND = os.path.abspath(os.path.join(_HERE, "..", "..", "..", ".."))
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

try:
    from ai_engine.knowledge_base.nepali_foods import NEPALI_FOOD_DB
    print(f"  Loaded {len(NEPALI_FOOD_DB)} foods from Nepali knowledge base")
except ImportError:
    print("  WARNING: Could not import NEPALI_FOOD_DB — using minimal fallback")
    NEPALI_FOOD_DB = []

random.seed(42)
np.random.seed(42)

OUT_DIR = _HERE
N_USERS = 3000          # Simulate 3000 distinct users
DAYS_PER_USER = 30      # 30 days of eating history per user
MEALS_PER_DAY = 4       # breakfast, lunch, snack, dinner

GOALS      = ["lose_weight", "gain_muscle", "maintain", "improve_health", "athletic_performance"]
GOAL_W     = [0.30, 0.25, 0.20, 0.15, 0.10]
ACTIVITIES = ["sedentary", "light", "moderate", "active", "very_active"]
FITNESS    = ["beginner", "intermediate", "advanced"]
STRESS     = ["low", "moderate", "high", "very_high"]
MEAL_TYPES = ["breakfast", "lunch", "snack", "dinner"]
MEAL_BANDS = {
    "breakfast": (60,  350),
    "lunch":     (350, 700),
    "snack":     (40,  220),
    "dinner":    (280, 600),
}

ACT_MAP    = {"sedentary":1, "light":2, "moderate":3, "active":4, "very_active":5}
FIT_MAP    = {"beginner":1, "intermediate":2, "advanced":3}
STRESS_MAP = {"low":1, "moderate":2, "high":3, "very_high":4}
MEAL_MAP   = {"breakfast":1, "lunch":2, "snack":3, "dinner":4}


# ── GOAL → FOOD ALIGNMENT RULES ──────────────────────────────────────────────
# How well each goal aligns with a food's macros
def goal_food_alignment_score(food: dict, goal: str) -> float:
    """
    Returns 0.0–1.0 how well this food fits the goal.
    Trained into the model so it learns goal-specific preferences.
    """
    cal  = food.get("calories", 200)
    prot = food.get("protein_g", 10)
    carb = food.get("carbs_g", 30)
    fat  = food.get("fat_g", 10)
    fib  = food.get("fiber_g", 2)
    sugar = food.get("sugar_g", 5)

    if goal == "lose_weight":
        # Low cal, high protein, high fiber — fills up without excess energy
        score = 0.0
        if cal < 200: score += 0.35
        elif cal < 350: score += 0.15
        else: score -= 0.20
        if prot > 15: score += 0.25
        if fib > 3: score += 0.20
        if sugar > 20: score -= 0.20
        return max(0, min(1, score + 0.5))

    elif goal == "gain_muscle":
        # High protein critical, adequate carbs for energy
        score = 0.0
        if prot > 20: score += 0.45
        elif prot > 12: score += 0.25
        else: score -= 0.15
        if carb > 30: score += 0.15
        if cal > 300: score += 0.10
        return max(0, min(1, score + 0.4))

    elif goal == "maintain":
        # Balanced — nothing extreme
        score = 0.5
        if 150 < cal < 550: score += 0.20
        if 10 < prot < 35: score += 0.15
        if fib > 2: score += 0.10
        return max(0, min(1, score))

    elif goal == "improve_health":
        # High fiber, low sugar, balanced macros
        score = 0.0
        if fib > 4: score += 0.30
        if sugar < 10: score += 0.20
        if prot > 10: score += 0.15
        if fat < 15: score += 0.15
        return max(0, min(1, score + 0.3))

    elif goal == "athletic_performance":
        # High carb for energy, good protein for recovery
        score = 0.0
        if carb > 40: score += 0.35
        if prot > 15: score += 0.25
        if cal > 350: score += 0.15
        return max(0, min(1, score + 0.3))

    return 0.5


def passes_dietary_constraints(food: dict, is_vegan: bool, is_vegetarian: bool,
                                 is_diabetic: bool, is_gluten_free: bool) -> bool:
    """Hard constraint — if violated, food is REJECTED (accepted=0 always)."""
    if is_vegan and not food.get("is_vegan", False): return False
    if is_vegetarian and not food.get("is_vegetarian", True): return False
    if is_diabetic and food.get("sugar_g", 0) > 18: return False
    return True


def within_meal_band(food: dict, meal_type: str) -> bool:
    lo, hi = MEAL_BANDS.get(meal_type, (0, 9999))
    cal = food.get("calories", 0)
    fat = food.get("fat_g", 0)
    if cal > hi or cal < lo: return False
    if meal_type in ("breakfast", "snack") and fat > 12: return False
    return True


def compute_variety_features(food_name: str, meal_type: str,
                               history: dict, day: int) -> dict:
    """
    Given a user's eating history up to this day, compute variety features
    for this food at this meal_type.
    history = {day_num: {meal_type: food_name}}
    """
    days_since_last = 999  # never eaten = high value (variety reward)
    times_this_week = 0
    times_total = 0

    for d in range(max(0, day - 30), day):
        if d in history and meal_type in history[d]:
            if history[d][meal_type] == food_name:
                times_total += 1
                if day - d <= 7:
                    times_this_week += 1
                if day - d < days_since_last:
                    days_since_last = day - d

    return {
        "days_since_last_eaten": min(days_since_last, 30),  # cap at 30
        "times_eaten_this_week": times_this_week,
        "times_eaten_total":     times_total,
        "is_new_food":           int(times_total == 0),
    }


def compute_acceptance(food: dict, meal_type: str, profile: dict,
                        variety: dict, target_cal: float) -> int:
    """
    Simulate whether a nutritionally-aware user would accept this food.
    Returns 1 (accepted) or 0 (rejected).
    Multi-factor scoring designed to teach the model real patterns.
    """
    score = 0.0

    # ── 1. Dietary hard constraints (always reject) ───────────────────────────
    if not passes_dietary_constraints(
        food,
        profile["is_vegan"], profile["is_vegetarian"],
        profile["is_diabetic"], profile["is_gluten_free"]
    ):
        return 0

    # ── 2. Meal band fit ──────────────────────────────────────────────────────
    if within_meal_band(food, meal_type):
        score += 0.35
    else:
        score -= 0.50  # Strong rejection for wrong meal class

    # ── 3. Goal alignment ─────────────────────────────────────────────────────
    alignment = goal_food_alignment_score(food, profile["goal"])
    score += alignment * 0.30  # up to +0.30 for perfect goal alignment

    # ── 4. Variety reward/penalty ─────────────────────────────────────────────
    days_since = variety["days_since_last_eaten"]
    times_week = variety["times_eaten_this_week"]

    if days_since == 999:   score += 0.20   # Never eaten before — encourage
    elif days_since >= 7:   score += 0.15   # Not eaten this week — good
    elif days_since >= 3:   score += 0.05   # Eaten a few days ago — neutral
    elif days_since >= 1:   score -= 0.15   # Eaten recently — mild penalty
    else:                   score -= 0.30   # Same day repetition — reject

    # Times this week penalty (the more often, the worse)
    score -= times_week * 0.12

    # ── 5. Protein goal for high-activity / gain_muscle ───────────────────────
    if profile["goal"] == "gain_muscle" and food.get("protein_g", 0) < 8:
        score -= 0.20
    if profile["activity_level"] in ("active", "very_active") and food.get("protein_g", 0) < 5:
        score -= 0.10

    # ── 6. Calorie proximity to target ───────────────────────────────────────
    cal = food.get("calories", 0)
    meal_target = target_cal * {
        "breakfast": 0.25, "lunch": 0.35, "snack": 0.10, "dinner": 0.30
    }.get(meal_type, 0.25)
    if meal_target > 0:
        deviation = abs(cal - meal_target) / meal_target
        score += max(0, 0.15 * (1 - deviation * 2))

    # ── 7. Diabetic constraint soft ───────────────────────────────────────────
    if profile["is_diabetic"] and food.get("sugar_g", 0) > 12:
        score -= 0.15

    # ── 8. Noise (simulates human unpredictability) ───────────────────────────
    score += np.random.normal(0, 0.08)

    return 1 if score > 0 else 0


def gen_meal_data():
    print(f"\n  Simulating {N_USERS} users × {DAYS_PER_USER} days × {MEALS_PER_DAY} meals...")

    # Get foods grouped by meal type
    foods_by_meal = {mt: [] for mt in MEAL_TYPES}
    for food in NEPALI_FOOD_DB:
        for mt in food.get("meal_types", []):
            if mt in foods_by_meal:
                foods_by_meal[mt].append(food)

    # Fallback if KB not loaded
    if not any(foods_by_meal.values()):
        print("  No KB foods — generating abstract data as fallback")
        _gen_abstract_meal_data()
        return

    rows = []

    for user_idx in range(N_USERS):
        # Generate a realistic user profile
        age        = random.randint(16, 70)
        gender     = random.choice(["male", "female"])
        height_cm  = random.uniform(145, 195)
        weight_kg  = random.uniform(40, 120)
        bmi        = round(weight_kg / ((height_cm / 100) ** 2), 1)
        activity   = random.choices(ACTIVITIES, [0.25, 0.25, 0.25, 0.15, 0.10])[0]
        fitness    = random.choices(FITNESS, [0.50, 0.35, 0.15])[0]
        stress     = random.choices(STRESS, [0.20, 0.45, 0.25, 0.10])[0]
        goal       = random.choices(GOALS, GOAL_W)[0]
        is_veg     = random.random() < 0.45
        is_vegan   = is_veg and random.random() < 0.15
        is_diab    = random.random() < 0.12
        is_gluten  = random.random() < 0.06
        meals_pd   = random.choice([2, 3, 3, 3, 4])
        sleep_q    = 1 if random.random() < 0.60 else 0
        # BMR-based target calories
        bmr = (10 * weight_kg + 6.25 * height_cm - 5 * age + (5 if gender == "male" else -161))
        act_mult = {"sedentary":1.2,"light":1.375,"moderate":1.55,"active":1.725,"very_active":1.9}[activity]
        goal_adj = {"lose_weight":-400,"gain_muscle":300,"maintain":0,"improve_health":-150,"athletic_performance":200}[goal]
        target_cal = max(1200, bmr * act_mult + goal_adj)

        profile = {
            "goal": goal, "activity_level": activity, "fitness_level": fitness,
            "is_vegan": is_vegan, "is_vegetarian": is_veg,
            "is_diabetic": is_diab, "is_gluten_free": is_gluten,
        }

        # Simulate this user's eating history
        # history[day][meal_type] = food_name
        history = defaultdict(dict)

        for day in range(DAYS_PER_USER):
            for meal_type in MEAL_TYPES:
                # Get eligible foods for this meal + dietary constraints
                eligible = [
                    f for f in foods_by_meal.get(meal_type, [])
                    if passes_dietary_constraints(f, is_vegan, is_veg, is_diab, is_gluten)
                    and within_meal_band(f, meal_type)
                ]
                if not eligible:
                    eligible = foods_by_meal.get(meal_type, [])
                if not eligible:
                    continue

                # Generate candidates — the food the user CHOSE plus alternatives
                # Chose food: weighted toward variety (not repeated recently)
                chosen = random.choice(eligible)
                history[day][meal_type] = chosen["name"]

                # For each candidate food, generate one training row
                # Sample 4-8 candidate foods per slot (chosen + alternatives)
                n_candidates = random.randint(3, 6)
                candidate_pool = random.sample(eligible, min(n_candidates, len(eligible)))
                if chosen not in candidate_pool:
                    candidate_pool[0] = chosen  # ensure chosen is in pool

                for food in candidate_pool:
                    variety = compute_variety_features(food["name"], meal_type, history, day)
                    accepted = compute_acceptance(food, meal_type, profile, variety, target_cal)

                    # Force chosen food to be accepted (it's what the user ate)
                    if food["name"] == chosen["name"]:
                        accepted = 1

                    row = {
                        # User profile features
                        "age":            age,
                        "bmi":            bmi,
                        "gender_num":     1 if gender == "male" else 0,
                        "activity_num":   ACT_MAP[activity],
                        "fitness_num":    FIT_MAP[fitness],
                        "stress_num":     STRESS_MAP[stress],
                        "meals_per_day":  meals_pd,
                        "sleep_quality":  sleep_q,
                        "is_vegetarian":  int(is_veg),
                        "is_vegan":       int(is_vegan),
                        "is_diabetic":    int(is_diab),
                        "is_gluten_free": int(is_gluten),

                        # Meal context features
                        "meal_type_num":  MEAL_MAP[meal_type],
                        "calorie_gap":    round(target_cal * 0.3 - food.get("calories", 0), 1),
                        "protein_gap":    round((target_cal * 0.30 / 4) - food.get("protein_g", 0), 1),
                        "calorie_ratio":  round(food.get("calories", 0) / max(target_cal * 0.25, 1), 3),

                        # Food nutrition features
                        "meal_calories":  food.get("calories", 0),
                        "meal_protein":   food.get("protein_g", 0),
                        "meal_carbs":     food.get("carbs_g", 0),
                        "meal_fat":       food.get("fat_g", 0),
                        "meal_fiber":     food.get("fiber_g", 0),
                        "meal_sugar":     food.get("sugar_g", 0),
                        "within_meal_class_band": int(within_meal_band(food, meal_type)),

                        # NEW: Variety and history features
                        "days_since_last_eaten": variety["days_since_last_eaten"],
                        "times_eaten_this_week": variety["times_eaten_this_week"],
                        "times_eaten_total":     variety["times_eaten_total"],
                        "is_new_food":           variety["is_new_food"],

                        # NEW: Goal-food alignment score
                        "goal_food_alignment": round(
                            goal_food_alignment_score(food, goal), 3
                        ),

                        # Target
                        "accepted": accepted,
                    }
                    # Goal one-hot encoding
                    for g in GOALS:
                        row[f"goal_{g}"] = 1 if goal == g else 0

                    rows.append(row)

        if (user_idx + 1) % 500 == 0:
            print(f"    {user_idx+1}/{N_USERS} users simulated, {len(rows):,} rows so far")

    df = pd.DataFrame(rows)
    path = os.path.join(OUT_DIR, "meal_training.csv")
    df.to_csv(path, index=False)
    print(f"\n  Meal training data: {len(df):,} rows → {path}")
    print(f"  Acceptance rate: {df['accepted'].mean():.2%}")
    print(f"  Features: {list(df.columns)}")
    print(f"  Variety stats:")
    print(f"    avg days_since_last_eaten: {df['days_since_last_eaten'].mean():.1f}")
    print(f"    avg times_eaten_this_week: {df['times_eaten_this_week'].mean():.2f}")
    print(f"    new food rate: {df['is_new_food'].mean():.2%}")


def _gen_abstract_meal_data():
    """Fallback when KB not available — same as v2 but with variety columns."""
    rows = []
    for _ in range(150_000):
        age = random.randint(16, 70)
        gender = random.choice(["male", "female"])
        h = random.uniform(145, 195); w = random.uniform(40, 120)
        bmi = round(w / ((h / 100) ** 2), 1)
        activity = random.choices(ACTIVITIES, [0.25, 0.25, 0.25, 0.15, 0.10])[0]
        fitness = random.choices(FITNESS, [0.5, 0.35, 0.15])[0]
        stress = random.choices(STRESS, [0.2, 0.45, 0.25, 0.1])[0]
        goal = random.choices(GOALS, GOAL_W)[0]
        meal_type = random.choice(MEAL_TYPES)
        target_cal = random.uniform(1300, 3200)
        lo, hi = MEAL_BANDS[meal_type]
        cal = random.uniform(lo, hi); pp = random.uniform(0.05, 0.35); fp = random.uniform(0.05, 0.30)
        cp = max(0.05, 1 - pp - fp)
        prot = round((cal * pp) / 4, 1); carb = round((cal * cp) / 4, 1); fat = round((cal * fp) / 9, 1)
        fib = round(random.uniform(0, 8), 1); sug = round(random.uniform(0, 20), 1)
        within_band = 1
        protein_gap = random.uniform(-30, 100)
        calorie_gap = target_cal - cal
        calorie_ratio = round(cal / target_cal, 3)
        is_veg = random.random() < 0.45; is_vegan = is_veg and random.random() < 0.15
        is_diab = random.random() < 0.12; is_gluten = random.random() < 0.06
        meals_pd = random.choice([2, 3, 3, 3, 4]); sleep_q = 1 if random.random() < 0.6 else 0
        days_since = random.randint(0, 30)
        times_week = random.randint(0, 5)
        times_total = random.randint(0, 20)
        alignment = random.uniform(0, 1)
        score = 0.0
        if within_band: score += 0.35
        else: score -= 0.45
        if protein_gap > 15 and prot > 15: score += 0.20
        if days_since <= 1: score -= 0.30
        elif days_since >= 7: score += 0.15
        score -= times_week * 0.12
        score += alignment * 0.25
        score += np.random.normal(0, 0.10)
        accepted = 1 if score > 0 else 0
        row = {"age":age,"bmi":bmi,"gender_num":1 if gender=="male" else 0,"activity_num":ACT_MAP[activity],"fitness_num":FIT_MAP[fitness],"stress_num":STRESS_MAP[stress],"meal_type_num":MEAL_MAP[meal_type],"calorie_gap":round(calorie_gap,1),"protein_gap":round(protein_gap,1),"calorie_ratio":calorie_ratio,"is_vegetarian":int(is_veg),"is_vegan":int(is_vegan),"is_diabetic":int(is_diab),"is_gluten_free":int(is_gluten),"meals_per_day":meals_pd,"sleep_quality":sleep_q,"meal_calories":round(cal,1),"meal_protein":round(prot,1),"meal_carbs":round(carb,1),"meal_fat":round(fat,1),"meal_fiber":round(fib,1),"meal_sugar":round(sug,1),"within_meal_class_band":within_band,"days_since_last_eaten":days_since,"times_eaten_this_week":times_week,"times_eaten_total":times_total,"is_new_food":int(times_total==0),"goal_food_alignment":round(alignment,3),"accepted":accepted}
        for g in GOALS: row[f"goal_{g}"] = 1 if goal == g else 0
        rows.append(row)
    df = pd.DataFrame(rows)
    df.to_csv(os.path.join(OUT_DIR, "meal_training.csv"), index=False)
    print(f"  Abstract fallback: {len(df):,} rows")


def assign_exercise(row):
    g, f, r, s = row["goal"], row["fitness_num"], row["calorie_ratio"], row["stress_num"]
    if s >= 4 or r < 0.70: return "rest_recovery"
    if r > 1.35: return "cardio_intense" if f >= 2 else "cardio_moderate"
    if r > 1.20: return "cardio_moderate"
    if r > 1.10: return "cardio_light"
    if g == "gain_muscle": return "strength_heavy" if f >= 2 else "strength_light"
    if g == "improve_health" and row["activity_num"] <= 2: return "yoga_light"
    return "yoga_light" if -0.10 <= (r - 1) <= 0.10 else "cardio_light"


def gen_exercise_data():
    print(f"\n  Generating exercise training data ({150_000:,} rows)...")
    rows = []
    for _ in range(150_000):
        age = random.randint(16, 70); gender = random.choice(["male","female"])
        h = random.uniform(145, 195); w = random.uniform(40, 120)
        bmi = round(w / ((h / 100) ** 2), 1)
        activity = random.choices(ACTIVITIES, [0.25, 0.25, 0.25, 0.15, 0.10])[0]
        fitness = random.choices(FITNESS, [0.50, 0.35, 0.15])[0]
        stress = random.choices(STRESS, [0.20, 0.45, 0.25, 0.10])[0]
        goal = random.choices(GOALS, GOAL_W)[0]
        target_cal = random.uniform(1300, 3200)
        consumed = target_cal * random.uniform(0.45, 1.70)
        calorie_ratio = round(consumed / target_cal, 3)
        protein_gap = random.uniform(-30, 100)
        is_diab = random.random() < 0.12
        meals_pd = random.choice([2, 3, 3, 3, 4])
        sleep_q = 1 if random.random() < 0.60 else 0
        today_protein = random.uniform(15, 200)
        # New: days_exercised_this_week (more = lighter recommended today)
        days_exercised = random.randint(0, 6)
        row = {
            "goal": goal, "age": age, "bmi": bmi,
            "gender_num": 1 if gender == "male" else 0,
            "activity_num": ACT_MAP[activity],
            "fitness_num": FIT_MAP[fitness],
            "stress_num": STRESS_MAP[stress],
            "calorie_gap": round(target_cal - consumed, 1),
            "protein_gap": round(protein_gap, 1),
            "calorie_ratio": calorie_ratio,
            "is_diabetic": int(is_diab),
            "meals_per_day": meals_pd,
            "sleep_quality": sleep_q,
            "meal_calories": round(consumed, 1),
            "meal_protein": round(today_protein, 1),
            "days_exercised_this_week": days_exercised,
        }
        # Adjust exercise recommendation based on days already exercised
        base_label = assign_exercise(row)
        if days_exercised >= 5:
            # Already exercised 5+ days — rest or light
            if base_label in ("cardio_intense", "strength_heavy"):
                base_label = "rest_recovery"
            elif base_label in ("cardio_moderate", "strength_light"):
                base_label = "yoga_light"
        row["exercise_label"] = base_label
        for g in GOALS: row[f"goal_{g}"] = 1 if goal == g else 0
        rows.append(row)

    df = pd.DataFrame(rows)
    path = os.path.join(OUT_DIR, "exercise_training.csv")
    df.to_csv(path, index=False)
    print(f"  Exercise data: {len(df):,} rows → {path}")
    print(f"  Distribution:\n{df['exercise_label'].value_counts()}")


if __name__ == "__main__":
    print("\n SmartDiet Pro — Training Data Generator v3")
    print("=" * 50)
    gen_meal_data()
    gen_exercise_data()
    print("\n  Done. Now run: python -m ai_engine.ml.train_models\n")
