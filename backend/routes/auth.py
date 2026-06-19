from flask import Blueprint, request, jsonify
import bcrypt
import re
from database.connection import get_connection
from middleware.auth import generate_token, token_required

auth_bp = Blueprint('auth', __name__)

_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')


def _validate_register(name, email, password):
    errors = {}
    if not name:
        errors['name'] = 'Full name is required'
    if not email:
        errors['email'] = 'Email is required'
    elif not _EMAIL_RE.match(email):
        errors['email'] = 'Invalid email address'
    if not password:
        errors['password'] = 'Password is required'
    elif len(password) < 6:
        errors['password'] = 'Password must be at least 6 characters'
    return errors


def _validate_login(email, password):
    errors = {}
    if not email:
        errors['email'] = 'Email is required'
    elif not _EMAIL_RE.match(email):
        errors['email'] = 'Invalid email address'
    if not password:
        errors['password'] = 'Password is required'
    return errors


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() or {}
    name = data.get('name', '').strip()
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')
    role = data.get('role', 'user')

    errors = _validate_register(name, email, password)
    if errors:
        return jsonify({'errors': errors}), 422

    if role not in ('user', 'dietitian'):
        role = 'user'

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
    data = request.get_json() or {}
    email = data.get('email', '').strip().lower()
    password = data.get('password', '')

    errors = _validate_login(email, password)
    if errors:
        return jsonify({'errors': errors}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, name, email, password_hash, role, is_active FROM users WHERE email = %s",
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


@auth_bp.route('/me', methods=['GET'])
@token_required
def me():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, "
            "p.age, p.weight_kg, p.height_cm, p.gender, p.goal, p.activity_level "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            "WHERE u.id = %s",
            (request.user_id,),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        return jsonify(user)
    finally:
        cursor.close()
        conn.close()


@auth_bp.route('/profile', methods=['PUT'])
@token_required
def update_profile():
    data = request.get_json() or {}
    fields = ['age', 'weight_kg', 'height_cm', 'gender', 'goal', 'activity_level']
    updates = {k: data[k] for k in fields if k in data}
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
