from flask import request
from flask_socketio import join_room, emit

from extensions import socketio
from database.connection import get_connection
from middleware.auth import decode_token_string

# sid -> {'user_id': int, 'role': str}. In-memory is fine for a single-process dev server.
sid_users = {}


def _get_assignment(cursor, assignment_id):
    cursor.execute(
        "SELECT id, customer_id, trainer_id, status FROM trainer_assignments "
        "WHERE id = %s AND deleted_at IS NULL",
        (assignment_id,),
    )
    return cursor.fetchone()


def _is_member(assignment, user_id):
    return (
        assignment is not None
        and assignment['status'] == 'approved'
        and user_id in (assignment['customer_id'], assignment['trainer_id'])
    )


@socketio.on('connect')
def handle_connect(auth):
    token = (auth or {}).get('token', '')
    data, err = decode_token_string(token)
    if err:
        return False
    sid_users[request.sid] = {'user_id': data['user_id'], 'role': data['role']}
    # Personal room so this user receives messages for ANY of their threads
    # (e.g. sidebar previews/unread counts), not just the one they currently
    # have open — join_thread's per-assignment room only covers that thread's
    # live view.
    join_room(f"user:{data['user_id']}")


@socketio.on('disconnect')
def handle_disconnect():
    sid_users.pop(request.sid, None)


@socketio.on('join_thread')
def handle_join_thread(payload):
    user = sid_users.get(request.sid)
    assignment_id = (payload or {}).get('assignment_id')
    if not user or not assignment_id:
        return

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
    finally:
        cursor.close()
        conn.close()

    if not _is_member(assignment, user['user_id']):
        emit('error', {'error': 'Not authorized for this thread'})
        return

    join_room(f"assignment:{assignment_id}")
    emit('joined', {'assignment_id': assignment_id})


@socketio.on('send_message')
def handle_send_message(payload):
    user = sid_users.get(request.sid)
    if not user:
        emit('error', {'error': 'Not authenticated'})
        return

    assignment_id = (payload or {}).get('assignment_id')
    content = ((payload or {}).get('content') or '').strip()
    if not assignment_id or not content:
        emit('error', {'error': 'assignment_id and content are required'})
        return

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, user['user_id']):
            emit('error', {'error': 'Not authorized for this thread'})
            return

        cursor.execute(
            "INSERT INTO chat_messages (assignment_id, sender_id, content) VALUES (%s, %s, %s)",
            (assignment_id, user['user_id'], content),
        )
        message_id = cursor.lastrowid
        conn.commit()

        cursor.execute(
            "SELECT id, assignment_id, sender_id, content, is_read, created_at "
            "FROM chat_messages WHERE id = %s",
            (message_id,),
        )
        message = cursor.fetchone()
        message['created_at'] = message['created_at'].isoformat()
    except Exception as e:
        conn.rollback()
        emit('error', {'error': str(e)})
        return
    finally:
        cursor.close()
        conn.close()

    # Deliver to both participants' personal rooms so the message arrives
    # whether or not either of them currently has this specific thread open.
    emit('new_message', message, room=f"user:{assignment['customer_id']}")
    emit('new_message', message, room=f"user:{assignment['trainer_id']}")
