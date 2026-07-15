import json
from datetime import date

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal, List

from database.connection import get_connection
from dependencies import CurrentUser, get_current_user

router = APIRouter()


# ── Schemas ───────────────────────────────────────────────────────────────────

class ProfileSchema(BaseModel):
    # Personal
    full_name: str = Field(min_length=1)
    date_of_birth: str
    gender: Literal['male', 'female', 'other', 'prefer_not_to_say'] = 'male'
    phone_number: Optional[str] = None
    city: Optional[str] = None
    country: str = 'Nepal'
    height_cm: float = Field(gt=0)
    current_weight_kg: float = Field(gt=0)
    activity_level: Literal['sedentary', 'light', 'moderate', 'active', 'very_active'] = 'moderate'
    occupation: Optional[str] = None
    # Goals
    primary_goal: Literal[
        'lose_weight', 'gain_muscle', 'maintain', 'improve_health', 'athletic_performance'
    ] = 'maintain'
    fitness_level: Literal['beginner', 'intermediate', 'advanced'] = 'beginner'
    target_water_ml: int = Field(default=2000, ge=500, le=6000)
    # Diet
    diet_type: Literal[
        'none', 'vegetarian', 'vegan', 'keto', 'paleo',
        'diabetic', 'low_carb', 'intermittent_fasting'
    ] = 'none'
    dietary_restrictions: List[str] = []
    other_restrictions: Optional[str] = None
    allergens: List[str] = []
    cuisine_preferences: List[str] = []
    # Habits
    breakfast_time: str = '07:30'
    lunch_time: str = '12:30'
    dinner_time: str = '19:00'
    meals_per_day: int = Field(default=3, ge=1, le=8)
    snacks_between_meals: bool = False
    cooking_frequency: str = 'daily'
    eating_out_frequency: int = Field(default=2, ge=0, le=7)
    track_hydration: bool = True
    avg_sleep_hours: float = Field(default=7.0, ge=3, le=12)
    emotional_eater: bool = False
    stress_level: Literal['low', 'moderate', 'high', 'very_high'] = 'moderate'
    # Health
    health_conditions: List[dict] = []
    notes: Optional[str] = None

    @field_validator('full_name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return str(v).strip() if v else v


class UpdateProfileSchema(BaseModel):
    # Personal
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[Literal['male', 'female', 'other', 'prefer_not_to_say']] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    height_cm: Optional[float] = None
    current_weight_kg: Optional[float] = None
    activity_level: Optional[Literal['sedentary', 'light', 'moderate', 'active', 'very_active']] = None
    occupation: Optional[str] = None
    # Goals
    primary_goal: Optional[Literal[
        'lose_weight', 'gain_muscle', 'maintain', 'improve_health', 'athletic_performance'
    ]] = None
    fitness_level: Optional[Literal['beginner', 'intermediate', 'advanced']] = None
    target_water_ml: Optional[int] = None
    # Diet
    diet_type: Optional[Literal[
        'none', 'vegetarian', 'vegan', 'keto', 'paleo',
        'diabetic', 'low_carb', 'intermittent_fasting'
    ]] = None
    dietary_restrictions: Optional[List[str]] = None
    other_restrictions: Optional[str] = None
    allergens: Optional[List[str]] = None
    cuisine_preferences: Optional[List[str]] = None
    # Habits
    breakfast_time: Optional[str] = None
    lunch_time: Optional[str] = None
    dinner_time: Optional[str] = None
    meals_per_day: Optional[int] = None
    snacks_between_meals: Optional[bool] = None
    cooking_frequency: Optional[str] = None
    eating_out_frequency: Optional[int] = None
    track_hydration: Optional[bool] = None
    avg_sleep_hours: Optional[float] = None
    emotional_eater: Optional[bool] = None
    stress_level: Optional[Literal['low', 'moderate', 'high', 'very_high']] = None
    # Health
    health_conditions: Optional[List[dict]] = None
    notes: Optional[str] = None


# ── Macro calculator ──────────────────────────────────────────────────────────

def _calc_macros(weight_kg, height_cm, dob_str, gender, activity_level, goal):
    try:
        dob = date.fromisoformat(dob_str)
        today = date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
    except Exception:
        age = 30

    if gender == 'female':
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    else:
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5

    multipliers = {
        'sedentary': 1.2, 'light': 1.375, 'moderate': 1.55,
        'active': 1.725, 'very_active': 1.9,
    }
    tdee = bmr * multipliers.get(activity_level, 1.55)

    if goal == 'lose_weight':
        calories = tdee - 500
    elif goal == 'gain_muscle':
        calories = tdee + 300
    else:
        calories = tdee

    calories = max(calories, 1200)
    protein = weight_kg * 1.6
    fat = calories * 0.25 / 9
    carbs = max((calories - protein * 4 - fat * 9) / 4, 0)

    bmi = round(weight_kg / ((height_cm / 100) ** 2), 1)
    # Healthy BMI target weight range (18.5 - 24.9)
    h_m = height_cm / 100
    healthy_low = round(18.5 * h_m * h_m, 1)
    healthy_high = round(24.9 * h_m * h_m, 1)
    # Recommended target = middle of healthy range
    recommended_weight = round((healthy_low + healthy_high) / 2, 1)
    # Weeks to reach target at 0.5 kg/week safe rate
    weight_diff = abs(weight_kg - recommended_weight)
    weeks_to_target = round(weight_diff / 0.5) if weight_diff > 1 else 0

    return {
        'calories': round(calories),
        'protein': round(protein),
        'carbs': round(carbs),
        'fat': round(fat),
        'bmi': bmi,
        'current_weight': weight_kg,
        'recommended_weight': recommended_weight,
        'healthy_range_low': healthy_low,
        'healthy_range_high': healthy_high,
        'weeks_to_target': weeks_to_target,
    }


# ── Target weight recommendation ────────────────────────────────────────────────

SAFE_WEEKLY_RATE_KG = 0.5  # sustainable rate of change, matches the -500 kcal/day deficit used above


def _calc_weight_recommendation(weight_kg, height_cm, goal):
    height_m = height_cm / 100
    bmi = round(weight_kg / (height_m ** 2), 1)
    healthy_min = round(18.5 * height_m ** 2, 1)
    healthy_max = round(24.9 * height_m ** 2, 1)

    if goal == 'lose_weight':
        target = round(weight_kg * 0.9, 1) if bmi > 24.9 else weight_kg
        target = max(target, healthy_min)
    elif goal == 'gain_muscle':
        target = round(weight_kg * 1.05, 1) if bmi < 18.5 else round(weight_kg + 2, 1)
        target = min(target, healthy_max) if bmi < 18.5 else target
    else:
        target = weight_kg
        if bmi > 24.9:
            target = healthy_max
        elif bmi < 18.5:
            target = healthy_min

    diff = abs(round(weight_kg, 1) - target)
    weeks_to_target = round(diff / SAFE_WEEKLY_RATE_KG) if diff >= SAFE_WEEKLY_RATE_KG else 0

    return {
        'bmi': bmi,
        'current_weight_kg': round(weight_kg, 1),
        'target_weight_kg': target,
        'healthy_min_kg': healthy_min,
        'healthy_max_kg': healthy_max,
        'weeks_to_target': weeks_to_target,
    }


# ── Helpers ───────────────────────────────────────────────────────────────────

_JSON_FIELDS = {'dietary_restrictions', 'allergens', 'cuisine_preferences', 'health_conditions'}


def _upsert_profile(cursor, user_id, fields: dict):
    cols = ', '.join(fields.keys())
    placeholders = ', '.join(['%s'] * len(fields))
    updates = ', '.join(f"{k} = VALUES({k})" for k in fields)
    sql = (
        f"INSERT INTO user_profiles (user_id, {cols}) VALUES (%s, {placeholders}) "
        f"ON DUPLICATE KEY UPDATE {updates}"
    )
    cursor.execute(sql, [user_id] + list(fields.values()))


# ── Routes ────────────────────────────────────────────────────────────────────

@router.post('/complete')
def complete(body: ProfileSchema, user: CurrentUser = Depends(get_current_user)):
    fields = {
        'full_name':            body.full_name,
        'date_of_birth':        body.date_of_birth,
        'gender':               body.gender,
        'phone_number':         body.phone_number,
        'city':                 body.city,
        'country':              body.country,
        'height_cm':            body.height_cm,
        'current_weight_kg':    body.current_weight_kg,
        'weight_kg':            body.current_weight_kg,
        'activity_level':       body.activity_level,
        'occupation':           body.occupation,
        'primary_goal':         body.primary_goal,
        'goal':                 body.primary_goal if body.primary_goal in ('lose_weight', 'gain_muscle', 'maintain') else 'maintain',
        'fitness_level':        body.fitness_level,
        'target_water_ml':      body.target_water_ml,
        'diet_type':            body.diet_type,
        'dietary_restrictions': json.dumps(body.dietary_restrictions),
        'other_restrictions':   body.other_restrictions,
        'allergens':            json.dumps(body.allergens),
        'cuisine_preferences':  json.dumps(body.cuisine_preferences),
        'breakfast_time':       body.breakfast_time,
        'lunch_time':           body.lunch_time,
        'dinner_time':          body.dinner_time,
        'meals_per_day':        body.meals_per_day,
        'snacks_between_meals': body.snacks_between_meals,
        'cooking_frequency':    body.cooking_frequency,
        'eating_out_frequency': body.eating_out_frequency,
        'track_hydration':      body.track_hydration,
        'avg_sleep_hours':      body.avg_sleep_hours,
        'emotional_eater':      body.emotional_eater,
        'stress_level':         body.stress_level,
        'health_conditions':    json.dumps(body.health_conditions),
        'notes':                body.notes,
    }

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        _upsert_profile(cursor, user.user_id, fields)
        conn.commit()

        macros = _calc_macros(
            weight_kg=body.current_weight_kg,
            height_cm=body.height_cm,
            dob_str=body.date_of_birth,
            gender=body.gender,
            activity_level=body.activity_level,
            goal=body.primary_goal,
        )
        weight_recommendation = _calc_weight_recommendation(
            weight_kg=body.current_weight_kg,
            height_cm=body.height_cm,
            goal=body.primary_goal,
        )
        return JSONResponse({
            'message': 'Profile saved',
            'daily_targets': macros,
            'weight_recommendation': weight_recommendation,
        }, status_code=201)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/profile')
def update_profile(body: UpdateProfileSchema, user: CurrentUser = Depends(get_current_user)):
    updates = {}
    for k, v in body.model_dump().items():
        if v is None:
            continue
        updates[k] = json.dumps(v) if k in _JSON_FIELDS else v

    if not updates:
        return JSONResponse({'error': 'No fields provided'}, status_code=400)

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [user.user_id]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f"UPDATE user_profiles SET {set_clause} WHERE user_id = %s",
            values,
        )
        conn.commit()

        # Recalculate macros if goal or body metrics were updated
        macro_fields = {'primary_goal', 'current_weight_kg', 'height_cm', 'date_of_birth', 'gender', 'activity_level'}
        if macro_fields & set(updates.keys()):
            cursor.execute(
                "SELECT current_weight_kg, height_cm, date_of_birth, gender, activity_level, primary_goal "
                "FROM user_profiles WHERE user_id = %s",
                (user.user_id,)
            )
            profile = cursor.fetchone() or {}
            weight_kg = float(profile.get('current_weight_kg') or 70)
            height_cm = float(profile.get('height_cm') or 170)
            goal = profile.get('primary_goal') or 'maintain'
            macros = _calc_macros(
                weight_kg=weight_kg,
                height_cm=height_cm,
                dob_str=str(profile.get('date_of_birth') or '1990-01-01'),
                gender=profile.get('gender') or 'male',
                activity_level=profile.get('activity_level') or 'moderate',
                goal=goal,
            )
            weight_recommendation = _calc_weight_recommendation(
                weight_kg=weight_kg,
                height_cm=height_cm,
                goal=goal,
            )
            return {
                'message': 'Profile updated',
                'daily_targets': macros,
                'weight_recommendation': weight_recommendation,
            }

        return {'message': 'Profile updated'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
