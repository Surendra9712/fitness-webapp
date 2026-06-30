from flask import Blueprint, request, jsonify
from database.connection import get_connection
from middleware.auth import role_required
from utils.pagination import parse_page_params, paginated_response

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@role_required('admin', 'dietitian', 'trainee')
def list_notifications():
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS total FROM notifications WHERE user_id = %s",
            (request.user_id,),
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            "SELECT id, type, title, message, reference_id, is_read, created_at "
            "FROM notifications WHERE user_id = %s "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (request.user_id, page_size, offset),
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route('/unread-count', methods=['GET'])
@role_required('admin', 'dietitian', 'trainee')
def unread_count():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS count FROM notifications WHERE user_id = %s AND is_read = 0",
            (request.user_id,),
        )
        return jsonify({'count': cursor.fetchone()['count']})
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route('/<int:nid>/read', methods=['PUT'])
@role_required('admin', 'dietitian', 'trainee')
def mark_read(nid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s",
            (nid, request.user_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Notification not found'}), 404
        return jsonify({'message': 'Marked as read'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route('/read-all', methods=['PUT'])
@role_required('admin', 'dietitian', 'trainee')
def mark_all_read():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = %s AND is_read = 0",
            (request.user_id,),
        )
        conn.commit()
        return jsonify({'message': 'All marked as read'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@notifications_bp.route('/<int:nid>', methods=['DELETE'])
@role_required('admin', 'dietitian', 'trainee')
def delete_notification(nid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM notifications WHERE id = %s AND user_id = %s",
            (nid, request.user_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({'error': 'Notification not found'}), 404
        return jsonify({'message': 'Deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
