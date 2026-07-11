"""
train_models.py — SmartDiet Pro v3
===================================
Trains LightGBM models using the v3 training data which includes:
- days_since_last_eaten   (variety enforcement)
- times_eaten_this_week  (monotony penalty)
- times_eaten_total      (novelty reward)
- is_new_food            (new food bonus)
- goal_food_alignment    (goal-specific scoring)
- meal_sugar             (diabetic/health constraint)

Run from backend/:
    python -m ai_engine.ml.train_models
"""
import os
import joblib
import pandas as pd
from datetime import date
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import lightgbm as lgb

BASE_DIR  = os.path.dirname(__file__)
DATA_DIR  = os.path.join(BASE_DIR, "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")
os.makedirs(MODEL_DIR, exist_ok=True)

GOAL_COLS = [
    "goal_lose_weight", "goal_gain_muscle", "goal_maintain",
    "goal_improve_health", "goal_athletic_performance",
]

# ── V3 MEAL FEATURE COLUMNS ──────────────────────────────────────────────────
# Includes all v2 columns + new variety/history/alignment columns
MEAL_FEATURE_COLS = [
    # User profile
    "age", "bmi", "gender_num", "activity_num", "fitness_num", "stress_num",
    "meals_per_day", "sleep_quality",
    "is_vegetarian", "is_vegan", "is_diabetic", "is_gluten_free",
    # Meal context
    "meal_type_num", "calorie_gap", "protein_gap", "calorie_ratio",
    # Food nutrition
    "meal_calories", "meal_protein", "meal_carbs", "meal_fat",
    "meal_fiber", "meal_sugar", "within_meal_class_band",
    # NEW v3: variety and history
    "days_since_last_eaten", "times_eaten_this_week",
    "times_eaten_total", "is_new_food",
    # NEW v3: goal-food alignment
    "goal_food_alignment",
] + GOAL_COLS

# ── V3 EXERCISE FEATURE COLUMNS ───────────────────────────────────────────────
EXERCISE_FEATURE_COLS = [
    "age", "bmi", "gender_num", "activity_num", "fitness_num", "stress_num",
    "calorie_gap", "protein_gap", "calorie_ratio",
    "is_diabetic", "meals_per_day", "sleep_quality",
    "meal_calories", "meal_protein",
    "days_exercised_this_week",   # NEW v3
] + GOAL_COLS


def train_meal_model():
    print("\n  Training meal model (v3 — variety-aware)...")
    path = os.path.join(DATA_DIR, "meal_training.csv")
    if not os.path.exists(path):
        print(f"  ERROR: {path} not found.")
        print("  Run: python -m ai_engine.ml.data.generate_training_data")
        return False

    df = pd.read_csv(path)
    print(f"  Loaded {len(df):,} rows, {df['accepted'].mean():.2%} acceptance rate")

    # Use columns that exist in the CSV (v2 CSVs won't have v3 columns)
    available_cols = [c for c in MEAL_FEATURE_COLS if c in df.columns]
    missing_cols   = [c for c in MEAL_FEATURE_COLS if c not in df.columns]

    if missing_cols:
        print(f"  NOTE: {len(missing_cols)} v3 columns missing from CSV — filling with 0")
        print(f"  Missing: {missing_cols}")
        print("  Regenerate data with: python -m ai_engine.ml.data.generate_training_data")
        for c in missing_cols:
            df[c] = 0

    X = df[MEAL_FEATURE_COLS]
    y = df["accepted"]

    Xt, Xv, yt, yv = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)

    model = lgb.LGBMClassifier(
        n_estimators=500,
        learning_rate=0.03,
        max_depth=8,
        num_leaves=63,
        min_child_samples=30,
        subsample=0.85,
        colsample_bytree=0.85,
        class_weight="balanced",
        random_state=42,
        verbose=-1,
    )

    model.fit(
        Xt, yt,
        eval_set=[(Xv, yv)],
        callbacks=[
            lgb.early_stopping(40, verbose=False),
            lgb.log_evaluation(0),
        ],
    )

    acc = accuracy_score(yv, model.predict(Xv))
    print(f"\n  Meal model accuracy: {acc:.2%}")
    print(f"  Train: {len(Xt):,} rows | Test: {len(Xv):,} rows")
    print(classification_report(yv, model.predict(Xv), target_names=["rejected","accepted"]))

    # Feature importances — show top 10
    importances = sorted(
        zip(MEAL_FEATURE_COLS, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    )[:10]
    print("  Top 10 features:")
    for fname, fimp in importances:
        print(f"    {fname:<30} {fimp:.0f}")

    artifact = {
        "model":          model,
        "feature_cols":   MEAL_FEATURE_COLS,
        "version":        "v3.0",
        "trained_at":     str(date.today()),
        "accuracy":       round(acc, 4),
        "training_rows":  len(df),
        "v3_features":    True,
    }
    out_path = os.path.join(MODEL_DIR, "meal_model.pkl")
    joblib.dump(artifact, out_path)
    print(f"\n  Saved → {out_path}")
    return True


def train_exercise_model():
    print("\n  Training exercise model (v3)...")
    path = os.path.join(DATA_DIR, "exercise_training.csv")
    if not os.path.exists(path):
        print(f"  ERROR: {path} not found.")
        print("  Run: python -m ai_engine.ml.data.generate_training_data")
        return False

    df = pd.read_csv(path)
    print(f"  Loaded {len(df):,} rows")

    available_cols = [c for c in EXERCISE_FEATURE_COLS if c in df.columns]
    missing_cols   = [c for c in EXERCISE_FEATURE_COLS if c not in df.columns]
    if missing_cols:
        print(f"  NOTE: filling {len(missing_cols)} missing v3 columns with 0: {missing_cols}")
        for c in missing_cols:
            df[c] = 0

    le = LabelEncoder()
    y  = le.fit_transform(df["exercise_label"])
    X  = df[EXERCISE_FEATURE_COLS]

    Xt, Xv, yt, yv = train_test_split(X, y, test_size=0.15, random_state=42, stratify=y)

    model = lgb.LGBMClassifier(
        n_estimators=500,
        learning_rate=0.03,
        max_depth=8,
        num_leaves=63,
        random_state=42,
        verbose=-1,
    )

    model.fit(
        Xt, yt,
        eval_set=[(Xv, yv)],
        callbacks=[
            lgb.early_stopping(40, verbose=False),
            lgb.log_evaluation(0),
        ],
    )

    acc = accuracy_score(yv, model.predict(Xv))
    print(f"\n  Exercise model accuracy: {acc:.2%}")
    print(f"  Classes: {list(le.classes_)}")
    print(classification_report(yv, model.predict(Xv), target_names=le.classes_))

    artifact = {
        "model":          model,
        "label_encoder":  le,
        "feature_cols":   EXERCISE_FEATURE_COLS,
        "classes":        list(le.classes_),
        "version":        "v3.0",
        "trained_at":     str(date.today()),
        "accuracy":       round(acc, 4),
        "training_rows":  len(df),
        "v3_features":    True,
    }
    out_path = os.path.join(MODEL_DIR, "exercise_model.pkl")
    joblib.dump(artifact, out_path)
    print(f"\n  Saved → {out_path}")
    return True


if __name__ == "__main__":
    print("\n SmartDiet Pro — AI Model Training v3")
    print("=" * 50)
    meal_ok     = train_meal_model()
    exercise_ok = train_exercise_model()
    if meal_ok and exercise_ok:
        print("\n  Both models trained successfully.")
        print("  Restart Flask to load the new models.\n")
    else:
        print("\n  Some models failed — check errors above.\n")
