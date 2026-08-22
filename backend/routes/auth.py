from flask import Blueprint, request, jsonify
import bcrypt
import hashlib
import json
import datetime
import os
import secrets
from urllib.parse import urlencode
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator
from typing import Literal, Optional, List
from database.connection import get_connection
from middleware.auth import generate_token, token_required
from utils.mailer import send_password_reset
from utils.validation import pydantic_errors, clean_person_name, validate_person_name

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

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return clean_person_name(v) if v else v

    @field_validator('name', mode='after')
    @classmethod
    def check_name(cls, v):
        return validate_person_name(v)

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

    name, email, password = body.name, body.email, body.password
    role = 'trainee'

    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            return jsonify({'errors': {'email': 'Email already registered'}}), 422

        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, status) VALUES (%s, %s, %s, %s, 'active')",
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
            "SELECT id, name, email, password_hash, role, status "
            "FROM users WHERE email = %s AND deleted_at IS NULL",
            (email,),
        )
        user = cursor.fetchone()
        if not user or not bcrypt.checkpw(password.encode(), user['password_hash'].encode()):
            return jsonify({'error': 'Invalid email or password'}), 401
        if user['status'] != 'active':
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
    meals_per_day: Optional[int] = None
    # Health
    notes: Optional[str] = None
    # Legacy
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    goal: Optional[Literal['lose_weight', 'maintain', 'gain_muscle']] = None

    @field_validator('full_name', mode='before')
    @classmethod
    def strip_full_name(cls, v):
        return clean_person_name(v)

    @field_validator('full_name', mode='after')
    @classmethod
    def check_full_name(cls, v):
        return validate_person_name(v, allow_empty=True)


@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, u.profile_image_url, "
            "u.trainer_request_status, "
            "u.subscription_plan, u.subscription_status, "
            "p.full_name, p.date_of_birth, p.gender, p.phone_number, p.city, p.country, "
            "p.occupation, p.height_cm, p.current_weight_kg, p.activity_level, "
            "p.primary_goal, p.fitness_level, p.target_water_ml, "
            "p.diet_type, p.dietary_restrictions, p.other_restrictions, "
            "p.allergens, p.cuisine_preferences, p.meals_per_day, "
            "p.health_conditions, p.notes, "
            "p.age, p.weight_kg, p.goal, "
            "p.bio, p.specialization, p.experience_years, p.available_time "
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


@auth_bp.route('/avatar', methods=['PUT'])
@token_required
def update_avatar():
    body = request.get_json() or {}
    url = body.get('profile_image_url', '').strip()
    if not url:
        return jsonify({'error': 'profile_image_url is required'}), 400

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE users SET profile_image_url = %s WHERE id = %s",
            (url, request.user_id),
        )
        conn.commit()
        return jsonify({'message': 'Avatar updated', 'profile_image_url': url})
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


# ── Password: forgot / reset / change ─────────────────────────────────────────

# Long enough that the window for a leaked link is small, long enough that a
# person can still finish reading the email and typing a new password.
RESET_TOKEN_TTL_MINUTES = 60


def _hash_reset_token(token: str) -> str:
    """Only the digest is stored, so a database dump yields no usable links."""
    return hashlib.sha256(token.encode()).hexdigest()


class ForgotPasswordSchema(BaseModel):
    email: EmailStr

    @field_validator('email', mode='before')
    @classmethod
    def normalise_email(cls, v):
        return str(v).strip().lower() if v else v


class ResetPasswordSchema(BaseModel):
    token: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)

    @field_validator('email', mode='before')
    @classmethod
    def normalise_email(cls, v):
        return str(v).strip().lower() if v else v


class ChangePasswordSchema(BaseModel):
    current_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6)


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        body = ForgotPasswordSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, status FROM users "
            "WHERE email = %s AND deleted_at IS NULL",
            (body.email,),
        )
        user = cursor.fetchone()
        # Unregistered and disabled addresses are reported explicitly rather
        # than answered generically. That makes this endpoint an account
        # enumeration oracle — anyone can probe which emails are registered —
        # which is an accepted tradeoff here in exchange for a clearer form.
        if not user:
            return jsonify({'errors': {
                'email': 'No account is registered with that email',
            }}), 404
        if user['status'] != 'active':
            return jsonify({'errors': {
                'email': 'This account is disabled. Contact support for help.',
            }}), 403

        token = secrets.token_urlsafe(32)
        expires_at = datetime.datetime.utcnow() + datetime.timedelta(minutes=RESET_TOKEN_TTL_MINUTES)

        # Requesting a new link retires any earlier one, so only the most
        # recent email in the inbox works.
        cursor.execute(
            "UPDATE password_resets SET used_at = UTC_TIMESTAMP() "
            "WHERE user_id = %s AND used_at IS NULL",
            (user['id'],),
        )
        cursor.execute(
            "INSERT INTO password_resets (user_id, token_hash, expires_at) VALUES (%s, %s, %s)",
            (user['id'], _hash_reset_token(token), expires_at),
        )
        conn.commit()

        frontend_url = (os.getenv('FRONTEND_URL') or 'http://localhost:5173').rstrip('/')
        # Both the token and the address travel in the query string so the
        # frontend can name the account straight away. Only the token decides
        # whose password changes, though — `email` is caller-editable and is
        # therefore treated as display text, never as identity. See
        # reset_password() below, which looks the user up by token alone.
        query = urlencode({'token': token, 'email': user['email']})
        reset_url = f"{frontend_url}/reset-password?{query}"
        sent = send_password_reset(
            user['email'], user['name'] or 'there', reset_url, RESET_TOKEN_TTL_MINUTES,
        )

        payload = {'message': f"We sent a reset link to {user['email']}."}
        # Without SMTP configured there is no inbox to check, so in dev the link
        # comes back in the response to keep the flow testable. Never in
        # production — that would hand any caller a reset link for any email.
        if not sent and (os.getenv('MODE') or '').strip().lower() == 'dev':
            payload['dev_reset_url'] = reset_url
        return jsonify(payload)
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/reset-password/verify', methods=['POST'])
def verify_reset_token():
    """Check a token before showing the new-password form, so an expired link
    says so up front instead of after the user has typed a password twice."""
    payload = request.get_json() or {}
    token = payload.get('token', '')
    email = str(payload.get('email') or '').strip().lower()
    if not token:
        return jsonify({'valid': False, 'error': 'Reset token is required'}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT r.id, u.email FROM password_resets r "
            "JOIN users u ON u.id = r.user_id "
            "WHERE r.token_hash = %s AND r.used_at IS NULL "
            "AND r.expires_at > UTC_TIMESTAMP() AND u.deleted_at IS NULL",
            (_hash_reset_token(token),),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'valid': False, 'error': 'This reset link is invalid or has expired'}), 400
        # An email in the link is optional here, but when present it must match
        # the token's owner — catching an edited URL before the form renders.
        if email and email != (row['email'] or '').lower():
            return jsonify({
                'valid': False,
                'error': 'This reset link does not belong to that email address',
            }), 400
        return jsonify({'valid': True, 'email': row['email']})
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        body = ResetPasswordSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # The account is resolved by TOKEN, never by the submitted email: the
        # email arrives from a query string the caller can edit, so trusting it
        # would let someone point a valid link at a different account.
        cursor.execute(
            "SELECT r.id, r.user_id, u.email, u.password_hash FROM password_resets r "
            "JOIN users u ON u.id = r.user_id "
            "WHERE r.token_hash = %s AND r.used_at IS NULL "
            "AND r.expires_at > UTC_TIMESTAMP() AND u.deleted_at IS NULL "
            "AND u.status = 'active'",
            (_hash_reset_token(body.token),),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'This reset link is invalid or has expired'}), 400

        # The submitted email is checked in its own right, so a link carrying an
        # address that no longer has an account reports that plainly.
        cursor.execute(
            "SELECT id FROM users WHERE email = %s AND deleted_at IS NULL",
            (body.email,),
        )
        if not cursor.fetchone():
            return jsonify({'errors': {
                'email': 'No account is registered with that email',
            }}), 404

        # Both exist but disagree — the link was edited, or belongs to someone
        # else's account. Refuse rather than silently resetting the token owner.
        if body.email != (row['email'] or '').lower():
            return jsonify({'errors': {
                'email': 'This reset link does not belong to that email address',
            }}), 400

        # Reusing the password you already have defeats the point of a reset —
        # if the old one leaked, setting it again leaves the account exposed.
        # The token is deliberately left unspent so the user can simply retry
        # with a different password instead of requesting a whole new email.
        if bcrypt.checkpw(body.password.encode(), row['password_hash'].encode()):
            return jsonify({'errors': {
                'password': 'New password must be different from your current password',
            }}), 422

        password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, row['user_id']),
        )
        # Burn every outstanding token for this user, not just the one used —
        # an older email sitting in the inbox must not still work.
        cursor.execute(
            "UPDATE password_resets SET used_at = UTC_TIMESTAMP() "
            "WHERE user_id = %s AND used_at IS NULL",
            (row['user_id'],),
        )
        conn.commit()
        return jsonify({'message': 'Password updated. You can now sign in.'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/password', methods=['PUT'])
@token_required
def change_password():
    """Change the signed-in user's password. Works for every role."""
    try:
        body = ChangePasswordSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    if body.current_password == body.new_password:
        return jsonify({'errors': {
            'new_password': 'New password must be different from the current one',
        }}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT password_hash FROM users WHERE id = %s AND deleted_at IS NULL",
            (request.user_id,),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if not bcrypt.checkpw(body.current_password.encode(), user['password_hash'].encode()):
            return jsonify({'errors': {'current_password': 'Current password is incorrect'}}), 422

        password_hash = bcrypt.hashpw(body.new_password.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "UPDATE users SET password_hash = %s WHERE id = %s",
            (password_hash, request.user_id),
        )
        # A password change should also void any pending reset link.
        cursor.execute(
            "UPDATE password_resets SET used_at = UTC_TIMESTAMP() "
            "WHERE user_id = %s AND used_at IS NULL",
            (request.user_id,),
        )
        conn.commit()
        return jsonify({'message': 'Password changed'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
