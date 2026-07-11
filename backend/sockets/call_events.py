import time

from flask import request
from flask_socketio import emit

from extensions import socketio
from database.connection import get_connection
from sockets.chat_events import sid_users, _get_assignment, _is_member, is_user_online

# assignment_id -> {'caller_id', 'callee_id', 'call_type', 'status', 'started_at'}
# Best-effort only: a stale 'ringing' entry self-heals because a fresh
# call:invite always overwrites it once it's past the ring-timeout window.
active_calls = {}

RING_TIMEOUT_SECONDS = 45


def _other_participant(assignment, user_id):
    return assignment['trainer_id'] if user_id == assignment['customer_id'] else assignment['customer_id']


def _log_call_message(assignment_id, caller_id, callee_id, call_type, outcome, duration_seconds):
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
    finally:
        cursor.close()
        conn.close()

    emit('new_message', message, room=f"user:{caller_id}")
    emit('new_message', message, room=f"user:{callee_id}")


@socketio.on('call:invite')
def handle_call_invite(payload):
    user = sid_users.get(request.sid)
    if not user:
        emit('call:error', {'error': 'Not authenticated'})
        return

    assignment_id = (payload or {}).get('assignment_id')
    call_type = (payload or {}).get('call_type')
    sdp = (payload or {}).get('sdp')
    if not assignment_id or call_type not in ('audio', 'video') or not sdp:
        emit('call:error', {'error': 'assignment_id, call_type and sdp are required'})
        return

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, user['user_id']):
            emit('call:error', {'error': 'Not authorized for this thread'})
            return

        existing = active_calls.get(assignment_id)
        if (
            existing
            and existing['status'] == 'ringing'
            and time.time() - existing['started_at'] < RING_TIMEOUT_SECONDS
        ):
            emit('call:busy', {'assignment_id': assignment_id})
            return

        callee_id = _other_participant(assignment, user['user_id'])
        if not is_user_online(callee_id):
            emit('call:offline', {'assignment_id': assignment_id})
            return

        active_calls[assignment_id] = {
            'caller_id': user['user_id'],
            'callee_id': callee_id,
            'call_type': call_type,
            'status': 'ringing',
            'started_at': time.time(),
        }

        cursor.execute(
            "SELECT name, profile_image_url FROM users WHERE id = %s",
            (user['user_id'],),
        )
        caller = cursor.fetchone() or {}
    finally:
        cursor.close()
        conn.close()

    emit(
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


@socketio.on('call:answer')
def handle_call_answer(payload):
    user = sid_users.get(request.sid)
    if not user:
        return

    assignment_id = (payload or {}).get('assignment_id')
    sdp = (payload or {}).get('sdp')
    call = active_calls.get(assignment_id)
    if not assignment_id or not sdp or not call or call['callee_id'] != user['user_id']:
        emit('call:error', {'error': 'No matching call to answer'})
        return

    call['status'] = 'connected'
    call['answered_at'] = time.time()
    emit(
        'call:answered',
        {'assignment_id': assignment_id, 'sdp': sdp},
        room=f"user:{call['caller_id']}",
    )


@socketio.on('call:ice-candidate')
def handle_call_ice_candidate(payload):
    user = sid_users.get(request.sid)
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
    emit(
        'call:ice-candidate',
        {'assignment_id': assignment_id, 'candidate': candidate},
        room=f"user:{target_id}",
    )


@socketio.on('call:decline')
def handle_call_decline(payload):
    user = sid_users.get(request.sid)
    if not user:
        return

    assignment_id = (payload or {}).get('assignment_id')
    call = active_calls.get(assignment_id)
    if not assignment_id or not call or call['callee_id'] != user['user_id']:
        return

    active_calls.pop(assignment_id, None)
    emit('call:declined', {'assignment_id': assignment_id}, room=f"user:{call['caller_id']}")
    _log_call_message(assignment_id, call['caller_id'], call['callee_id'], call['call_type'], 'declined', 0)


@socketio.on('call:end')
def handle_call_end(payload):
    user = sid_users.get(request.sid)
    if not user:
        return

    assignment_id = (payload or {}).get('assignment_id')
    call = active_calls.get(assignment_id)
    if not assignment_id or not call or user['user_id'] not in (call['caller_id'], call['callee_id']):
        return

    active_calls.pop(assignment_id, None)
    target_id = call['callee_id'] if user['user_id'] == call['caller_id'] else call['caller_id']
    emit(
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
    _log_call_message(assignment_id, call['caller_id'], call['callee_id'], call['call_type'], outcome, duration)
