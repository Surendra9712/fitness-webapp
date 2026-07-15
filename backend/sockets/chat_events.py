import asyncio

from extensions import sio
from database.connection import get_connection
from middleware.auth import decode_token_string

# sid -> {'user_id': int, 'role': str}. In-memory is fine for a single-process dev server.
sid_users = {}

# user_id -> set of sids currently connected as that user (a person can have
# more than one tab/device open). Used to tell whether a call target is
# reachable at all before ringing them.
online_sids_by_user = {}


def is_user_online(user_id):
    return bool(online_sids_by_user.get(user_id))


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


def _fetch_assignment_sync(assignment_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        return _get_assignment(cursor, assignment_id)
    finally:
        cursor.close()
        conn.close()


def _send_message_sync(assignment_id, sender_id, content, attachment_url, attachment_type, attachment_name):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, sender_id):
            return None, None

        cursor.execute(
            "INSERT INTO chat_messages (assignment_id, sender_id, content, attachment_url, attachment_type, attachment_name) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (assignment_id, sender_id, content, attachment_url, attachment_type, attachment_name),
        )
        message_id = cursor.lastrowid
        conn.commit()

        cursor.execute(
            "SELECT id, assignment_id, sender_id, content, is_read, created_at, "
            "attachment_url, attachment_type, attachment_name "
            "FROM chat_messages WHERE id = %s",
            (message_id,),
        )
        message = cursor.fetchone()
        message['created_at'] = message['created_at'].isoformat()
        return assignment, message
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


@sio.event
async def connect(sid, environ, auth):
    token = (auth or {}).get('token', '')
    data, err = decode_token_string(token)
    if err:
        return False
    sid_users[sid] = {'user_id': data['user_id'], 'role': data['role']}
    online_sids_by_user.setdefault(data['user_id'], set()).add(sid)
    # Personal room so this user receives messages for ANY of their threads
    # (e.g. sidebar previews/unread counts), not just the one they currently
    # have open — join_thread's per-assignment room only covers that thread's
    # live view.
    await sio.enter_room(sid, f"user:{data['user_id']}")


@sio.event
async def disconnect(sid):
    user = sid_users.pop(sid, None)
    if not user:
        return
    sids = online_sids_by_user.get(user['user_id'])
    if sids:
        sids.discard(sid)
        if not sids:
            online_sids_by_user.pop(user['user_id'], None)


@sio.on('join_thread')
async def handle_join_thread(sid, payload):
    user = sid_users.get(sid)
    assignment_id = (payload or {}).get('assignment_id')
    if not user or not assignment_id:
        return

    assignment = await asyncio.to_thread(_fetch_assignment_sync, assignment_id)

    if not _is_member(assignment, user['user_id']):
        await sio.emit('error', {'error': 'Not authorized for this thread'}, room=sid)
        return

    await sio.enter_room(sid, f"assignment:{assignment_id}")
    await sio.emit('joined', {'assignment_id': assignment_id}, room=sid)


@sio.on('send_message')
async def handle_send_message(sid, payload):
    user = sid_users.get(sid)
    if not user:
        await sio.emit('error', {'error': 'Not authenticated'}, room=sid)
        return

    assignment_id = (payload or {}).get('assignment_id')
    content = ((payload or {}).get('content') or '').strip()
    attachment_url = (payload or {}).get('attachment_url') or None
    attachment_type = (payload or {}).get('attachment_type') or None
    attachment_name = (payload or {}).get('attachment_name') or None
    if not assignment_id or (not content and not attachment_url):
        await sio.emit('error', {'error': 'assignment_id and content or attachment are required'}, room=sid)
        return

    try:
        assignment, message = await asyncio.to_thread(
            _send_message_sync, assignment_id, user['user_id'], content,
            attachment_url, attachment_type, attachment_name,
        )
    except Exception as e:
        await sio.emit('error', {'error': str(e)}, room=sid)
        return

    if assignment is None:
        await sio.emit('error', {'error': 'Not authorized for this thread'}, room=sid)
        return

    # Deliver to both participants' personal rooms so the message arrives
    # whether or not either of them currently has this specific thread open.
    await sio.emit('new_message', message, room=f"user:{assignment['customer_id']}")
    await sio.emit('new_message', message, room=f"user:{assignment['trainer_id']}")
