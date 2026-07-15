import asyncio
import time

from extensions import sio
from database.connection import get_connection
from sockets.chat_events import sid_users, _get_assignment, _is_member, is_user_online

# assignment_id -> {'caller_id', 'callee_id', 'call_type', 'status', 'started_at'}
# Best-effort only: a stale 'ringing' entry self-heals because a fresh
# call:invite always overwrites it once it's past the ring-timeout window.
active_calls = {}

RING_TIMEOUT_SECONDS = 45


def _other_participant(assignment, user_id):
    return assignment['trainer_id'] if user_id == assignment['customer_id'] else assignment['customer_id']


def _log_call_message_sync(assignment_id, caller_id, callee_id, call_type, outcome, duration_seconds):
    """Record a call as a chat message so it shows up in the thread history
    the same way a text message or attachment would."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO chat_messages "
            "(assignment_id, sender_id, content, attachment_type, call_type, call_outcome, call_duration_seconds) "
            "VALUES (%s, %s, '', 'call', %s, %s, %s)",
            (assignment_id, caller_id, call_type, outcome, duration_seconds),
        )
        message_id = cursor.lastrowid
        conn.commit()

        cursor.execute(
            "SELECT id, assignment_id, sender_id, content, is_read, created_at, "
            "attachment_url, attachment_type, attachment_name, "
            "call_type, call_outcome, call_duration_seconds "
            "FROM chat_messages WHERE id = %s",
            (message_id,),
        )
        message = cursor.fetchone()
        message['created_at'] = message['created_at'].isoformat()
        return message
    finally:
        cursor.close()
        conn.close()


async def _log_call_message(assignment_id, caller_id, callee_id, call_type, outcome, duration_seconds):
    message = await asyncio.to_thread(
        _log_call_message_sync, assignment_id, caller_id, callee_id, call_type, outcome, duration_seconds,
    )
    await sio.emit('new_message', message, room=f"user:{caller_id}")
    await sio.emit('new_message', message, room=f"user:{callee_id}")


def _invite_lookup_sync(user_id, assignment_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, user_id):
            return None, None
        cursor.execute(
            "SELECT name, profile_image_url FROM users WHERE id = %s",
            (user_id,),
        )
        caller = cursor.fetchone() or {}
        return assignment, caller
    finally:
        cursor.close()
        conn.close()


@sio.on('call:invite')
async def handle_call_invite(sid, payload):
    user = sid_users.get(sid)
    if not user:
        await sio.emit('call:error', {'error': 'Not authenticated'}, room=sid)
        return

    assignment_id = (payload or {}).get('assignment_id')
    call_type = (payload or {}).get('call_type')
    sdp = (payload or {}).get('sdp')
    if not assignment_id or call_type not in ('audio', 'video') or not sdp:
        await sio.emit('call:error', {'error': 'assignment_id, call_type and sdp are required'}, room=sid)
        return

    assignment, caller = await asyncio.to_thread(_invite_lookup_sync, user['user_id'], assignment_id)
    if assignment is None:
        await sio.emit('call:error', {'error': 'Not authorized for this thread'}, room=sid)
        return

    existing = active_calls.get(assignment_id)
    if (
        existing
        and existing['status'] == 'ringing'
        and time.time() - existing['started_at'] < RING_TIMEOUT_SECONDS
    ):
        await sio.emit('call:busy', {'assignment_id': assignment_id}, room=sid)
        return

    callee_id = _other_participant(assignment, user['user_id'])
    if not is_user_online(callee_id):
        await sio.emit('call:offline', {'assignment_id': assignment_id}, room=sid)
        return

    active_calls[assignment_id] = {
        'caller_id': user['user_id'],
        'callee_id': callee_id,
        'call_type': call_type,
        'status': 'ringing',
        'started_at': time.time(),
    }

    await sio.emit(
        'call:incoming',
        {
            'assignment_id': assignment_id,
            'from_user_id': user['user_id'],
            'from_name': caller.get('name', ''),
            'from_image': caller.get('profile_image_url'),
            'call_type': call_type,
            'sdp': sdp,
        },
        room=f"user:{callee_id}",
    )


@sio.on('call:answer')
async def handle_call_answer(sid, payload):
    user = sid_users.get(sid)
    if not user:
        return

    assignment_id = (payload or {}).get('assignment_id')
    sdp = (payload or {}).get('sdp')
    call = active_calls.get(assignment_id)
    if not assignment_id or not sdp or not call or call['callee_id'] != user['user_id']:
        await sio.emit('call:error', {'error': 'No matching call to answer'}, room=sid)
        return

    call['status'] = 'connected'
    call['answered_at'] = time.time()
    await sio.emit(
        'call:answered',
        {'assignment_id': assignment_id, 'sdp': sdp},
        room=f"user:{call['caller_id']}",
    )


@sio.on('call:ice-candidate')
async def handle_call_ice_candidate(sid, payload):
    user = sid_users.get(sid)
    if not user:
        return

    assignment_id = (payload or {}).get('assignment_id')
    candidate = (payload or {}).get('candidate')
    call = active_calls.get(assignment_id)
    if not assignment_id or not candidate or not call:
        return
    if user['user_id'] not in (call['caller_id'], call['callee_id']):
        return

    target_id = call['callee_id'] if user['user_id'] == call['caller_id'] else call['caller_id']
    await sio.emit(
        'call:ice-candidate',
        {'assignment_id': assignment_id, 'candidate': candidate},
        room=f"user:{target_id}",
    )


@sio.on('call:decline')
async def handle_call_decline(sid, payload):
    user = sid_users.get(sid)
    if not user:
        return

    assignment_id = (payload or {}).get('assignment_id')
    call = active_calls.get(assignment_id)
    if not assignment_id or not call or call['callee_id'] != user['user_id']:
        return

    active_calls.pop(assignment_id, None)
    await sio.emit('call:declined', {'assignment_id': assignment_id}, room=f"user:{call['caller_id']}")
    await _log_call_message(assignment_id, call['caller_id'], call['callee_id'], call['call_type'], 'declined', 0)


@sio.on('call:end')
async def handle_call_end(sid, payload):
    user = sid_users.get(sid)
    if not user:
        return

    assignment_id = (payload or {}).get('assignment_id')
    call = active_calls.get(assignment_id)
    if not assignment_id or not call or user['user_id'] not in (call['caller_id'], call['callee_id']):
        return

    active_calls.pop(assignment_id, None)
    target_id = call['callee_id'] if user['user_id'] == call['caller_id'] else call['caller_id']
    await sio.emit(
        'call:ended',
        {'assignment_id': assignment_id, 'reason': 'hangup'},
        room=f"user:{target_id}",
    )

    if call['status'] == 'connected':
        duration = int(time.time() - call['answered_at'])
        outcome = 'completed'
    else:
        duration = 0
        outcome = 'canceled'
    await _log_call_message(assignment_id, call['caller_id'], call['callee_id'], call['call_type'], outcome, duration)
