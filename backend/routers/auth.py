import datetime
import json

import bcrypt
from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Literal, Optional, List

from database.connection import get_connection
from dependencies import CurrentUser, get_current_user
from middleware.auth import generate_token

router = APIRouter()


def _serialize_row(row: dict) -> dict:
    """Convert non-JSON-serializable MySQL types to strings."""
    if not row:
        return row
    out = {}
    for k, v in row.items():
        if isinstance(v, datetime.timedelta):
            total = int(v.total_seconds())
            h, rem = divmod(total, 3600)
            m, _ = divmod(rem, 60)
            out[k] = f"{h:02d}:{m:02d}"
        elif isinstance(v, (datetime.date, datetime.datetime)):
            out[k] = v.isoformat()
        else:
            out[k] = v
    return out


class RegisterSchema(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return str(v).strip() if v else v

    @field_validator('email', mode='before')
    @classmethod
    def normalise_email(cls, v):
        return str(v).strip().lower() if v else v


class LoginSchema(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)

    @field_validator('email', mode='before')
    @classmethod
    def normalise_email(cls, v):
        return str(v).strip().lower() if v else v


@router.post('/register')
def register(body: RegisterSchema):
    name, email, password = body.name, body.email, body.password
    role = 'trainee'

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return JSONResponse({'errors': {'email': 'Email already registered'}}, status_code=422)

        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, status) VALUES (%s, %s, %s, %s, 'active')",
            (name, email, password_hash, role),
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO user_profiles (user_id) VALUES (%s)", (user_id,))
        conn.commit()

        token = generate_token(user_id, role)
        return JSONResponse({
            'token': token,
            'user': {'id': user_id, 'name': name, 'email': email, 'role': role},
        }, status_code=201)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.post('/login')
def login(body: LoginSchema):
    email, password = body.email, body.password

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, password_hash, role, status "
            "FROM users WHERE email = %s AND deleted_at IS NULL",
            (email,),
        )
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
            return JSONResponse({'error': 'Invalid email or password'}, status_code=401)
        if user['status'] != 'active':
            return JSONResponse({'error': 'Account is disabled'}, status_code=403)

        token = generate_token(user['id'], user['role'])
        return {
            'token': token,
            'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']},
        }
    except Exception as e:
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


class UpdateProfileSchema(BaseModel):
    # Personal
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    gender: Optional[Literal['male', 'female', 'other', 'prefer_not_to_say']] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    occupation: Optional[str] = None
    height_cm: Optional[float] = None
    current_weight_kg: Optional[float] = None
    activity_level: Optional[Literal['sedentary', 'light', 'moderate', 'active', 'very_active']] = None
    # Goals
    primary_goal: Optional[Literal['lose_weight', 'gain_muscle', 'maintain', 'improve_health', 'athletic_performance']] = None
    fitness_level: Optional[Literal['beginner', 'intermediate', 'advanced']] = None
    target_water_ml: Optional[int] = None
    # Diet
    diet_type: Optional[Literal['none', 'vegetarian', 'vegan', 'keto', 'paleo', 'diabetic', 'low_carb', 'intermittent_fasting']] = None
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
    notes: Optional[str] = None
    # Legacy
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    goal: Optional[Literal['lose_weight', 'maintain', 'gain_muscle']] = None


@router.get('/me')
def me(user: CurrentUser = Depends(get_current_user)):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, u.profile_image_url, "
            "u.subscription_plan, u.subscription_status, "
            "p.full_name, p.date_of_birth, p.gender, p.phone_number, p.city, p.country, "
            "p.occupation, p.height_cm, p.current_weight_kg, p.activity_level, "
            "p.primary_goal, p.fitness_level, p.target_water_ml, "
            "p.diet_type, p.dietary_restrictions, p.other_restrictions, "
            "p.allergens, p.cuisine_preferences, "
            "p.breakfast_time, p.lunch_time, p.dinner_time, p.meals_per_day, "
            "p.snacks_between_meals, p.cooking_frequency, p.eating_out_frequency, "
            "p.track_hydration, p.avg_sleep_hours, p.emotional_eater, p.stress_level, "
            "p.health_conditions, p.notes, "
            "p.age, p.weight_kg, p.goal, "
            "p.bio, p.specialization, p.experience_years, p.available_time "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            "WHERE u.id = %s",
            (user.user_id,),
        )
        row = cursor.fetchone()
        if not row:
            return JSONResponse({'error': 'User not found'}, status_code=404)
        return _serialize_row(row)
    finally:
        cursor.close()
        conn.close()


@router.put('/avatar')
def update_avatar(body: dict, user: CurrentUser = Depends(get_current_user)):
    url = (body.get('profile_image_url') or '').strip()
    if not url:
        return JSONResponse({'error': 'profile_image_url is required'}, status_code=400)

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET profile_image_url = %s WHERE id = %s",
            (url, user.user_id),
        )
        conn.commit()
        return {'message': 'Avatar updated', 'profile_image_url': url}
    finally:
        cursor.close()
        conn.close()


@router.put('/profile')
def update_profile(body: UpdateProfileSchema, user: CurrentUser = Depends(get_current_user)):
    _JSON_FIELDS = {'dietary_restrictions', 'allergens', 'cuisine_preferences', 'health_conditions'}
    updates = {}
    for k, v in body.model_dump().items():
        if v is None:
            continue
        updates[k] = json.dumps(v) if k in _JSON_FIELDS else v
    if not updates:
        return JSONResponse({'error': 'No valid fields provided'}, status_code=400)

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [user.user_id]

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"UPDATE user_profiles SET {set_clause} WHERE user_id = %s",
            values,
        )
        conn.commit()
        return {'message': 'Profile updated'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
