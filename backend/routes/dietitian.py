import json
from flask import Blueprint, request, jsonify
from pydantic import BaseModel, ValidationError, field_validator
from pydantic import ConfigDict
from typing import Optional, List
from database.connection import get_connection
from middleware.auth import role_required
from utils.validation import pydantic_errors
from utils.pagination import parse_page_params, paginated_response

dietitian_bp = Blueprint('dietitian', __name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class AssignmentNoteSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    trainer_note: Optional[str] = None


class UpdateTrainerProfileSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name:              Optional[str] = None
    full_name:         Optional[str] = None
    date_of_birth:     Optional[str] = None
    bio:               Optional[str] = None
    specialization:    Optional[str] = None
    experience_years:  Optional[int] = None
    profile_image_url: Optional[str] = None
    phone_number:      Optional[str] = None
    city:              Optional[str] = None
    country:           Optional[str] = None
    available_time:    Optional[List[dict]] = None  # [{"day":"Monday","from":"08:00","to":"17:00"}]


class CertificationSchema(BaseModel):
    name:         str
    issued_by:    Optional[str] = None
    issued_date:  Optional[str] = None
    file_url:     Optional[str] = None
    file_type:    str = 'url'

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError('Certification name is required')
        return v

    @field_validator('file_type')
    @classmethod
    def valid_file_type(cls, v: str) -> str:
        if v not in ('image', 'pdf', 'url'):
            raise ValueError('file_type must be image, pdf, or url')
        return v


# ── Routes ────────────────────────────────────────────────────────────────────

@dietitian_bp.route('/profile', methods=['GET'])
@role_required('dietitian', 'admin')
def get_profile():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, u.status, "
            "COALESCE(u.profile_image_url, p.profile_image_url) AS profile_image_url, "
            "p.full_name, p.date_of_birth, p.bio, p.specialization, "
            "p.experience_years, p.phone_number, p.city, p.country, p.available_time "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            "WHERE u.id = %s",
            (request.user_id,),
        )
        row = cursor.fetchone()
        if row:
            # Parse available_time JSON string returned by MySQL
            if isinstance(row.get('available_time'), str):
                try:
                    row['available_time'] = json.loads(row['available_time'])
                except (ValueError, TypeError):
                    row['available_time'] = []
            elif row.get('available_time') is None:
                row['available_time'] = []
            # Fetch certifications
            if row.get('date_of_birth'):
                import datetime
                dob = row['date_of_birth']
                if isinstance(dob, (datetime.date, datetime.datetime)):
                    row['date_of_birth'] = dob.isoformat()
            cursor.execute(
                "SELECT id, name, issued_by, issued_date, file_url, file_type, created_at "
                "FROM trainer_certifications WHERE user_id = %s ORDER BY created_at",
                (request.user_id,),
            )
            certs = cursor.fetchall()
            for c in certs:
                if hasattr(c.get('issued_date'), 'isoformat'):
                    c['issued_date'] = c['issued_date'].isoformat()
                if hasattr(c.get('created_at'), 'isoformat'):
                    c['created_at'] = c['created_at'].isoformat()
            row['certifications'] = certs
        return jsonify(row)
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/profile', methods=['PUT'])
@role_required('dietitian')
def update_profile():
    try:
        body = UpdateTrainerProfileSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    user_fields    = {k: v for k, v in updates.items() if k in ('name', 'profile_image_url')}
    profile_fields = {k: v for k, v in updates.items() if k not in ('name',)}

    # Serialize available_time list → JSON string for storage
    if 'available_time' in profile_fields:
        profile_fields['available_time'] = json.dumps(profile_fields['available_time'])

    conn = get_connection()
    cursor = conn.cursor()
    try:
        if user_fields:
            set_clause = ', '.join(f"{k} = %s" for k in user_fields)
            cursor.execute(
                f"UPDATE users SET {set_clause} WHERE id = %s",
                list(user_fields.values()) + [request.user_id],
            )
        if profile_fields:
            set_clause = ', '.join(f"{k} = %s" for k in profile_fields)
            cursor.execute(
                f"UPDATE user_profiles SET {set_clause} WHERE user_id = %s",
                list(profile_fields.values()) + [request.user_id],
            )
        conn.commit()
        return jsonify({'message': 'Profile updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/certifications', methods=['POST'])
@role_required('dietitian')
def add_certification():
    try:
        body = CertificationSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "INSERT INTO trainer_certifications (user_id, name, issued_by, issued_date, file_url, file_type) "
            "VALUES (%s, %s, %s, %s, %s, %s)",
            (
                request.user_id,
                body.name,
                body.issued_by or None,
                body.issued_date or None,
                body.file_url or None,
                body.file_type,
            ),
        )
        cert_id = cursor.lastrowid
        conn.commit()
        cursor.execute(
            "SELECT id, name, issued_by, issued_date, file_url, file_type, created_at "
            "FROM trainer_certifications WHERE id = %s",
            (cert_id,),
        )
        cert = cursor.fetchone()
        if cert:
            for field in ('issued_date', 'created_at'):
                if hasattr(cert.get(field), 'isoformat'):
                    cert[field] = cert[field].isoformat()
        return jsonify(cert), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/certifications/<int:cert_id>', methods=['DELETE'])
@role_required('dietitian')
def delete_certification(cert_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM trainer_certifications WHERE id = %s AND user_id = %s",
            (cert_id, request.user_id),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Certification not found'}), 404
        cursor.execute("DELETE FROM trainer_certifications WHERE id = %s", (cert_id,))
        conn.commit()
        return jsonify({'message': 'Deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@dietitian_bp.route('/users', methods=['GET'])
@role_required('admin', 'dietitian')
def list_users():
    """Approved customers for this trainer."""
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS total FROM trainer_assignments ta "
            "JOIN users u ON ta.customer_id = u.id "
            "WHERE ta.trainer_id = %s AND ta.status = 'approved' "
            "AND ta.deleted_at IS NULL AND u.deleted_at IS NULL",
            (request.user_id,)
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            "SELECT u.id, u.name, u.email, ta.created_at AS assigned_at "
            "FROM trainer_assignments ta "
            "JOIN users u ON ta.customer_id = u.id "
            "WHERE ta.trainer_id = %s AND ta.status = 'approved' "
            "AND ta.deleted_at IS NULL AND u.deleted_at IS NULL "
            "ORDER BY u.name LIMIT %s OFFSET %s",
            (request.user_id, page_size, offset),
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
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
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_where = "WHERE ta.trainer_id = %s AND ta.deleted_at IS NULL "
        if status_filter == 'all':
            cursor.execute(
                "SELECT COUNT(*) AS total FROM trainer_assignments ta " + base_where,
                (request.user_id,)
            )
            total = cursor.fetchone()['total']
            cursor.execute(
                "SELECT ta.*, u.name AS customer_name, u.email AS customer_email "
                "FROM trainer_assignments ta "
                "JOIN users u ON ta.customer_id = u.id "
                + base_where + "ORDER BY ta.created_at DESC LIMIT %s OFFSET %s",
                (request.user_id, page_size, offset)
            )
        else:
            cursor.execute(
                "SELECT COUNT(*) AS total FROM trainer_assignments ta " + base_where + "AND ta.status = %s",
                (request.user_id, status_filter)
            )
            total = cursor.fetchone()['total']
            cursor.execute(
                "SELECT ta.*, u.name AS customer_name, u.email AS customer_email "
                "FROM trainer_assignments ta "
                "JOIN users u ON ta.customer_id = u.id "
                + base_where + "AND ta.status = %s ORDER BY ta.created_at DESC LIMIT %s OFFSET %s",
                (request.user_id, status_filter, page_size, offset)
            )
        return paginated_response(cursor.fetchall(), total, page, page_size)
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
