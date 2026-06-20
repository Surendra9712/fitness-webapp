from flask import Blueprint, request, jsonify
from pydantic import BaseModel, Field, ValidationError, field_validator
from typing import Optional, Literal, List
import json
from datetime import date
from database.connection import get_connection
from middleware.auth import token_required
from utils.validation import pydantic_errors

onboarding_bp = Blueprint('onboarding', __name__)


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

    return {
        'calories': round(calories),
        'protein': round(protein),
        'carbs': round(carbs),
        'fat': round(fat),
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

@onboarding_bp.route('/complete', methods=['POST'])
@token_required
def complete():
    try:
        body = ProfileSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

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
        _upsert_profile(cursor, request.user_id, fields)
        conn.commit()

        macros = _calc_macros(
            weight_kg=body.current_weight_kg,
            height_cm=body.height_cm,
            dob_str=body.date_of_birth,
            gender=body.gender,
            activity_level=body.activity_level,
            goal=body.primary_goal,
        )
        return jsonify({'message': 'Profile saved', 'daily_targets': macros}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@onboarding_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    try:
        body = UpdateProfileSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    updates = {}
    for k, v in body.model_dump().items():
        if v is None:
            continue
        updates[k] = json.dumps(v) if k in _JSON_FIELDS else v

    if not updates:
        return jsonify({'error': 'No fields provided'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [request.user_id]

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
                (request.user_id,)
            )
            profile = cursor.fetchone() or {}
            macros = _calc_macros(
                weight_kg=float(profile.get('current_weight_kg') or 70),
                height_cm=float(profile.get('height_cm') or 170),
                dob_str=str(profile.get('date_of_birth') or '1990-01-01'),
                gender=profile.get('gender') or 'male',
                activity_level=profile.get('activity_level') or 'moderate',
                goal=profile.get('primary_goal') or 'maintain',
            )
            return jsonify({'message': 'Profile updated', 'daily_targets': macros})

        return jsonify({'message': 'Profile updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
