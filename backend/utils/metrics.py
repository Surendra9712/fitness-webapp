"""Body-metric helpers derived from a user_profiles row.

Lives in utils rather than a route module because both the trainee's own
dashboard (routes/user.py) and the trainer's trainee-profile view
(routes/dietitian.py) need it — and routes/user.py already imports from
routes/dietitian.py, so a route-to-route import would be circular.
"""
import datetime
from typing import Optional


def age_from_dob(dob, fallback: int = 30) -> int:
    """Whole years between `dob` (date or ISO string) and today."""
    if not dob:
        return fallback
    try:
        if isinstance(dob, (datetime.date, datetime.datetime)):
            d = dob if isinstance(dob, datetime.date) else dob.date()
        else:
            d = datetime.date.fromisoformat(str(dob)[:10])
        today = datetime.date.today()
        return today.year - d.year - ((today.month, today.day) < (d.month, d.day))
    except Exception:
        return fallback


def compute_body_metrics(profile: dict) -> Optional[dict]:
    """Return BMI / BMR / TDEE / macros from a user_profiles row, or None if data missing."""
    w = profile.get('current_weight_kg')
    h = profile.get('height_cm')
    if not w or not h:
        return None
    w, h = float(w), float(h)

    age = age_from_dob(profile.get('date_of_birth'))

    gender = profile.get('gender', 'male')
    if gender == 'female':
        bmr = 10 * w + 6.25 * h - 5 * age - 161
    else:
        bmr = 10 * w + 6.25 * h - 5 * age + 5

    multipliers = {
        'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55,
        'active': 1.725, 'very_active': 1.9,
    }
    activity = profile.get('activity_level', 'moderate')
    tdee = bmr * multipliers.get(activity, 1.55)

    goal = profile.get('primary_goal', 'maintain')
    if goal == 'lose_weight':
        calories = tdee - 500
    elif goal == 'gain_muscle':
        calories = tdee + 300
    else:
        calories = tdee
    calories = max(calories, 1200)

    protein = w * 1.6
    fat = calories * 0.25 / 9
    carbs = max((calories - protein * 4 - fat * 9) / 4, 0)

    bmi = w / ((h / 100) ** 2)
    if bmi < 18.5:
        bmi_category = 'Underweight'
    elif bmi < 25:
        bmi_category = 'Normal'
    elif bmi < 30:
        bmi_category = 'Overweight'
    else:
        bmi_category = 'Obese'

    return {
        'bmi': round(bmi, 1),
        'bmi_category': bmi_category,
        'bmr': round(bmr),
        'tdee': round(tdee),
        'daily_calories': round(calories),
        'macros': {
            'protein': round(protein),
            'carbs': round(carbs),
            'fat': round(fat),
        },
    }
