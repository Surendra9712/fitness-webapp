import datetime
import os
import jwt
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


def decode_token_string(token: str):
    """Decode a raw JWT string. No Flask request context required —
    used for the Socket.IO connect handshake as well as normal HTTP requests."""
    if not token:
        return None, 'Token missing'
    try:
        data = jwt.decode(token, _SECRET, algorithms=['HS256'])
        return data, None
    except jwt.ExpiredSignatureError:
        return None, 'Token expired'
    except jwt.InvalidTokenError:
        return None, 'Invalid token'
