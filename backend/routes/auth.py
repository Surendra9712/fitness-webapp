from flask import Blueprint, request, jsonify
import bcrypt
import json
import datetime
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator
from typing import Literal, Optional, List
from database.connection import get_connection
from middleware.auth import generate_token, token_required
from utils.validation import pydantic_errors

auth_bp = Blueprint('auth', __name__)


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
    role: Literal['user', 'dietitian'] = 'user'

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



@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        body = RegisterSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    name, email, password, role = body.name, body.email, body.password, body.role

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'errors': {'email': 'Email already registered'}}), 422

        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s, %s, %s, %s)",
            (name, email, password_hash, role),
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO user_profiles (user_id) VALUES (%s)", (user_id,))
        conn.commit()

        token = generate_token(user_id, role)
        return jsonify({
            'token': token,
            'user': {'id': user_id, 'name': name, 'email': email, 'role': role},
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        body = LoginSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    email, password = body.email, body.password

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, password_hash, role, is_active "
            "FROM users WHERE email = %s AND deleted_at IS NULL",
            (email,),
        )
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
            return jsonify({'error': 'Invalid email or password'}), 401
        if not user['is_active']:
            return jsonify({'error': 'Account is disabled'}), 403

        token = generate_token(user['id'], user['role'])
        return jsonify({
            'token': token,
            'user': {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role']},
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500
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


@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, "
            "p.full_name, p.date_of_birth, p.gender, p.phone_number, p.city, p.country, "
            "p.occupation, p.height_cm, p.current_weight_kg, p.activity_level, "
            "p.primary_goal, p.fitness_level, p.target_water_ml, "
            "p.diet_type, p.dietary_restrictions, p.other_restrictions, "
            "p.allergens, p.cuisine_preferences, "
            "p.breakfast_time, p.lunch_time, p.dinner_time, p.meals_per_day, "
            "p.snacks_between_meals, p.cooking_frequency, p.eating_out_frequency, "
            "p.track_hydration, p.avg_sleep_hours, p.emotional_eater, p.stress_level, "
            "p.health_conditions, p.notes, "
            "p.age, p.weight_kg, p.goal "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            "WHERE u.id = %s",
            (request.user_id,),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(_serialize_row(user))
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    try:
        body = UpdateProfileSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    _JSON_FIELDS = {'dietary_restrictions', 'allergens', 'cuisine_preferences', 'health_conditions'}
    updates = {}
    for k, v in body.model_dump().items():
        if v is None:
            continue
        updates[k] = json.dumps(v) if k in _JSON_FIELDS else v
    if not updates:
        return jsonify({'error': 'No valid fields provided'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [request.user_id]

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            f"UPDATE user_profiles SET {set_clause} WHERE user_id = %s",
            values,
        )
        conn.commit()
        return jsonify({'message': 'Profile updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
