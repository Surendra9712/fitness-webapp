from functools import wraps
import datetime
import os
import jwt
from flask import request, jsonify
from dotenv import load_dotenv

load_dotenv()

_SECRET = os.getenv('JWT_SECRET', 'change-this-secret')


def generate_token(user_id: int, role: str) -> str:
    payload = {
        'user_id': user_id,
        'role': role,
        'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24),
    }
    return jwt.encode(payload, _SECRET, algorithm='HS256')


def _decode_token():
    auth_header = request.headers.get('Authorization', '')
    token = auth_header.replace('Bearer ', '').strip()
    if not token:
        return None, 'Token missing'
    try:
        data = jwt.decode(token, _SECRET, algorithms=['HS256'])
        return data, None
    except jwt.ExpiredSignatureError:
        return None, 'Token expired'
    except jwt.InvalidTokenError:
        return None, 'Invalid token'


def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        data, err = _decode_token()
        if err:
            return jsonify({'error': err}), 401
        request.user_id = data['user_id']
        request.user_role = data['role']
        return f(*args, **kwargs)
    return decorated


def role_required(*roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            data, err = _decode_token()
            if err:
                return jsonify({'error': err}), 401
            if data['role'] not in roles:
                return jsonify({'error': 'Access denied'}), 403
            request.user_id = data['user_id']
            request.user_role = data['role']
            return f(*args, **kwargs)
        return decorated
    return decorator
