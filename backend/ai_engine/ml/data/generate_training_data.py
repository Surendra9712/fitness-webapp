"""
Generate training data for meal + exercise classifiers.
Run: python -m ai_engine.ml.data.generate_training_data
"""
import os, random
import numpy as np
import pandas as pd
random.seed(42); np.random.seed(42)
OUT_DIR = os.path.dirname(__file__)
N = 150_000
GOALS = ["lose_weight","gain_muscle","maintain","improve_health","athletic_performance"]
GOAL_W = [0.30,0.25,0.20,0.15,0.10]
ACTIVITIES = ["sedentary","light","moderate","active","very_active"]
ACT_MAP = {"sedentary":1,"light":2,"moderate":3,"active":4,"very_active":5}
FITNESS = ["beginner","intermediate","advanced"]
FIT_MAP = {"beginner":1,"intermediate":2,"advanced":3}
STRESS = ["low","moderate","high","very_high"]
STRESS_MAP = {"low":1,"moderate":2,"high":3,"very_high":4}
MEAL_TYPES = ["breakfast","lunch","snack","dinner"]
MEAL_MAP = {"breakfast":1,"lunch":2,"snack":3,"dinner":4}
MEAL_BANDS = {"breakfast":(60,350),"lunch":(350,700),"snack":(40,220),"dinner":(280,600)}

def _sample_food(meal_type):
    lo,hi = MEAL_BANDS[meal_type]
    cal = random.uniform(lo,hi)
    pp = random.uniform(0.05,0.35); fp = random.uniform(0.05,0.30)
    cp = max(0.05, 1-pp-fp)
    return cal, round((cal*pp)/4,1), round((cal*cp)/4,1), round((cal*fp)/9,1), round(random.uniform(0,min(8,cal*0.015)),1)

def gen_meal_data():
    rows = []
    for _ in range(N):
        age=random.randint(16,70); gender=random.choice(["male","female"])
        h=random.uniform(145,195); w=random.uniform(40,120)
        bmi=round(w/((h/100)**2),1)
        activity=random.choices(ACTIVITIES,[0.25,0.25,0.25,0.15,0.10])[0]
        fitness=random.choices(FITNESS,[0.5,0.35,0.15])[0]
        stress=random.choices(STRESS,[0.2,0.45,0.25,0.1])[0]
        goal=random.choices(GOALS,GOAL_W)[0]
        meal_type=random.choice(MEAL_TYPES)
        target_cal=random.uniform(1300,3200)
        cal,prot,carb,fat,fib = _sample_food(meal_type)
        lo,hi = MEAL_BANDS[meal_type]
        within_band = int(lo<=cal<=hi)
        protein_gap=random.uniform(-30,100)
        calorie_gap=target_cal-cal
        calorie_ratio=round(cal/target_cal,3)
        is_veg=random.random()<0.45; is_vegan=is_veg and random.random()<0.15
        is_diab=random.random()<0.12; is_gluten=random.random()<0.06
        meals_per_day=random.choice([2,3,3,3,4])
        sleep_quality=1 if random.random()<0.6 else 0
        score = 0.0
        if within_band: score += 0.35
        else: score -= 0.45
        if protein_gap>15 and prot>15: score += 0.20
        elif protein_gap>15 and prot<=15: score -= 0.15
        if is_veg and prot<8: score -= 0.20
        if stress=="very_high": score -= 0.12
        if is_diab and carb>60: score -= 0.20
        if calorie_gap < -200: score -= 0.20
        score += np.random.normal(0,0.10)
        accepted = 1 if score>0 else 0
        row = {"age":age,"bmi":bmi,"gender_num":1 if gender=="male" else 0,"activity_num":ACT_MAP[activity],"fitness_num":FIT_MAP[fitness],"stress_num":STRESS_MAP[stress],"meal_type_num":MEAL_MAP[meal_type],"calorie_gap":round(calorie_gap,1),"protein_gap":round(protein_gap,1),"calorie_ratio":calorie_ratio,"is_vegetarian":int(is_veg),"is_vegan":int(is_vegan),"is_diabetic":int(is_diab),"is_gluten_free":int(is_gluten),"meals_per_day":meals_per_day,"sleep_quality":sleep_quality,"meal_calories":round(cal,1),"meal_protein":round(prot,1),"meal_carbs":round(carb,1),"meal_fat":round(fat,1),"meal_fiber":round(fib,1),"within_meal_class_band":within_band,"accepted":accepted}
        for g in GOALS: row[f"goal_{g}"] = 1 if goal==g else 0
        rows.append(row)
    df=pd.DataFrame(rows)
    path=os.path.join(OUT_DIR,"meal_training.csv")
    df.to_csv(path,index=False)
    print(f"  Meal data: {len(df):,} rows -> {path} | accepted={df['accepted'].mean():.2%}")

def assign_exercise(row):
    g,f,r,s = row["goal"],row["fitness_num"],row["calorie_ratio"],row["stress_num"]
    if s>=4 or r<0.70: return "rest_recovery"
    if r>1.35: return "cardio_intense" if f>=2 else "cardio_moderate"
    if r>1.20: return "cardio_moderate"
    if r>1.10: return "cardio_light"
    if g=="gain_muscle": return "strength_heavy" if f>=2 else "strength_light"
    if g=="improve_health" and row["activity_num"]<=2: return "yoga_light"
    return "yoga_light" if -0.10<=(r-1)<=0.10 else "cardio_light"

def gen_exercise_data():
    rows = []
    for _ in range(N):
        age=random.randint(16,70); gender=random.choice(["male","female"])
        h=random.uniform(145,195); w=random.uniform(40,120)
        bmi=round(w/((h/100)**2),1)
        activity=random.choices(ACTIVITIES,[0.25,0.25,0.25,0.15,0.10])[0]
        fitness=random.choices(FITNESS,[0.5,0.35,0.15])[0]
        stress=random.choices(STRESS,[0.2,0.45,0.25,0.1])[0]
        goal=random.choices(GOALS,GOAL_W)[0]
        target_cal=random.uniform(1300,3200)
        consumed=target_cal*random.uniform(0.45,1.70)
        calorie_ratio=round(consumed/target_cal,3)
        protein_gap=random.uniform(-30,100)
        is_diab=random.random()<0.12
        meals_per_day=random.choice([2,3,3,3,4])
        sleep_quality=1 if random.random()<0.6 else 0
        today_protein=random.uniform(15,200)
        row = {"goal":goal,"age":age,"bmi":bmi,"gender_num":1 if gender=="male" else 0,"activity_num":ACT_MAP[activity],"fitness_num":FIT_MAP[fitness],"stress_num":STRESS_MAP[stress],"calorie_gap":round(target_cal-consumed,1),"protein_gap":round(protein_gap,1),"calorie_ratio":calorie_ratio,"is_diabetic":int(is_diab),"meals_per_day":meals_per_day,"sleep_quality":sleep_quality,"meal_calories":round(consumed,1),"meal_protein":round(today_protein,1)}
        row["exercise_label"] = assign_exercise(row)
        for g in GOALS: row[f"goal_{g}"] = 1 if goal==g else 0
        rows.append(row)
    df=pd.DataFrame(rows)
    path=os.path.join(OUT_DIR,"exercise_training.csv")
    df.to_csv(path,index=False)
    print(f"  Exercise data: {len(df):,} rows -> {path}")
    print(f"  Distribution:\n{df['exercise_label'].value_counts()}")

if __name__=="__main__":
    print(f"\n  Generating {N:,} rows each...")
    gen_meal_data(); gen_exercise_data()
    print("  Done.\n")
