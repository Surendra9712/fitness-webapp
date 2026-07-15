from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from database.connection import get_connection
from dependencies import CurrentUser, require_roles
from utils.pagination import parse_page_params, paginated_response

router = APIRouter()


@router.get('')
def list_notifications(request: Request, user: CurrentUser = Depends(require_roles('admin', 'dietitian', 'trainee'))):
    page, page_size, offset = parse_page_params(request, default_size=20, max_size=100)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS total FROM notifications WHERE user_id = %s",
            (user.user_id,),
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            "SELECT id, type, title, message, reference_id, is_read, created_at "
            "FROM notifications WHERE user_id = %s "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (user.user_id, page_size, offset),
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@router.get('/unread-count')
def unread_count(user: CurrentUser = Depends(require_roles('admin', 'dietitian', 'trainee'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS count FROM notifications WHERE user_id = %s AND is_read = 0",
            (user.user_id,),
        )
        return {'count': cursor.fetchone()['count']}
    finally:
        cursor.close()
        conn.close()


@router.put('/{nid}/read')
def mark_read(nid: int, user: CurrentUser = Depends(require_roles('admin', 'dietitian', 'trainee'))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE id = %s AND user_id = %s",
            (nid, user.user_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return JSONResponse({'error': 'Notification not found'}, status_code=404)
        return {'message': 'Marked as read'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/read-all')
def mark_all_read(user: CurrentUser = Depends(require_roles('admin', 'dietitian', 'trainee'))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE notifications SET is_read = 1 WHERE user_id = %s AND is_read = 0",
            (user.user_id,),
        )
        conn.commit()
        return {'message': 'All marked as read'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.delete('/{nid}')
def delete_notification(nid: int, user: CurrentUser = Depends(require_roles('admin', 'dietitian', 'trainee'))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM notifications WHERE id = %s AND user_id = %s",
            (nid, user.user_id),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return JSONResponse({'error': 'Notification not found'}, status_code=404)
        return {'message': 'Deleted'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
