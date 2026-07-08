import os, joblib, numpy as np, pandas as pd
MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
_meal_artifact = None
_exercise_artifact = None
ACTIVITY_MAP = {"sedentary":1,"light":2,"moderate":3,"active":4,"very_active":5}
FITNESS_MAP  = {"beginner":1,"intermediate":2,"advanced":3}
STRESS_MAP   = {"low":1,"moderate":2,"high":3,"very_high":4}
MEAL_MAP     = {"breakfast":1,"lunch":2,"snack":3,"dinner":4}
ALL_GOALS    = ["lose_weight","gain_muscle","maintain","improve_health","athletic_performance"]
MEAL_BANDS   = {"breakfast":(60,350),"lunch":(350,700),"snack":(40,220),"dinner":(280,600)}

def load_models():
    global _meal_artifact, _exercise_artifact
    mp = os.path.join(MODEL_DIR,"meal_model.pkl")
    ep = os.path.join(MODEL_DIR,"exercise_model.pkl")
    if os.path.exists(mp):
        _meal_artifact = joblib.load(mp)
        print(f"  AI meal model loaded (accuracy: {_meal_artifact.get('accuracy',0):.2%})")
    else:
        print("  Meal model not found — run: python -m ai_engine.ml.train_models")
    if os.path.exists(ep):
        _exercise_artifact = joblib.load(ep)
        print(f"  AI exercise model loaded (accuracy: {_exercise_artifact.get('accuracy',0):.2%})")
    else:
        print("  Exercise model not found — run: python -m ai_engine.ml.train_models")
    return _meal_artifact is not None

def is_loaded():
    return _meal_artifact is not None and _exercise_artifact is not None

def _goal_dummies(goal):
    return {f"goal_{g}":(1 if goal==g else 0) for g in ALL_GOALS}

def score_meal_candidate(food, meal_type, ctx):
    if _meal_artifact is None: return 0.5
    try:
        model = _meal_artifact["model"]; fc = _meal_artifact["feature_cols"]
        lo,hi = MEAL_BANDS.get(meal_type,(0,99999)); cal = float(food.get("calories",0))
        row = {"age":ctx.get("age",25),"bmi":ctx.get("bmi",22),"gender_num":1 if ctx.get("gender","male")=="male" else 0,"activity_num":ACTIVITY_MAP.get(ctx.get("activity_level","moderate"),3),"fitness_num":FITNESS_MAP.get(ctx.get("fitness_level","beginner"),1),"stress_num":STRESS_MAP.get(ctx.get("stress_level","moderate"),2),"meal_type_num":MEAL_MAP.get(meal_type,2),"calorie_gap":ctx.get("calorie_gap",500),"protein_gap":ctx.get("protein_gap",30),"calorie_ratio":ctx.get("calorie_ratio",0.3),"is_vegetarian":int(ctx.get("is_vegetarian",False)),"is_vegan":int(ctx.get("is_vegan",False)),"is_diabetic":int(ctx.get("is_diabetic",False)),"is_gluten_free":int(ctx.get("is_gluten_free",False)),"meals_per_day":ctx.get("meals_per_day",3),"sleep_quality":int(float(ctx.get("avg_sleep_hours",7))>=7),"meal_calories":cal,"meal_protein":float(food.get("protein_g",0)),"meal_carbs":float(food.get("carbs_g",0)),"meal_fat":float(food.get("fat_g",0)),"meal_fiber":float(food.get("fiber_g",0)),"within_meal_class_band":int(lo<=cal<=hi)}
        row.update(_goal_dummies(ctx.get("goal","maintain")))
        X = pd.DataFrame([row])
        for c in fc:
            if c not in X.columns: X[c]=0
        return round(float(model.predict_proba(X[fc])[0][1]),3)
    except: return 0.5

def rank_meal_candidates(candidates, meal_type, ctx, top_n=3):
    scored = [{**f,"ai_score":score_meal_candidate(f,meal_type,ctx)} for f in candidates]
    scored.sort(key=lambda x:x["ai_score"],reverse=True)
    return scored[:top_n]

def predict_exercise_category(ctx):
    if _exercise_artifact is None:
        r=ctx.get("calorie_ratio",1.0); f=ctx.get("fitness_level","beginner"); g=ctx.get("goal","maintain")
        if r<0.70: cat="rest_recovery"
        elif r>1.35: cat="cardio_intense" if f in("intermediate","advanced") else "cardio_moderate"
        elif r>1.20: cat="cardio_moderate"
        elif r>1.10: cat="cardio_light"
        elif g=="gain_muscle": cat="strength_heavy" if f in("intermediate","advanced") else "strength_light"
        else: cat="yoga_light"
        return {"category":cat,"confidence":0.75,"model":"rule_based_fallback"}
    try:
        model=_exercise_artifact["model"]; le=_exercise_artifact["label_encoder"]; fc=_exercise_artifact["feature_cols"]
        row={"age":ctx.get("age",25),"bmi":ctx.get("bmi",22),"gender_num":1 if ctx.get("gender","male")=="male" else 0,"activity_num":ACTIVITY_MAP.get(ctx.get("activity_level","moderate"),3),"fitness_num":FITNESS_MAP.get(ctx.get("fitness_level","beginner"),1),"stress_num":STRESS_MAP.get(ctx.get("stress_level","moderate"),2),"calorie_gap":ctx.get("calorie_gap",0),"protein_gap":ctx.get("protein_gap",0),"calorie_ratio":ctx.get("calorie_ratio",1.0),"is_diabetic":int(ctx.get("is_diabetic",False)),"meals_per_day":ctx.get("meals_per_day",3),"sleep_quality":int(float(ctx.get("avg_sleep_hours",7))>=7),"meal_calories":ctx.get("today_calories",1200),"meal_protein":ctx.get("today_protein",60)}
        row.update(_goal_dummies(ctx.get("goal","maintain")))
        X=pd.DataFrame([row])
        for c in fc:
            if c not in X.columns: X[c]=0
        X=X[fc]; pred=model.predict(X)[0]
        return {"category":le.inverse_transform([pred])[0],"confidence":round(float(np.max(model.predict_proba(X)[0])),3),"model":f"lightgbm-{_exercise_artifact.get('version','v2')}"}
    except: return {"category":"cardio_light","confidence":0.5,"model":"error_fallback"}
