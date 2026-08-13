from flask import Blueprint, request, jsonify
import bcrypt
import json
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator
from pydantic import ConfigDict
from typing import Literal, Optional
from database.connection import get_connection
from middleware.auth import role_required
from utils.validation import pydantic_errors, clean_person_name, validate_person_name
from utils.pagination import parse_page_params, paginated_response
from utils.notify import push, push_to_non_admins
from utils.metrics import compute_body_metrics, age_from_dob

admin_bp = Blueprint('admin', __name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CreateCategorySchema(BaseModel):
    name: str = Field(min_length=1)
    slug: str = Field(min_length=1)
    description: Optional[str] = None

    @field_validator('name', 'slug', mode='before')
    @classmethod
    def strip_str(cls, v):
        return str(v).strip().lower() if isinstance(v, str) else v

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return str(v).strip() if isinstance(v, str) else v


class UpdateCategorySchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None


class CreateUserSchema(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    role: Literal['admin', 'dietitian', 'trainee'] = 'trainee'

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return clean_person_name(v)

    @field_validator('name', mode='after')
    @classmethod
    def check_name(cls, v):
        return validate_person_name(v)

    @field_validator('email', mode='before')
    @classmethod
    def normalise_email(cls, v):
        return str(v).strip().lower() if isinstance(v, str) else v


class UpdateUserSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: Optional[str] = None
    role: Optional[Literal['admin', 'dietitian', 'trainee']] = None
    status: Optional[Literal['inactive', 'active', 'pending']] = None

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return clean_person_name(v)

    @field_validator('name', mode='after')
    @classmethod
    def check_name(cls, v):
        # `name` writes straight to users.name, so an explicit blank is invalid.
        return validate_person_name(v)


class CreateProductSchema(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(gt=0)
    description: Optional[str] = None
    stock_quantity: int = Field(default=0, ge=0)
    category: str = 'strength'
    image_url: Optional[str] = None
    status: Literal['active', 'inactive'] = 'active'
    discount_type: Optional[Literal['percentage', 'fixed']] = None
    discount_value: Optional[float] = Field(default=None, gt=0)


class UpdateProductSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = None
    status: Optional[Literal['active', 'inactive']] = None
    category: Optional[str] = None
    discount_type: Optional[Literal['percentage', 'fixed']] = None
    discount_value: Optional[float] = None


class SetProductDiscountSchema(BaseModel):
    discount_type: Literal['percentage', 'fixed']
    discount_value: float = Field(gt=0)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None


class GlobalDiscountSchema(BaseModel):
    discount_type: Literal['percentage', 'fixed'] = 'percentage'
    discount_value: float = Field(default=0, ge=0)
    is_active: bool = False
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None


class ApproveProductRequestSchema(BaseModel):
    price: float = Field(gt=0)
    category: str = 'strength'
    stock_quantity: int = Field(default=0, ge=0)
    admin_note: Optional[str] = None


class RejectRequestSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    admin_note: Optional[str] = None


class UpdateOrderStatusSchema(BaseModel):
    status: Literal['pending', 'confirmed', 'shipped', 'delivered', 'cancelled']


# ── Categories ────────────────────────────────────────────────────────────────

@admin_bp.route('/categories', methods=['GET'])
@role_required('admin', 'dietitian', 'trainee')
def list_categories():
    page, page_size, offset = parse_page_params(default_size=20, max_size=200)
    search = request.args.get('search', '').strip()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if search:
            like = f"%{search}%"
            cursor.execute(
                "SELECT COUNT(*) AS total FROM categories WHERE deleted_at IS NULL "
                "AND (name LIKE %s OR slug LIKE %s OR description LIKE %s)",
                (like, like, like),
            )
            total = cursor.fetchone()['total']
            cursor.execute(
                "SELECT id, name, slug, description FROM categories "
                "WHERE deleted_at IS NULL AND (name LIKE %s OR slug LIKE %s OR description LIKE %s) "
                "ORDER BY id LIMIT %s OFFSET %s",
                (like, like, like, page_size, offset),
            )
        else:
            cursor.execute("SELECT COUNT(*) AS total FROM categories WHERE deleted_at IS NULL")
            total = cursor.fetchone()['total']
            cursor.execute(
                "SELECT id, name, slug, description FROM categories "
                "WHERE deleted_at IS NULL ORDER BY id LIMIT %s OFFSET %s",
                (page_size, offset)
            )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/categories', methods=['POST'])
@role_required('admin')
def create_category():
    try:
        body = CreateCategorySchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO categories (name, slug, description) VALUES (%s,%s,%s)",
            (body.name, body.slug, body.description),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Category created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/categories/<int:cid>', methods=['PUT'])
@role_required('admin')
def update_category(cid):
    try:
        body = UpdateCategorySchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [cid]
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE categories SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'Category updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/categories/<int:cid>', methods=['DELETE'])
@role_required('admin')
def delete_category(cid):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM products WHERE category_id = %s AND deleted_at IS NULL",
            (cid,),
        )
        if cursor.fetchone()['cnt'] > 0:
            return jsonify({'error': 'Cannot delete category with existing products'}), 409
        cursor.execute("UPDATE categories SET deleted_at = NOW() WHERE id = %s", (cid,))
        conn.commit()
        return jsonify({'message': 'Category deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Users ────────────────────────────────────────────────────────────────────

@admin_bp.route('/users', methods=['GET'])
@role_required('admin')
def list_users():
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    search = request.args.get('search', '').strip()
    status_filter    = request.args.get('status', '').strip()
    role_filter      = request.args.get('role', '').strip()
    request_filter   = request.args.get('trainer_request_status', '').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_where = "WHERE u.deleted_at IS NULL"
        params_count = []
        if search:
            like = f"%{search}%"
            base_where += " AND (u.name LIKE %s OR u.email LIKE %s)"
            params_count = [like, like]
        if status_filter:
            base_where += " AND u.status = %s"
            params_count = params_count + [status_filter]
        if role_filter:
            base_where += " AND u.role = %s"
            params_count = params_count + [role_filter]
        if request_filter in ('none', 'pending', 'approved', 'rejected'):
            base_where += " AND u.trainer_request_status = %s"
            params_count = params_count + [request_filter]
        cursor.execute(
            f"SELECT COUNT(*) AS total FROM users u {base_where}", params_count
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT u.id, u.name, u.email, u.role, u.status, "
            f"u.trainer_request_status, u.created_at, "
            f"p.specialization, p.bio, "
            f"(SELECT COUNT(*) FROM trainer_certifications tc WHERE tc.user_id = u.id) AS cert_count "
            f"FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            f"{base_where} ORDER BY u.created_at DESC LIMIT %s OFFSET %s",
            params_count + [page_size, offset]
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:uid>', methods=['GET'])
@role_required('admin', 'dietitian')
def get_user(uid):
    """Full user record. Admins may read anyone; a trainer only their own
    trainees (any assignment status — a pending request is exactly when they
    need the profile to decide whether to take the client on)."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if request.user_role != 'admin':
            cursor.execute(
                "SELECT 1 FROM trainer_assignments "
                "WHERE trainer_id = %s AND customer_id = %s AND deleted_at IS NULL "
                "LIMIT 1",
                (request.user_id, uid)
            )
            if not cursor.fetchone():
                return jsonify({'error': 'User not found'}), 404

        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, u.status, "
            "u.trainer_request_status, u.created_at, "
            "u.subscription_plan, u.subscription_status, "
            "p.goal, p.weight_kg, p.height_cm, p.gender, p.activity_level, "
            "p.full_name, p.date_of_birth, p.bio, p.specialization, p.phone_number, p.city, p.country, "
            "p.experience_years, p.available_time, p.occupation, "
            "p.current_weight_kg, p.primary_goal, p.fitness_level, p.target_water_ml, "
            "p.diet_type, p.dietary_restrictions, p.other_restrictions, p.allergens, "
            "p.cuisine_preferences, p.meals_per_day, p.health_conditions, p.notes, "
            "COALESCE(u.profile_image_url, p.profile_image_url) AS profile_image_url "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            "WHERE u.id = %s AND u.deleted_at IS NULL",
            (uid,)
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user.get('available_time') and isinstance(user['available_time'], str):
            import json as _json
            try:
                user['available_time'] = _json.loads(user['available_time'])
            except Exception:
                user['available_time'] = []
        for field in ('dietary_restrictions', 'allergens',
                      'cuisine_preferences', 'health_conditions'):
            raw = user.get(field)
            if isinstance(raw, str):
                try:
                    user[field] = json.loads(raw)
                except Exception:
                    user[field] = []
            elif raw is None:
                user[field] = []
        if user.get('role') == 'trainee':
            user['age'] = age_from_dob(user['date_of_birth']) if user.get('date_of_birth') else None
            user['metrics'] = compute_body_metrics(user)
        # Trainees with a trainer application have certifications too — the
        # admin reviewing the request needs to see them before approving.
        if user.get('role') == 'dietitian' or user.get('trainer_request_status') != 'none':
            cursor.execute(
                "SELECT id, name, file_url, file_type, created_at "
                "FROM trainer_certifications WHERE user_id = %s ORDER BY created_at",
                (uid,)
            )
            user['certifications'] = cursor.fetchall()
        return jsonify(user)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users', methods=['POST'])
@role_required('admin')
def create_user():
    try:
        body = CreateUserSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cursor.fetchone():
            return jsonify({'errors': {'email': 'Email already registered'}}), 422
        # A trainer created straight from the admin panel never goes through the
        # application queue, so it is approved on the spot.
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, trainer_request_status) "
            "VALUES (%s,%s,%s,%s,%s)",
            (body.name, body.email, password_hash, body.role,
             'approved' if body.role == 'dietitian' else 'none'),
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO user_profiles (user_id) VALUES (%s)", (user_id,))
        conn.commit()
        return jsonify({'id': user_id, 'name': body.name, 'email': body.email, 'role': body.role}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:uid>', methods=['PUT'])
@role_required('admin')
def update_user(uid):
    try:
        body = UpdateUserSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return jsonify({'error': 'No valid fields'}), 400

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [uid]
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE users SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'User updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:uid>', methods=['DELETE'])
@role_required('admin')
def delete_user(uid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET deleted_at = NOW() WHERE id = %s", (uid,))
        conn.commit()
        return jsonify({'message': 'User deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:uid>/verify', methods=['PUT'])
@role_required('admin')
def verify_trainer(uid):
    """Approve a trainer application.

    trainer_request_status='approved' is the single marketplace gate: it is what
    the trainee-facing listing, detail and booking queries check. This is also
    the only place role becomes 'dietitian'. To take an approved trainer out of
    circulation, disable the account (users.status) instead — there is no
    separate un-verify flag.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT name, role, trainer_request_status "
            "FROM users WHERE id = %s AND deleted_at IS NULL",
            (uid,),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user['trainer_request_status'] == 'approved':
            return jsonify({
                'role': user['role'],
                'trainer_request_status': 'approved',
            })
        if user['trainer_request_status'] not in ('pending', 'rejected'):
            return jsonify({'error': 'This user has no trainer request to approve'}), 400

        cursor.execute(
            "UPDATE users SET role='dietitian', trainer_request_status='approved' "
            "WHERE id = %s",
            (uid,),
        )
        push(cursor, uid, 'trainer_approved',
             'Trainer request approved',
             'Your trainer application was approved. Your trainer dashboard is now available.',
             uid)
        conn.commit()
        return jsonify({
            'role': 'dietitian',
            'trainer_request_status': 'approved',
        })
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/users/<int:uid>/trainer-request/reject', methods=['PUT'])
@role_required('admin')
def reject_trainer_request(uid):
    """Decline a pending trainer application. The applicant keeps their current
    role — a trainee stays a trainee and may apply again."""
    body = request.get_json(silent=True) or {}
    admin_note = (body.get('admin_note') or '').strip()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT name, trainer_request_status FROM users "
            "WHERE id = %s AND deleted_at IS NULL",
            (uid,),
        )
        user = cursor.fetchone()
        if not user:
            return jsonify({'error': 'User not found'}), 404
        if user['trainer_request_status'] != 'pending':
            return jsonify({'error': 'No pending trainer request for this user'}), 400

        cursor.execute(
            "UPDATE users SET trainer_request_status='rejected' WHERE id = %s",
            (uid,),
        )
        message = 'Your trainer application was not approved.'
        if admin_note:
            message = f'{message} Reason: {admin_note}'
        push(cursor, uid, 'trainer_rejected', 'Trainer request declined', message, uid)
        conn.commit()
        return jsonify({'trainer_request_status': 'rejected'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Subscriptions ────────────────────────────────────────────────────────────

@admin_bp.route('/subscriptions', methods=['GET'])
@role_required('admin')
def list_subscriptions():
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    search = request.args.get('search', '').strip()
    status_filter = request.args.get('status', 'pending').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_where = "WHERE u.role = 'trainee' AND u.deleted_at IS NULL"
        params = []
        if status_filter in ('pending', 'active', 'rejected'):
            base_where += " AND u.subscription_status = %s"
            params.append(status_filter)
        if search:
            base_where += " AND (u.name LIKE %s OR u.email LIKE %s)"
            params += [f"%{search}%", f"%{search}%"]
        cursor.execute(f"SELECT COUNT(*) AS total FROM users u {base_where}", params)
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT u.id, u.name, u.email, u.subscription_plan, u.subscription_status, "
            f"u.subscription_payment_method, u.created_at "
            f"FROM users u {base_where} ORDER BY u.created_at DESC LIMIT %s OFFSET %s",
            params + [page_size, offset],
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/subscriptions/<int:uid>/approve', methods=['PUT'])
@role_required('admin')
def approve_subscription(uid):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT subscription_plan, subscription_status FROM users WHERE id = %s AND deleted_at IS NULL",
            (uid,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'User not found'}), 404
        if row['subscription_status'] != 'pending':
            return jsonify({'error': 'No pending subscription request'}), 400
        cursor.execute(
            "UPDATE users SET subscription_status='active' WHERE id = %s", (uid,)
        )
        push(cursor, uid, 'subscription_approved',
             'Subscription Approved',
             'Your Pro subscription has been approved. Enjoy all Pro features!')
        conn.commit()
        return jsonify({'message': 'Subscription approved'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/subscriptions/<int:uid>/reject', methods=['PUT'])
@role_required('admin')
def reject_subscription(uid):
    try:
        body = RejectRequestSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT subscription_status FROM users WHERE id = %s AND deleted_at IS NULL",
            (uid,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'User not found'}), 404
        if row['subscription_status'] != 'pending':
            return jsonify({'error': 'No pending subscription request'}), 400
        cursor.execute(
            "UPDATE users SET subscription_plan='free', subscription_status='rejected' WHERE id = %s",
            (uid,),
        )
        note_suffix = f' Reason: {body.admin_note}' if body.admin_note else ''
        push(cursor, uid, 'subscription_rejected',
             'Subscription Request Declined',
             f'Your Pro subscription request was not approved. You remain on the Free plan.{note_suffix}')
        conn.commit()
        return jsonify({'message': 'Subscription rejected — user reverted to Free'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# ── Products ─────────────────────────────────────────────────────────────────

def _resolve_category_id(cursor, slug):
    """Look up category_id for a slug; raises ValueError if not found or soft-deleted."""
    cursor.execute(
        "SELECT id FROM categories WHERE slug = %s AND deleted_at IS NULL", (slug,)
    )
    row = cursor.fetchone()
    if not row:
        raise ValueError(f"Unknown category: {slug}")
    return row['id']


PRODUCT_SELECT = (
    "SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
    "c.slug AS category, c.name AS category_name, "
    "p.image_url, p.status, p.created_at, u.name AS created_by_name, "
    "p.discount_type, p.discount_value, "
    "p.discount_valid_from, p.discount_valid_to "
    "FROM products p "
    "JOIN categories c ON p.category_id = c.id "
    "LEFT JOIN users u ON p.created_by = u.id "
)


@admin_bp.route('/products', methods=['GET'])
@role_required('admin')
def list_products():
    page, page_size, offset = parse_page_params(default_size=10, max_size=100)
    search = request.args.get('search', '').strip()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if search:
            like = f"%{search}%"
            cursor.execute(
                "SELECT COUNT(*) AS total FROM products p "
                "JOIN categories c ON p.category_id = c.id "
                "WHERE p.deleted_at IS NULL "
                "AND (p.name LIKE %s OR p.description LIKE %s OR c.name LIKE %s)",
                (like, like, like),
            )
            total = cursor.fetchone()['total']
            cursor.execute(
                PRODUCT_SELECT +
                "WHERE p.deleted_at IS NULL "
                "AND (p.name LIKE %s OR p.description LIKE %s OR c.name LIKE %s) "
                "ORDER BY p.created_at DESC LIMIT %s OFFSET %s",
                (like, like, like, page_size, offset),
            )
        else:
            cursor.execute("SELECT COUNT(*) AS total FROM products WHERE deleted_at IS NULL")
            total = cursor.fetchone()['total']
            cursor.execute(
                PRODUCT_SELECT + "WHERE p.deleted_at IS NULL ORDER BY p.created_at DESC LIMIT %s OFFSET %s",
                (page_size, offset),
            )

        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products', methods=['POST'])
@role_required('admin')
def create_product():
    try:
        body = CreateProductSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        category_id = _resolve_category_id(cursor, body.category)
        cursor.execute(
            "INSERT INTO products (name, description, price, stock_quantity, category_id, image_url, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (body.name, body.description, body.price, body.stock_quantity,
             category_id, body.image_url, body.status, request.user_id),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Product created'}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products/<int:pid>', methods=['PUT'])
@role_required('admin')
def update_product(pid):
    try:
        body = UpdateProductSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        updates = body.model_dump(exclude_unset=True)
        if 'category' in updates:
            updates['category_id'] = _resolve_category_id(cursor, updates.pop('category'))

        if not updates:
            return jsonify({'error': 'No valid fields'}), 400

        set_clause = ', '.join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [pid]
        cursor.execute(f"UPDATE products SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return jsonify({'message': 'Product updated'})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products/<int:pid>', methods=['DELETE'])
@role_required('admin')
def delete_product(pid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE products SET deleted_at = NOW() WHERE id = %s", (pid,))
        conn.commit()
        return jsonify({'message': 'Product deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Product Requests ──────────────────────────────────────────────────────────

@admin_bp.route('/product-requests', methods=['GET'])
@role_required('admin')
def list_product_requests():
    status_filter = request.args.get('status', 'pending')
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_join = (
            "FROM product_requests pr JOIN users u ON pr.user_id = u.id "
            "LEFT JOIN users r ON pr.reviewed_by = r.id "
            "WHERE pr.deleted_at IS NULL "
        )
        count_select = "SELECT COUNT(*) AS total " + base_join
        data_select  = (
            "SELECT pr.*, u.name AS user_name, u.email AS user_email, "
            "r.name AS reviewed_by_name " + base_join
        )
        if status_filter == 'all':
            cursor.execute(count_select)
            total = cursor.fetchone()['total']
            cursor.execute(data_select + "ORDER BY pr.created_at DESC LIMIT %s OFFSET %s", (page_size, offset))
        else:
            cursor.execute(count_select + "AND pr.status = %s", (status_filter,))
            total = cursor.fetchone()['total']
            cursor.execute(data_select + "AND pr.status = %s ORDER BY pr.created_at DESC LIMIT %s OFFSET %s",
                           (status_filter, page_size, offset))
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/product-requests/<int:rid>/approve', methods=['PUT'])
@role_required('admin')
def approve_product_request(rid):
    try:
        body = ApproveProductRequestSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM product_requests WHERE id = %s", (rid,))
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found'}), 404
        if req['status'] != 'pending':
            return jsonify({'error': 'Request already reviewed'}), 400

        category_id = _resolve_category_id(cursor, body.category)

        # Carry the requester's suggested image over with the name/description —
        # without it an approved product lands in the catalog with no picture.
        cursor.execute(
            "INSERT INTO products (name, description, price, stock_quantity, category_id, image_url, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,'active',%s)",
            (req['product_name'], req['description'], body.price,
             body.stock_quantity, category_id, req.get('image_url'),
             request.user_id),
        )
        product_id = cursor.lastrowid

        cursor.execute(
            "UPDATE product_requests SET status='approved', admin_note=%s, "
            "reviewed_by=%s, reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, request.user_id, rid),
        )
        push(cursor, req['user_id'], 'product_request_approved',
             'Product Request Approved',
             f"Your request for '{req['product_name']}' has been approved and added to the store!",
             rid)
        conn.commit()
        return jsonify({'message': 'Request approved and product added', 'product_id': product_id})
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/product-requests/<int:rid>/reject', methods=['PUT'])
@role_required('admin')
def reject_product_request(rid):
    try:
        body = RejectRequestSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, status, user_id, product_name FROM product_requests WHERE id = %s", (rid,))
        req = cursor.fetchone()
        if not req:
            return jsonify({'error': 'Request not found'}), 404
        if req['status'] != 'pending':
            return jsonify({'error': 'Request already reviewed'}), 400

        cursor.execute(
            "UPDATE product_requests SET status='rejected', admin_note=%s, "
            "reviewed_by=%s, reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, request.user_id, rid),
        )
        note_suffix = f' Reason: {body.admin_note}' if body.admin_note else ''
        push(cursor, req['user_id'], 'product_request_rejected',
             'Product Request Declined',
             f"Your request for '{req['product_name']}' was not approved at this time.{note_suffix}",
             rid)
        conn.commit()
        return jsonify({'message': 'Request rejected'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Orders (admin view) ───────────────────────────────────────────────────────

@admin_bp.route('/orders', methods=['GET'])
@role_required('admin')
def list_all_orders():
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    status = request.args.get('status', '').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_where = "WHERE o.deleted_at IS NULL"
        params = []
        if status:
            base_where += " AND o.status = %s"
            params.append(status)
        cursor.execute(
            f"SELECT COUNT(*) AS total FROM orders o {base_where}", params
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT o.*, u.name AS user_name, u.email AS user_email "
            f"FROM orders o JOIN users u ON o.user_id = u.id "
            f"{base_where} ORDER BY o.created_at DESC LIMIT %s OFFSET %s",
            params + [page_size, offset]
        )
        orders = cursor.fetchall()
        for order in orders:
            cursor.execute(
                "SELECT oi.*, p.name AS product_name FROM order_items oi "
                "JOIN products p ON oi.product_id = p.id WHERE oi.order_id = %s",
                (order['id'],),
            )
            order['items'] = cursor.fetchall()
        return paginated_response(orders, total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/orders/<int:oid>/status', methods=['PUT'])
@role_required('admin')
def update_order_status(oid):
    try:
        body = UpdateOrderStatusSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, user_id, status, total_amount FROM orders WHERE id = %s AND deleted_at IS NULL",
            (oid,),
        )
        order = cursor.fetchone()
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        if body.status == "delivered":
            cursor.execute(
                "UPDATE orders SET status = %s, payment_status = 'paid' WHERE id = %s",
                (body.status, oid),
            )
        else:
            cursor.execute(
                "UPDATE orders SET status = %s WHERE id = %s",
                (body.status, oid),
            )
        # Award reward points only when order is first marked shipped
        if body.status == 'shipped' and order['status'] != 'shipped':
            points_earned = int(float(order['total_amount'] or 0) // 50)
            if points_earned > 0:
                cursor.execute(
                    "UPDATE users SET reward_points = reward_points + %s WHERE id = %s",
                    (points_earned, order['user_id']),
                )
                cursor.execute(
                    "INSERT INTO point_transactions (user_id, points, type, reference_id, description) "
                    "VALUES (%s, %s, 'earned', %s, %s)",
                    (order['user_id'], points_earned, oid, f"Points earned for order #{oid}"),
                )

        status_messages = {
            'confirmed':  'Your order has been confirmed and is being prepared.',
            'shipped':    'Great news — your order is on its way!',
            'delivered':  'Your order has been delivered. Enjoy!',
            'cancelled':  'Your order has been cancelled.',
        }
        msg = status_messages.get(body.status, f"Your order status changed to '{body.status}'.")
        push(cursor, order['user_id'], 'order_status',
             f"Order #{oid} — {body.status.capitalize()}",
             msg, oid)

        conn.commit()
        return jsonify({'message': 'Order status updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/orders/<int:oid>', methods=['DELETE'])
@role_required('admin')
def delete_order(oid):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM orders WHERE id = %s AND deleted_at IS NULL", (oid,)
        )
        order = cursor.fetchone()
        if not order:
            return jsonify({'error': 'Order not found'}), 404

        # Restore stock for COD orders that were not yet delivered
        if order['payment_method'] == 'cod' and order['status'] not in ('delivered', 'cancelled'):
            cursor.execute(
                "SELECT product_id, quantity FROM order_items WHERE order_id = %s", (oid,)
            )
            for item in cursor.fetchall():
                cursor.execute(
                    "UPDATE products SET stock_quantity = stock_quantity + %s WHERE id = %s",
                    (item['quantity'], item['product_id']),
                )

        cursor.execute(
            "UPDATE orders SET deleted_at = NOW() WHERE id = %s", (oid,)
        )
        conn.commit()
        return jsonify({'message': 'Order deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Trainer Assignments ───────────────────────────────────────────────────────

@admin_bp.route('/trainer-assignments', methods=['GET'])
@role_required('admin')
def list_trainer_assignments():
    status_filter = request.args.get('status', 'pending_admin')
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_join = (
            "FROM trainer_assignments ta "
            "JOIN users c ON ta.customer_id = c.id "
            "JOIN users t ON ta.trainer_id  = t.id "
            "LEFT JOIN users a ON ta.reviewed_by_admin = a.id "
            "WHERE ta.deleted_at IS NULL "
        )
        count_select = "SELECT COUNT(*) AS total " + base_join
        data_select  = (
            "SELECT ta.*, "
            "c.name AS customer_name, c.email AS customer_email, "
            "t.name AS trainer_name,  t.email AS trainer_email, "
            "a.name AS reviewed_by_name " + base_join
        )
        if status_filter == 'all':
            cursor.execute(count_select)
            total = cursor.fetchone()['total']
            cursor.execute(data_select + "ORDER BY ta.created_at DESC LIMIT %s OFFSET %s", (page_size, offset))
        else:
            cursor.execute(count_select + "AND ta.status = %s", (status_filter,))
            total = cursor.fetchone()['total']
            cursor.execute(data_select + "AND ta.status = %s ORDER BY ta.created_at DESC LIMIT %s OFFSET %s",
                           (status_filter, page_size, offset))
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


# Each admin-settable status: which statuses it may be reached from, the error
# when it can't, and the notification both parties get. Keeping the rules in one
# table is what lets a single endpoint serve approve / reject / unassign.
_ASSIGNMENT_STATUS_RULES = {
    'approved': {
        'from':  ('pending_admin',),
        'error': 'Assignment is not pending admin review',
        'type':  'trainer_approved',
        'customer': ('Trainer Assignment Approved',
                     'Your trainer assignment has been fully approved. '
                     'You can now connect with your trainer!'),
        'trainer':  ('Assignment Approved by Admin',
                     'The admin has approved your new client assignment.'),
        'echo_note': False,
        'message': 'Trainer assignment approved',
    },
    'rejected': {
        'from':  ('pending_admin', 'pending_trainer'),
        'error': 'Assignment cannot be rejected at this stage',
        'type':  'trainer_rejected',
        'customer': ('Trainer Assignment Declined',
                     'Your trainer assignment request was not approved by the admin.'),
        'trainer':  ('Assignment Declined by Admin',
                     'The admin has declined the client assignment request.'),
        'echo_note': True,
        'message': 'Trainer assignment rejected',
    },
    'ended': {
        'from':  ('approved',),
        'error': 'Only an approved assignment can be unassigned',
        'type':  'trainer_unassigned',
        'customer': ('Trainer Unassigned',
                     'An admin has ended your assignment with your trainer. '
                     'You can request a new trainer at any time.'),
        'trainer':  ('Client Assignment Ended',
                     'An admin has ended one of your client assignments.'),
        'echo_note': True,
        'message': 'Trainer unassigned',
    },
}


class UpdateAssignmentStatusSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    status: Literal['approved', 'rejected', 'ended']
    admin_note: Optional[str] = None


@admin_bp.route('/trainer-assignments/<int:aid>/status', methods=['PUT'])
@role_required('admin')
def update_trainer_assignment_status(aid):
    """Approve, reject or unassign an assignment — the target status comes in
    the payload. 'ended' means an approved pairing was stopped; since every
    access check elsewhere requires status = 'approved', that alone revokes
    chat/calls, drops the trainee from the trainer's client list, and frees the
    trainee to request a new trainer, while keeping the row for audit."""
    try:
        body = UpdateAssignmentStatusSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    rule = _ASSIGNMENT_STATUS_RULES[body.status]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM trainer_assignments WHERE id = %s AND deleted_at IS NULL",
            (aid,),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assignment not found'}), 404
        if row['status'] not in rule['from']:
            return jsonify({'error': rule['error']}), 400

        cursor.execute(
            "UPDATE trainer_assignments SET status=%s, admin_note=%s, "
            "reviewed_by_admin=%s, admin_reviewed_at=NOW() WHERE id = %s",
            (body.status, body.admin_note, request.user_id, aid),
        )

        suffix = f' Reason: {body.admin_note}' if body.admin_note and rule['echo_note'] else ''
        for user_key, party in (('customer_id', 'customer'), ('trainer_id', 'trainer')):
            title, message = rule[party]
            push(cursor, row[user_key], rule['type'], title, message + suffix, aid)

        conn.commit()
        return jsonify({'message': rule['message']})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Dashboard stats ──────────────────────────────────────────────────────────

@admin_bp.route('/stats', methods=['GET'])
@role_required('admin')
def stats():
    """Overall (all-time) KPI counts — no date filter.

    All eleven aggregates come from the sp_admin_stats stored procedure in one
    round trip. It returns three result sets: scalar totals, orders grouped by
    status, users grouped by status. Apply it with `python apply_procedures.py`.
    """
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.callproc('sp_admin_stats')
        result_sets = [rs.fetchall() for rs in cursor.stored_results()]
        if len(result_sets) != 3:
            return jsonify({'error': 'sp_admin_stats returned unexpected results'}), 500

        totals = result_sets[0][0]
        orders_by_status = {row['status']: row['count'] for row in result_sets[1]}
        users_by_status_raw = {row['status']: row['count'] for row in result_sets[2]}
        users_by_status = [
            {'status': 'Active',   'count': users_by_status_raw.get('active', 0)},
            {'status': 'Pending',  'count': users_by_status_raw.get('pending', 0)},
            {'status': 'Inactive', 'count': users_by_status_raw.get('inactive', 0)},
        ]

        return jsonify({
            'users': totals['users_count'],
            'dietitians': totals['dietitians_count'],
            'products': totals['products_count'],
            'orders': totals['orders_count'],
            'pending_requests': totals['pending_requests'],
            'pending_approvals': totals['pending_approvals'],
            'pending_assignments': totals['pending_assignments'],
            'total_revenue': float(totals['total_revenue']),
            'revenue_30d': float(totals['revenue_30d']),
            'orders_by_status': orders_by_status,
            'users_by_status': users_by_status,
        })
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/stats/trends', methods=['GET'])
@role_required('admin')
def stats_trends():
    """Date-range charts: user_growth, order_trend, users_by_status."""
    from datetime import date, timedelta, datetime as dt
    today = date.today()
    date_from_str = request.args.get('date_from')
    date_to_str   = request.args.get('date_to')
    try:
        date_from = dt.strptime(date_from_str, '%Y-%m-%d').date() if date_from_str else date(today.year, 1, 1)
    except ValueError:
        date_from = date(today.year, 1, 1)
    try:
        date_to = dt.strptime(date_to_str, '%Y-%m-%d').date() if date_to_str else today
    except ValueError:
        date_to = today

    if date_from > date_to:
        date_from, date_to = date_to, date_from

    span_days = (date_to - date_from).days
    by_month  = span_days > 60

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        if by_month:
            period_expr = "CONCAT(YEAR(created_at), '-', LPAD(MONTH(created_at), 2, '0'))"
            cursor.execute(
                f"SELECT {period_expr} AS period, COUNT(*) AS count "
                "FROM users WHERE deleted_at IS NULL "
                "AND DATE(created_at) BETWEEN %s AND %s "
                "GROUP BY period ORDER BY period",
                (str(date_from), str(date_to))
            )
            user_growth_raw = {row['period']: row['count'] for row in cursor.fetchall()}

            cursor.execute(
                f"SELECT {period_expr} AS period, COUNT(*) AS count, "
                "COALESCE(SUM(total_amount), 0) AS revenue "
                "FROM orders WHERE deleted_at IS NULL "
                "AND DATE(created_at) BETWEEN %s AND %s "
                "GROUP BY period ORDER BY period",
                (str(date_from), str(date_to))
            )
            order_trend_raw = {row['period']: {'count': row['count'], 'revenue': float(row['revenue'])}
                               for row in cursor.fetchall()}

            user_growth, order_trend = [], []
            from calendar import month_abbr
            y, m = date_from.year, date_from.month
            while (y, m) <= (date_to.year, date_to.month):
                key   = f'{y:04d}-{m:02d}'
                label = f"{month_abbr[m]} {y}" if span_days > 365 else month_abbr[m]
                user_growth.append({'date': label, 'users': user_growth_raw.get(key, 0)})
                od = order_trend_raw.get(key, {'count': 0, 'revenue': 0})
                order_trend.append({'date': label, 'orders': od['count'], 'revenue': od['revenue']})
                m += 1
                if m > 12:
                    m = 1
                    y += 1
        else:
            cursor.execute(
                "SELECT DATE(created_at) AS day, COUNT(*) AS count "
                "FROM users WHERE deleted_at IS NULL "
                "AND DATE(created_at) BETWEEN %s AND %s "
                "GROUP BY day ORDER BY day",
                (str(date_from), str(date_to))
            )
            user_growth_raw = {str(row['day']): row['count'] for row in cursor.fetchall()}

            cursor.execute(
                "SELECT DATE(created_at) AS day, COUNT(*) AS count, "
                "COALESCE(SUM(total_amount), 0) AS revenue "
                "FROM orders WHERE deleted_at IS NULL "
                "AND DATE(created_at) BETWEEN %s AND %s "
                "GROUP BY day ORDER BY day",
                (str(date_from), str(date_to))
            )
            order_trend_raw = {str(row['day']): {'count': row['count'], 'revenue': float(row['revenue'])}
                               for row in cursor.fetchall()}

            user_growth, order_trend = [], []
            cur = date_from
            while cur <= date_to:
                key   = str(cur)
                label = cur.strftime('%b %d')
                user_growth.append({'date': label, 'users': user_growth_raw.get(key, 0)})
                od = order_trend_raw.get(key, {'count': 0, 'revenue': 0})
                order_trend.append({'date': label, 'orders': od['count'], 'revenue': od['revenue']})
                cur += timedelta(days=1)

        return jsonify({
            'user_growth': user_growth,
            'order_trend': order_trend,
            'group_by': 'month' if by_month else 'day',
            'date_from': str(date_from),
            'date_to': str(date_to),
        })
    finally:
        cursor.close()
        conn.close()


# ── Promo Codes ───────────────────────────────────────────────────────────────

class CreatePromoCodeSchema(BaseModel):
    code: str = Field(min_length=2, max_length=50)
    description: Optional[str] = None
    discount_type: Literal['percentage', 'fixed'] = 'percentage'
    discount_value: float = Field(gt=0)
    min_order_amount: float = Field(default=0, ge=0)
    max_uses: Optional[int] = Field(default=None, ge=1)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    is_active: bool = True

    @field_validator('code', mode='before')
    @classmethod
    def upper_code(cls, v):
        return str(v).strip().upper() if isinstance(v, str) else v


class UpdatePromoCodeSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    description: Optional[str] = None
    discount_type: Optional[Literal['percentage', 'fixed']] = None
    discount_value: Optional[float] = Field(default=None, gt=0)
    min_order_amount: Optional[float] = Field(default=None, ge=0)
    max_uses: Optional[int] = Field(default=None, ge=1)
    valid_from: Optional[str] = None
    valid_to: Optional[str] = None
    is_active: Optional[bool] = None


@admin_bp.route('/promo-codes', methods=['GET'])
@role_required('admin')
def list_promo_codes():
    page, page_size, offset = parse_page_params()
    search = request.args.get('search', '').strip()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conditions, params = [], []
        if search:
            conditions.append("(code LIKE %s OR description LIKE %s)")
            params += [f"%{search}%", f"%{search}%"]
        where = ("WHERE " + " AND ".join(conditions)) if conditions else ""
        cursor.execute(f"SELECT COUNT(*) AS total FROM promo_codes {where}", params)
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT id, code, description, discount_type, discount_value, min_order_amount, "
            f"max_uses, current_uses, valid_from, valid_to, is_active, created_at "
            f"FROM promo_codes {where} ORDER BY created_at DESC LIMIT %s OFFSET %s",
            params + [page_size, offset],
        )
        return paginated_response(cursor.fetchall(), total, page, page_size)
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/promo-codes', methods=['POST'])
@role_required('admin')
def create_promo_code():
    try:
        body = CreatePromoCodeSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM promo_codes WHERE code = %s", (body.code,))
        if cursor.fetchone():
            return jsonify({'error': 'Promo code already exists'}), 409
        cursor.execute(
            "INSERT INTO promo_codes (code, description, discount_type, discount_value, "
            "min_order_amount, max_uses, valid_from, valid_to, is_active, created_by) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (body.code, body.description, body.discount_type, body.discount_value,
             body.min_order_amount, body.max_uses, body.valid_from, body.valid_to,
             1 if body.is_active else 0, request.user_id),
        )
        promo_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM promo_codes WHERE id = %s", (promo_id,))
        return jsonify(cursor.fetchone()), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/promo-codes/<int:promo_id>', methods=['PUT'])
@role_required('admin')
def update_promo_code(promo_id):
    try:
        body = UpdatePromoCodeSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM promo_codes WHERE id = %s", (promo_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Promo code not found'}), 404
        fields = body.model_dump(exclude_none=True)
        if not fields:
            return jsonify({'error': 'Nothing to update'}), 400
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        cursor.execute(
            f"UPDATE promo_codes SET {set_clause} WHERE id = %s",
            list(fields.values()) + [promo_id],
        )
        conn.commit()
        cursor.execute("SELECT * FROM promo_codes WHERE id = %s", (promo_id,))
        return jsonify(cursor.fetchone())
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/promo-codes/<int:promo_id>', methods=['DELETE'])
@role_required('admin')
def delete_promo_code(promo_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM promo_codes WHERE id = %s", (promo_id,))
        if not cursor.fetchone():
            return jsonify({'error': 'Promo code not found'}), 404
        cursor.execute("DELETE FROM promo_codes WHERE id = %s", (promo_id,))
        conn.commit()
        return '', 204
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Global Discount ───────────────────────────────────────────────────────────

def _get_global_discount_settings(cursor):
    cursor.execute(
        "SELECT `key`, value FROM site_settings "
        "WHERE `key` IN ('global_discount_type','global_discount_value','global_discount_active',"
        "'global_discount_valid_from','global_discount_valid_to')"
    )
    s = {row['key']: row['value'] for row in cursor.fetchall()}
    return {
        'discount_type':  s.get('global_discount_type', 'percentage'),
        'discount_value': float(s.get('global_discount_value', '0') or '0'),
        'is_active':      s.get('global_discount_active', '0') == '1',
        'valid_from':     s.get('global_discount_valid_from') or None,
        'valid_to':       s.get('global_discount_valid_to') or None,
    }


@admin_bp.route('/global-discount', methods=['GET'])
@role_required('admin')
def get_global_discount():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        return jsonify(_get_global_discount_settings(cursor))
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/global-discount', methods=['PUT'])
@role_required('admin')
def update_global_discount():
    try:
        body = GlobalDiscountSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        rows = [
            ('global_discount_type',       body.discount_type),
            ('global_discount_value',      str(body.discount_value)),
            ('global_discount_active',     '1' if body.is_active else '0'),
            ('global_discount_valid_from', body.valid_from or ''),
            ('global_discount_valid_to',   body.valid_to or ''),
        ]
        for key, value in rows:
            cursor.execute(
                "INSERT INTO site_settings (`key`, value, updated_by) VALUES (%s, %s, %s) "
                "ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)",
                (key, value, request.user_id),
            )
        if body.is_active and body.discount_value > 0:
            discount_label = (
                f"{int(body.discount_value)}% off"
                if body.discount_type == 'percentage'
                else f"Rs. {body.discount_value:.0f} off"
            )
            date_parts = []
            if body.valid_from:
                date_parts.append(f"from {body.valid_from}")
            if body.valid_to:
                date_parts.append(f"until {body.valid_to}")
            date_suffix = f" ({', '.join(date_parts)})" if date_parts else ''
            push_to_non_admins(
                cursor, 'global_discount',
                f"🛒 Sitewide Sale — {discount_label} on everything!",
                f"A sitewide discount of {discount_label} is now active on all products{date_suffix}. Don't miss out!",
            )
        conn.commit()
        return jsonify(_get_global_discount_settings(cursor))
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


# ── Product Discounts (per-product) ──────────────────────────────────────────

@admin_bp.route('/products/<int:pid>/discount', methods=['PUT'])
@role_required('admin')
def set_product_discount(pid):
    try:
        body = SetProductDiscountSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name FROM products WHERE id = %s AND deleted_at IS NULL", (pid,))
        product = cursor.fetchone()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        cursor.execute(
            "UPDATE products SET discount_type = %s, discount_value = %s, "
            "discount_valid_from = %s, discount_valid_to = %s WHERE id = %s",
            (body.discount_type, body.discount_value,
             body.valid_from or None, body.valid_to or None, pid),
        )
        discount_label = (
            f"{int(body.discount_value)}% off"
            if body.discount_type == 'percentage'
            else f"Rs. {body.discount_value:.0f} off"
        )
        date_parts = []
        if body.valid_from:
            date_parts.append(f"from {body.valid_from}")
        if body.valid_to:
            date_parts.append(f"until {body.valid_to}")
        date_suffix = f" ({', '.join(date_parts)})" if date_parts else ''
        push_to_non_admins(
            cursor, 'product_discount',
            f"🏷️ {discount_label} on {product['name']}",
            f"Get {discount_label} on {product['name']}{date_suffix}. Shop now!",
            pid,
        )
        conn.commit()
        return jsonify({'message': 'Product discount set'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


class UpdateContactStatusSchema(BaseModel):
    status: Literal['new', 'read', 'resolved']
    admin_note: Optional[str] = None


@admin_bp.route('/contact-messages', methods=['GET'])
@role_required('admin')
def list_contact_messages():
    status_filter = request.args.get('status', 'all')
    search = request.args.get('q', '').strip()
    page, page_size, offset = parse_page_params(default_size=20, max_size=100)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conditions = ["cm.deleted_at IS NULL"]
        params = []
        if status_filter and status_filter != 'all':
            conditions.append("cm.status = %s")
            params.append(status_filter)
        if search:
            conditions.append(
                "(cm.name LIKE %s OR cm.email LIKE %s OR cm.subject LIKE %s "
                "OR cm.message LIKE %s)"
            )
            params.extend([f"%{search}%"] * 4)
        where = " WHERE " + " AND ".join(conditions)

        base_join = "FROM contact_messages cm LEFT JOIN users h ON cm.handled_by = h.id" + where
        cursor.execute("SELECT COUNT(*) AS total " + base_join, params)
        total = cursor.fetchone()['total']

        cursor.execute(
            "SELECT cm.*, h.name AS handled_by_name " + base_join +
            " ORDER BY FIELD(cm.status,'new','read','resolved'), cm.created_at DESC "
            "LIMIT %s OFFSET %s",
            params + [page_size, offset],
        )
        rows = cursor.fetchall()

        cursor.execute(
            "SELECT status, COUNT(*) AS count FROM contact_messages "
            "WHERE deleted_at IS NULL GROUP BY status"
        )
        counts = {r['status']: r['count'] for r in cursor.fetchall()}

        return jsonify({
            'items': rows,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
            # Tab badges need the unfiltered totals, not just this page's slice.
            'counts': {
                'new':      counts.get('new', 0),
                'read':     counts.get('read', 0),
                'resolved': counts.get('resolved', 0),
            },
        })
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/contact-messages/<int:mid>/status', methods=['PUT'])
@role_required('admin')
def update_contact_message_status(mid):
    try:
        body = UpdateContactStatusSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM contact_messages WHERE id = %s AND deleted_at IS NULL",
            (mid,),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Message not found'}), 404

        # Reopening back to 'new' clears the handler so the row reads as untouched.
        if body.status == 'new':
            cursor.execute(
                "UPDATE contact_messages SET status = 'new', admin_note = %s, "
                "handled_by = NULL, handled_at = NULL WHERE id = %s",
                (body.admin_note, mid),
            )
        else:
            cursor.execute(
                "UPDATE contact_messages SET status = %s, admin_note = %s, "
                "handled_by = %s, handled_at = NOW() WHERE id = %s",
                (body.status, body.admin_note, request.user_id, mid),
            )
        conn.commit()
        return jsonify({'message': 'Message updated'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/contact-messages/<int:mid>', methods=['DELETE'])
@role_required('admin')
def delete_contact_message(mid):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM contact_messages WHERE id = %s AND deleted_at IS NULL",
            (mid,),
        )
        if not cursor.fetchone():
            return jsonify({'error': 'Message not found'}), 404
        cursor.execute(
            "UPDATE contact_messages SET deleted_at = NOW() WHERE id = %s", (mid,)
        )
        conn.commit()
        return jsonify({'message': 'Message deleted'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/products/<int:pid>/discount', methods=['DELETE'])
@role_required('admin')
def clear_product_discount(pid):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM products WHERE id = %s AND deleted_at IS NULL", (pid,))
        if not cursor.fetchone():
            return jsonify({'error': 'Product not found'}), 404
        cursor.execute(
            "UPDATE products SET discount_type = NULL, discount_value = NULL, "
            "discount_valid_from = NULL, discount_valid_to = NULL WHERE id = %s",
            (pid,),
        )
        conn.commit()
        return jsonify({'message': 'Product discount cleared'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
