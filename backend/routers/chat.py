from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from database.connection import get_connection
from dependencies import CurrentUser, require_roles
from utils.pagination import parse_page_params
from extensions import emit_sync

router = APIRouter()


def _my_and_peer_columns(role: str):
    """Which trainer_assignments column is "me" vs the chat partner, based on role."""
    if role == 'dietitian':
        return 'trainer_id', 'customer_id'
    return 'customer_id', 'trainer_id'


def _get_assignment(cursor, assignment_id):
    cursor.execute(
        "SELECT id, customer_id, trainer_id, status FROM trainer_assignments "
        "WHERE id = %s AND deleted_at IS NULL",
        (assignment_id,),
    )
    return cursor.fetchone()


def _is_member(assignment, user_id):
    return assignment is not None and user_id in (assignment['customer_id'], assignment['trainer_id'])


@router.get('/threads')
def list_threads(user: CurrentUser = Depends(require_roles('trainee', 'dietitian'))):
    my_col, peer_col = _my_and_peer_columns(user.role)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f"SELECT ta.id AS assignment_id, u.id AS peer_id, u.name AS peer_name, "
            f"u.email AS peer_email, u.profile_image_url AS peer_image_url, "
            f"(SELECT CASE "
            f"     WHEN cm.attachment_type = 'call' AND cm.call_outcome = 'declined' THEN 'Declined call' "
            f"     WHEN cm.attachment_type = 'call' AND cm.call_outcome = 'canceled' THEN 'Missed call' "
            f"     WHEN cm.attachment_type = 'call' THEN CONCAT(CASE WHEN cm.call_type = 'video' THEN 'Video' ELSE 'Audio' END, ' call') "
            f"     WHEN cm.content != '' THEN cm.content "
            f"     WHEN cm.attachment_type = 'image' THEN 'Photo' "
            f"     WHEN cm.attachment_type = 'file' THEN CONCAT('File: ', cm.attachment_name) "
            f"     ELSE cm.content END "
            f" FROM chat_messages cm WHERE cm.assignment_id = ta.id "
            f"   AND cm.deleted_at IS NULL ORDER BY cm.id DESC LIMIT 1) AS last_message, "
            f"(SELECT created_at FROM chat_messages cm WHERE cm.assignment_id = ta.id "
            f"   AND cm.deleted_at IS NULL ORDER BY cm.id DESC LIMIT 1) AS last_message_at, "
            f"(SELECT COUNT(*) FROM chat_messages cm WHERE cm.assignment_id = ta.id "
            f"   AND cm.sender_id != %s AND cm.is_read = 0 AND cm.deleted_at IS NULL) AS unread_count "
            f"FROM trainer_assignments ta "
            f"JOIN users u ON u.id = ta.{peer_col} "
            f"WHERE ta.{my_col} = %s AND ta.status = 'approved' "
            f"AND ta.deleted_at IS NULL AND u.deleted_at IS NULL "
            f"ORDER BY last_message_at IS NULL, last_message_at DESC",
            (user.user_id, user.user_id),
        )
        return cursor.fetchall()
    finally:
        cursor.close()
        conn.close()


@router.get('/{assignment_id}/messages')
def get_messages(assignment_id: int, request: Request, user: CurrentUser = Depends(require_roles('trainee', 'dietitian'))):
    _, page_size, _ = parse_page_params(request, default_size=50, max_size=100)
    before_id_raw = request.query_params.get('before_id')
    before_id = int(before_id_raw) if before_id_raw else None

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, user.user_id) or assignment['status'] != 'approved':
            return JSONResponse({'error': 'Thread not found'}, status_code=404)

        params = [assignment_id]
        where_before = ''
        if before_id:
            where_before = 'AND id < %s'
            params.append(before_id)
        params.append(page_size)

        cursor.execute(
            f"SELECT id, assignment_id, sender_id, content, is_read, created_at, "
            f"attachment_url, attachment_type, attachment_name "
            f"FROM chat_messages WHERE assignment_id = %s AND deleted_at IS NULL {where_before} "
            f"ORDER BY id DESC LIMIT %s",
            params,
        )
        messages = cursor.fetchall()
        messages.reverse()
        for m in messages:
            m['created_at'] = m['created_at'].isoformat()
        return messages
    finally:
        cursor.close()
        conn.close()


@router.delete('/{assignment_id}/messages/{message_id}')
def delete_message(assignment_id: int, message_id: int, user: CurrentUser = Depends(require_roles('trainee', 'dietitian'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, user.user_id):
            return JSONResponse({'error': 'Thread not found'}, status_code=404)

        cursor.execute(
            "SELECT id, sender_id FROM chat_messages "
            "WHERE id = %s AND assignment_id = %s AND deleted_at IS NULL",
            (message_id, assignment_id),
        )
        message = cursor.fetchone()
        if not message:
            return JSONResponse({'error': 'Message not found'}, status_code=404)
        if message['sender_id'] != user.user_id:
            return JSONResponse({'error': 'You can only delete your own messages'}, status_code=403)

        cursor.execute("UPDATE chat_messages SET deleted_at = NOW() WHERE id = %s", (message_id,))
        conn.commit()

        recipient_id = (
            assignment['trainer_id']
            if user.user_id == assignment['customer_id']
            else assignment['customer_id']
        )
        payload = {'id': message_id, 'assignment_id': assignment_id}
        emit_sync('message_deleted', payload, room=f"user:{user.user_id}")
        emit_sync('message_deleted', payload, room=f"user:{recipient_id}")

        return {'message': 'Deleted'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/{assignment_id}/read')
def mark_thread_read(assignment_id: int, user: CurrentUser = Depends(require_roles('trainee', 'dietitian'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, user.user_id):
            return JSONResponse({'error': 'Thread not found'}, status_code=404)

        cursor.execute(
            "UPDATE chat_messages SET is_read = 1 "
            "WHERE assignment_id = %s AND sender_id != %s AND is_read = 0",
            (assignment_id, user.user_id),
        )
        conn.commit()
        return {'message': 'Marked read'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.get('/unread-count')
def unread_count(user: CurrentUser = Depends(require_roles('trainee', 'dietitian'))):
    my_col, _ = _my_and_peer_columns(user.role)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f"SELECT COUNT(*) AS count FROM chat_messages cm "
            f"JOIN trainer_assignments ta ON ta.id = cm.assignment_id "
            f"WHERE ta.{my_col} = %s AND ta.status = 'approved' AND ta.deleted_at IS NULL "
            f"AND cm.sender_id != %s AND cm.is_read = 0 AND cm.deleted_at IS NULL",
            (user.user_id, user.user_id),
        )
        return cursor.fetchone()
    finally:
        cursor.close()
        conn.close()
