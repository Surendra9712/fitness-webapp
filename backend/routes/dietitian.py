from flask import Blueprint, request, jsonify
from pydantic import BaseModel, ValidationError
from pydantic import ConfigDict
from typing import Optional
from database.connection import get_connection
from middleware.auth import role_required
from utils.validation import pydantic_errors

dietitian_bp = Blueprint('dietitian', __name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class AssignmentNoteSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    trainer_note: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@dietitian_bp.route('/users', methods=['GET'])
@role_required('admin', 'dietitian')
def list_users():
    """Approved customers for this trainer."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, ta.created_at AS assigned_at "
            "FROM trainer_assignments ta "
            "JOIN users u ON ta.customer_id = u.id "
            "WHERE ta.trainer_id = %s AND ta.status = 'approved' "
            "AND ta.deleted_at IS NULL AND u.deleted_at IS NULL "
            "ORDER BY u.name",
            (request.user_id,),
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/stats', methods=['GET'])
@role_required('dietitian')
def stats():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS total FROM trainer_assignments "
            "WHERE trainer_id = %s AND status = 'approved' AND deleted_at IS NULL",
            (request.user_id,),
        )
        customers = cursor.fetchone()['total']
        cursor.execute(
            "SELECT COUNT(*) AS total FROM trainer_assignments "
            "WHERE trainer_id = %s AND status = 'pending_trainer' AND deleted_at IS NULL",
            (request.user_id,),
        )
        pending = cursor.fetchone()['total']
        return jsonify({'customers': int(customers), 'pending_requests': int(pending)})
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/assignment-requests', methods=['GET'])
@role_required('dietitian')
def list_assignment_requests():
    status_filter = request.args.get('status', 'pending_trainer')
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base = (
            "SELECT ta.*, u.name AS customer_name, u.email AS customer_email "
            "FROM trainer_assignments ta "
            "JOIN users u ON ta.customer_id = u.id "
            "WHERE ta.trainer_id = %s AND ta.deleted_at IS NULL "
        )
        if status_filter == 'all':
            cursor.execute(base + "ORDER BY ta.created_at DESC", (request.user_id,))
        else:
            cursor.execute(base + "AND ta.status = %s ORDER BY ta.created_at DESC",
                           (request.user_id, status_filter))
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/assignment-requests/<int:aid>/approve', methods=['PUT'])
@role_required('dietitian')
def approve_assignment(aid):
    try:
        body = AssignmentNoteSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM trainer_assignments WHERE id = %s AND trainer_id = %s",
            (aid, request.user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assignment not found'}), 404
        if row['status'] != 'pending_trainer':
            return jsonify({'error': 'Assignment is not pending your review'}), 400

        cursor.execute(
            "UPDATE trainer_assignments SET status='pending_admin', trainer_note=%s, "
            "trainer_reviewed_at=NOW() WHERE id = %s",
            (body.trainer_note, aid),
        )
        conn.commit()
        return jsonify({'message': 'Approved — awaiting admin confirmation'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/assignment-requests/<int:aid>/reject', methods=['PUT'])
@role_required('dietitian')
def reject_assignment(aid):
    try:
        body = AssignmentNoteSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM trainer_assignments WHERE id = %s AND trainer_id = %s",
            (aid, request.user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assignment not found'}), 404
        if row['status'] != 'pending_trainer':
            return jsonify({'error': 'Assignment is not pending your review'}), 400

        cursor.execute(
            "UPDATE trainer_assignments SET status='rejected', trainer_note=%s, "
            "trainer_reviewed_at=NOW() WHERE id = %s",
            (body.trainer_note, aid),
        )
        conn.commit()
        return jsonify({'message': 'Assignment rejected'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
