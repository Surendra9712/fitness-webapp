from dataclasses import dataclass
ACTIVITY_MULTIPLIERS = {"sedentary":1.2,"light":1.375,"moderate":1.55,"active":1.725,"very_active":1.9}
GOAL_MACRO_PROFILES = {"lose_weight":(-500,0.35,0.35,0.30),"gain_muscle":(300,0.30,0.45,0.25),"maintain":(0,0.25,0.50,0.25),"improve_health":(-200,0.30,0.45,0.25),"athletic_performance":(200,0.30,0.50,0.20)}
@dataclass
class NutritionTargets:
    bmi:float; bmr:float; tdee:float; daily_calories:float; protein_g:float; carbs_g:float; fat_g:float; water_ml:int
def calculate_bmi(weight_kg,height_cm): return round(weight_kg/((height_cm/100)**2),1)
def calculate_bmr(weight_kg,height_cm,age,gender):
    base = 10*weight_kg+6.25*height_cm-5*age
    return base+5 if gender=="male" else base-161
def calculate_tdee(bmr,activity_level): return bmr*ACTIVITY_MULTIPLIERS.get(activity_level,1.2)
def calculate_nutrition_targets(weight_kg,height_cm,age,gender,activity_level,goal):
    bmi=calculate_bmi(weight_kg,height_cm); bmr=calculate_bmr(weight_kg,height_cm,age,gender); tdee=calculate_tdee(bmr,activity_level)
    adj,pp,cp,fp=GOAL_MACRO_PROFILES.get(goal,GOAL_MACRO_PROFILES["maintain"])
    cal=max(1200,tdee+adj); water=round((weight_kg*33+500*(1 if activity_level in("active","very_active") else 0))/50)*50
    return NutritionTargets(bmi=bmi,bmr=round(bmr,1),tdee=round(tdee,1),daily_calories=round(cal),protein_g=round((cal*pp)/4,1),carbs_g=round((cal*cp)/4,1),fat_g=round((cal*fp)/9,1),water_ml=int(water))
def calculate_meal_distribution(targets,meals_per_day=3):
    split={"breakfast":0.25,"lunch":0.40,"dinner":0.35} if meals_per_day<=3 else {"breakfast":0.20,"lunch":0.35,"snack":0.15,"dinner":0.30}
    return {m:{k:round(getattr(targets,"daily_calories" if k=="calories" else k+"_g")*p,1) if k!="calories" else round(targets.daily_calories*p) for k in ["calories","protein_g","carbs_g","fat_g"]} for m,p in split.items()}
