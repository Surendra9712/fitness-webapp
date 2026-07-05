from flask import Blueprint, request, jsonify
from database.connection import get_connection
from middleware.auth import role_required
from utils.pagination import parse_page_params

chat_bp = Blueprint('chat', __name__)


def _my_and_peer_columns():
    """Which trainer_assignments column is "me" vs the chat partner, based on role."""
    if request.user_role == 'dietitian':
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


@chat_bp.route('/threads', methods=['GET'])
@role_required('trainee', 'dietitian')
def list_threads():
    my_col, peer_col = _my_and_peer_columns()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f"SELECT ta.id AS assignment_id, u.id AS peer_id, u.name AS peer_name, "
            f"u.email AS peer_email, u.profile_image_url AS peer_image_url, "
            f"(SELECT content FROM chat_messages cm WHERE cm.assignment_id = ta.id "
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
            (request.user_id, request.user_id),
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@chat_bp.route('/<int:assignment_id>/messages', methods=['GET'])
@role_required('trainee', 'dietitian')
def get_messages(assignment_id):
    _, page_size, _ = parse_page_params(default_size=50, max_size=100)
    before_id = request.args.get('before_id', type=int)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, request.user_id) or assignment['status'] != 'approved':
            return jsonify({'error': 'Thread not found'}), 404

        params = [assignment_id]
        where_before = ''
        if before_id:
            where_before = 'AND id < %s'
            params.append(before_id)
        params.append(page_size)

        cursor.execute(
            f"SELECT id, assignment_id, sender_id, content, is_read, created_at "
            f"FROM chat_messages WHERE assignment_id = %s AND deleted_at IS NULL {where_before} "
            f"ORDER BY id DESC LIMIT %s",
            params,
        )
        messages = cursor.fetchall()
        messages.reverse()
        for m in messages:
            m['created_at'] = m['created_at'].isoformat()
        return jsonify(messages)
    finally:
        cursor.close()
        conn.close()


@chat_bp.route('/<int:assignment_id>/read', methods=['PUT'])
@role_required('trainee', 'dietitian')
def mark_thread_read(assignment_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        assignment = _get_assignment(cursor, assignment_id)
        if not _is_member(assignment, request.user_id):
            return jsonify({'error': 'Thread not found'}), 404

        cursor.execute(
            "UPDATE chat_messages SET is_read = 1 "
            "WHERE assignment_id = %s AND sender_id != %s AND is_read = 0",
            (assignment_id, request.user_id),
        )
        conn.commit()
        return jsonify({'message': 'Marked read'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@chat_bp.route('/unread-count', methods=['GET'])
@role_required('trainee', 'dietitian')
def unread_count():
    my_col, _ = _my_and_peer_columns()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            f"SELECT COUNT(*) AS count FROM chat_messages cm "
            f"JOIN trainer_assignments ta ON ta.id = cm.assignment_id "
            f"WHERE ta.{my_col} = %s AND ta.status = 'approved' AND ta.deleted_at IS NULL "
            f"AND cm.sender_id != %s AND cm.is_read = 0 AND cm.deleted_at IS NULL",
            (request.user_id, request.user_id),
        )
        return jsonify(cursor.fetchone())
    finally:
        cursor.close()
        conn.close()
