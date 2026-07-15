from fastapi import APIRouter, Depends, Request, Response
from fastapi.responses import JSONResponse
import bcrypt
from pydantic import BaseModel, EmailStr, Field, field_validator
from pydantic import ConfigDict
from typing import Literal, Optional
from database.connection import get_connection
from dependencies import CurrentUser, require_roles
from utils.pagination import parse_page_params, paginated_response
from utils.notify import push, push_to_non_admins

router = APIRouter()


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
        return str(v).strip() if isinstance(v, str) else v

    @field_validator('email', mode='before')
    @classmethod
    def normalise_email(cls, v):
        return str(v).strip().lower() if isinstance(v, str) else v


class UpdateUserSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: Optional[str] = None
    role: Optional[Literal['admin', 'dietitian', 'trainee']] = None
    status: Optional[Literal['inactive', 'active', 'pending']] = None


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


class TrainerAssignmentNoteSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    admin_note: Optional[str] = None


# ── Categories ────────────────────────────────────────────────────────────────

@router.get('/categories')
def list_categories(request: Request, user: CurrentUser = Depends(require_roles('admin', 'dietitian', 'trainee'))):
    page, page_size, offset = parse_page_params(request, default_size=20, max_size=200)
    search = request.query_params.get('search', '').strip()

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


@router.post('/categories')
def create_category(body: CreateCategorySchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO categories (name, slug, description) VALUES (%s,%s,%s)",
            (body.name, body.slug, body.description),
        )
        conn.commit()
        return JSONResponse({'id': cursor.lastrowid, 'message': 'Category created'}, status_code=201)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/categories/{cid}')
def update_category(cid: int, body: UpdateCategorySchema, user: CurrentUser = Depends(require_roles('admin'))):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return JSONResponse({'error': 'No valid fields'}, status_code=400)

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [cid]
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE categories SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return {'message': 'Category updated'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.delete('/categories/{cid}')
def delete_category(cid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT COUNT(*) AS cnt FROM products WHERE category_id = %s AND deleted_at IS NULL",
            (cid,),
        )
        if cursor.fetchone()['cnt'] > 0:
            return JSONResponse({'error': 'Cannot delete category with existing products'}, status_code=409)
        cursor.execute("UPDATE categories SET deleted_at = NOW() WHERE id = %s", (cid,))
        conn.commit()
        return {'message': 'Category deleted'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Users ────────────────────────────────────────────────────────────────────

@router.get('/users')
def list_users(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    page, page_size, offset = parse_page_params(request, default_size=20, max_size=100)
    search = request.query_params.get('search', '').strip()
    status_filter    = request.query_params.get('status', '').strip()
    role_filter      = request.query_params.get('role', '').strip()
    verified_filter  = request.query_params.get('is_verified', '').strip()
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
        if verified_filter in ('0', '1'):
            base_where += " AND u.is_verified = %s"
            params_count = params_count + [int(verified_filter)]
        cursor.execute(
            f"SELECT COUNT(*) AS total FROM users u {base_where}", params_count
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT u.id, u.name, u.email, u.role, u.status, u.is_verified, u.created_at, "
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


@router.get('/users/{uid}')
def get_user(uid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.email, u.role, u.status, u.is_verified, u.created_at, "
            "p.goal, p.weight_kg, p.height_cm, p.gender, p.activity_level, "
            "p.full_name, p.date_of_birth, p.bio, p.specialization, p.phone_number, p.city, p.country, "
            "p.experience_years, p.available_time "
            "FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            "WHERE u.id = %s AND u.deleted_at IS NULL",
            (uid,)
        )
        found = cursor.fetchone()
        if not found:
            return JSONResponse({'error': 'User not found'}, status_code=404)
        if found.get('available_time') and isinstance(found['available_time'], str):
            import json as _json
            try:
                found['available_time'] = _json.loads(found['available_time'])
            except Exception:
                found['available_time'] = []
        if found.get('role') == 'dietitian':
            cursor.execute(
                "SELECT id, name, file_url, file_type, created_at "
                "FROM trainer_certifications WHERE user_id = %s ORDER BY created_at",
                (uid,)
            )
            found['certifications'] = cursor.fetchall()
        return found
    finally:
        cursor.close()
        conn.close()


@router.post('/users')
def create_user(body: CreateUserSchema, user: CurrentUser = Depends(require_roles('admin'))):
    password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cursor.fetchone():
            return JSONResponse({'errors': {'email': 'Email already registered'}}, status_code=422)
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
            (body.name, body.email, password_hash, body.role),
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO user_profiles (user_id) VALUES (%s)", (user_id,))
        conn.commit()
        return JSONResponse({'id': user_id, 'name': body.name, 'email': body.email, 'role': body.role}, status_code=201)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/users/{uid}')
def update_user(uid: int, body: UpdateUserSchema, user: CurrentUser = Depends(require_roles('admin'))):
    updates = body.model_dump(exclude_unset=True)
    if not updates:
        return JSONResponse({'error': 'No valid fields'}, status_code=400)

    set_clause = ', '.join(f"{k} = %s" for k in updates)
    values = list(updates.values()) + [uid]
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(f"UPDATE users SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return {'message': 'User updated'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.delete('/users/{uid}')
def delete_user(uid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE users SET deleted_at = NOW() WHERE id = %s", (uid,))
        conn.commit()
        return {'message': 'User deleted'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/users/{uid}/verify')
def verify_trainer(uid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT role, is_verified FROM users WHERE id = %s AND deleted_at IS NULL", (uid,))
        found = cursor.fetchone()
        if not found:
            return JSONResponse({'error': 'User not found'}, status_code=404)
        if found['role'] != 'dietitian':
            return JSONResponse({'error': 'Only trainers can be verified'}, status_code=400)
        new_val = 0 if found['is_verified'] else 1
        cursor.execute("UPDATE users SET is_verified = %s WHERE id = %s", (new_val, uid))
        conn.commit()
        return {'is_verified': bool(new_val)}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Subscriptions ────────────────────────────────────────────────────────────

@router.get('/subscriptions')
def list_subscriptions(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    page, page_size, offset = parse_page_params(request, default_size=20, max_size=100)
    search = request.query_params.get('search', '').strip()
    status_filter = request.query_params.get('status', 'pending').strip()
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


@router.put('/subscriptions/{uid}/approve')
def approve_subscription(uid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT subscription_plan, subscription_status FROM users WHERE id = %s AND deleted_at IS NULL",
            (uid,),
        )
        row = cursor.fetchone()
        if not row:
            return JSONResponse({'error': 'User not found'}, status_code=404)
        if row['subscription_status'] != 'pending':
            return JSONResponse({'error': 'No pending subscription request'}, status_code=400)
        cursor.execute(
            "UPDATE users SET subscription_status='active' WHERE id = %s", (uid,)
        )
        push(cursor, uid, 'subscription_approved',
             'Subscription Approved',
             'Your Pro subscription has been approved. Enjoy all Pro features!')
        conn.commit()
        return {'message': 'Subscription approved'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/subscriptions/{uid}/reject')
def reject_subscription(uid: int, body: RejectRequestSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT subscription_status FROM users WHERE id = %s AND deleted_at IS NULL",
            (uid,),
        )
        row = cursor.fetchone()
        if not row:
            return JSONResponse({'error': 'User not found'}, status_code=404)
        if row['subscription_status'] != 'pending':
            return JSONResponse({'error': 'No pending subscription request'}, status_code=400)
        cursor.execute(
            "UPDATE users SET subscription_plan='free', subscription_status='rejected' WHERE id = %s",
            (uid,),
        )
        note_suffix = f' Reason: {body.admin_note}' if body.admin_note else ''
        push(cursor, uid, 'subscription_rejected',
             'Subscription Request Declined',
             f'Your Pro subscription request was not approved. You remain on the Free plan.{note_suffix}')
        conn.commit()
        return {'message': 'Subscription rejected — user reverted to Free'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
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


@router.get('/products')
def list_products(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    page, page_size, offset = parse_page_params(request, default_size=10, max_size=100)
    search = request.query_params.get('search', '').strip()

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


@router.post('/products')
def create_product(body: CreateProductSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        category_id = _resolve_category_id(cursor, body.category)
        cursor.execute(
            "INSERT INTO products (name, description, price, stock_quantity, category_id, image_url, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,%s,%s,%s)",
            (body.name, body.description, body.price, body.stock_quantity,
             category_id, body.image_url, body.status, user.user_id),
        )
        conn.commit()
        return JSONResponse({'id': cursor.lastrowid, 'message': 'Product created'}, status_code=201)
    except ValueError as e:
        return JSONResponse({'error': str(e)}, status_code=400)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/products/{pid}')
def update_product(pid: int, body: UpdateProductSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        updates = body.model_dump(exclude_unset=True)
        if 'category' in updates:
            updates['category_id'] = _resolve_category_id(cursor, updates.pop('category'))

        if not updates:
            return JSONResponse({'error': 'No valid fields'}, status_code=400)

        set_clause = ', '.join(f"{k} = %s" for k in updates)
        values = list(updates.values()) + [pid]
        cursor.execute(f"UPDATE products SET {set_clause} WHERE id = %s", values)
        conn.commit()
        return {'message': 'Product updated'}
    except ValueError as e:
        return JSONResponse({'error': str(e)}, status_code=400)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.delete('/products/{pid}')
def delete_product(pid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE products SET deleted_at = NOW() WHERE id = %s", (pid,))
        conn.commit()
        return {'message': 'Product deleted'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Product Requests ──────────────────────────────────────────────────────────

@router.get('/product-requests')
def list_product_requests(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    status_filter = request.query_params.get('status', 'pending')
    page, page_size, offset = parse_page_params(request, default_size=20, max_size=100)
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


@router.put('/product-requests/{rid}/approve')
def approve_product_request(rid: int, body: ApproveProductRequestSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM product_requests WHERE id = %s", (rid,))
        req = cursor.fetchone()
        if not req:
            return JSONResponse({'error': 'Request not found'}, status_code=404)
        if req['status'] != 'pending':
            return JSONResponse({'error': 'Request already reviewed'}, status_code=400)

        category_id = _resolve_category_id(cursor, body.category)

        cursor.execute(
            "INSERT INTO products (name, description, price, stock_quantity, category_id, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,'active',%s)",
            (req['product_name'], req['description'], body.price,
             body.stock_quantity, category_id, user.user_id),
        )
        product_id = cursor.lastrowid

        cursor.execute(
            "UPDATE product_requests SET status='approved', admin_note=%s, "
            "reviewed_by=%s, reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, user.user_id, rid),
        )
        push(cursor, req['user_id'], 'product_request_approved',
             'Product Request Approved',
             f"Your request for '{req['product_name']}' has been approved and added to the store!",
             rid)
        conn.commit()
        return {'message': 'Request approved and product added', 'product_id': product_id}
    except ValueError as e:
        return JSONResponse({'error': str(e)}, status_code=400)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/product-requests/{rid}/reject')
def reject_product_request(rid: int, body: RejectRequestSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, status, user_id, product_name FROM product_requests WHERE id = %s", (rid,))
        req = cursor.fetchone()
        if not req:
            return JSONResponse({'error': 'Request not found'}, status_code=404)
        if req['status'] != 'pending':
            return JSONResponse({'error': 'Request already reviewed'}, status_code=400)

        cursor.execute(
            "UPDATE product_requests SET status='rejected', admin_note=%s, "
            "reviewed_by=%s, reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, user.user_id, rid),
        )
        note_suffix = f' Reason: {body.admin_note}' if body.admin_note else ''
        push(cursor, req['user_id'], 'product_request_rejected',
             'Product Request Declined',
             f"Your request for '{req['product_name']}' was not approved at this time.{note_suffix}",
             rid)
        conn.commit()
        return {'message': 'Request rejected'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Orders (admin view) ───────────────────────────────────────────────────────

@router.get('/orders')
def list_all_orders(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    page, page_size, offset = parse_page_params(request, default_size=20, max_size=100)
    status = request.query_params.get('status', '').strip()
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


@router.put('/orders/{oid}/status')
def update_order_status(oid: int, body: UpdateOrderStatusSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id, user_id, status, total_amount FROM orders WHERE id = %s AND deleted_at IS NULL",
            (oid,),
        )
        order = cursor.fetchone()
        if not order:
            return JSONResponse({'error': 'Order not found'}, status_code=404)

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
        return {'message': 'Order status updated'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.delete('/orders/{oid}')
def delete_order(oid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM orders WHERE id = %s AND deleted_at IS NULL", (oid,)
        )
        order = cursor.fetchone()
        if not order:
            return JSONResponse({'error': 'Order not found'}, status_code=404)

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
        return {'message': 'Order deleted'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Trainer Assignments ───────────────────────────────────────────────────────

@router.get('/trainer-assignments')
def list_trainer_assignments(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    status_filter = request.query_params.get('status', 'pending_admin')
    page, page_size, offset = parse_page_params(request, default_size=20, max_size=100)
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


@router.put('/trainer-assignments/{aid}/approve')
def approve_trainer_assignment(aid: int, body: TrainerAssignmentNoteSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM trainer_assignments WHERE id = %s", (aid,))
        row = cursor.fetchone()
        if not row:
            return JSONResponse({'error': 'Assignment not found'}, status_code=404)
        if row['status'] != 'pending_admin':
            return JSONResponse({'error': 'Assignment is not pending admin review'}, status_code=400)

        cursor.execute(
            "UPDATE trainer_assignments SET status='approved', admin_note=%s, "
            "reviewed_by_admin=%s, admin_reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, user.user_id, aid),
        )
        push(cursor, row['customer_id'], 'trainer_approved',
             'Trainer Assignment Approved',
             'Your trainer assignment has been fully approved. You can now connect with your trainer!',
             aid)
        push(cursor, row['trainer_id'], 'trainer_approved',
             'Assignment Approved by Admin',
             'The admin has approved your new client assignment.',
             aid)
        conn.commit()
        return {'message': 'Trainer assignment approved'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/trainer-assignments/{aid}/reject')
def reject_trainer_assignment(aid: int, body: TrainerAssignmentNoteSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM trainer_assignments WHERE id = %s", (aid,))
        row = cursor.fetchone()
        if not row:
            return JSONResponse({'error': 'Assignment not found'}, status_code=404)
        if row['status'] not in ('pending_admin', 'pending_trainer'):
            return JSONResponse({'error': 'Assignment cannot be rejected at this stage'}, status_code=400)

        cursor.execute(
            "UPDATE trainer_assignments SET status='rejected', admin_note=%s, "
            "reviewed_by_admin=%s, admin_reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, user.user_id, aid),
        )
        push(cursor, row['customer_id'], 'trainer_rejected',
             'Trainer Assignment Declined',
             'Your trainer assignment request was not approved by the admin.',
             aid)
        push(cursor, row['trainer_id'], 'trainer_rejected',
             'Assignment Declined by Admin',
             'The admin has declined the client assignment request.',
             aid)
        conn.commit()
        return {'message': 'Trainer assignment rejected'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Dashboard stats ──────────────────────────────────────────────────────────

@router.get('/stats')
def stats(user: CurrentUser = Depends(require_roles('admin'))):
    """Overall (all-time) KPI counts — no date filter."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='trainee' AND deleted_at IS NULL")
        users_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='dietitian' AND deleted_at IS NULL")
        dietitians_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='dietitian' AND is_verified=0 AND deleted_at IS NULL")
        pending_approvals = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM products WHERE status='active' AND deleted_at IS NULL")
        products_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM orders WHERE deleted_at IS NULL")
        orders_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM product_requests WHERE status='pending'")
        pending_requests = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM trainer_assignments WHERE status='pending_admin' AND deleted_at IS NULL")
        pending_assignments = cursor.fetchone()['total']

        cursor.execute("SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders WHERE deleted_at IS NULL")
        total_revenue = float(cursor.fetchone()['total'])
        cursor.execute(
            "SELECT COALESCE(SUM(total_amount), 0) AS total FROM orders "
            "WHERE deleted_at IS NULL AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)"
        )
        revenue_30d = float(cursor.fetchone()['total'])

        cursor.execute(
            "SELECT status, COUNT(*) AS count FROM orders "
            "WHERE deleted_at IS NULL GROUP BY status"
        )
        orders_by_status = {row['status']: row['count'] for row in cursor.fetchall()}

        cursor.execute(
            "SELECT status, COUNT(*) AS count FROM users "
            "WHERE role != 'admin' AND deleted_at IS NULL GROUP BY status"
        )
        users_by_status_raw = {row['status']: row['count'] for row in cursor.fetchall()}
        users_by_status = [
            {'status': 'Active',   'count': users_by_status_raw.get('active', 0)},
            {'status': 'Pending',  'count': users_by_status_raw.get('pending', 0)},
            {'status': 'Inactive', 'count': users_by_status_raw.get('inactive', 0)},
        ]

        return {
            'users': users_count,
            'dietitians': dietitians_count,
            'products': products_count,
            'orders': orders_count,
            'pending_requests': pending_requests,
            'pending_approvals': pending_approvals,
            'pending_assignments': pending_assignments,
            'total_revenue': total_revenue,
            'revenue_30d': revenue_30d,
            'orders_by_status': orders_by_status,
            'users_by_status': users_by_status,
        }
    finally:
        cursor.close()
        conn.close()


@router.get('/stats/trends')
def stats_trends(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    """Date-range charts: user_growth, order_trend, users_by_status."""
    from datetime import date, timedelta, datetime as dt
    today = date.today()
    date_from_str = request.query_params.get('date_from')
    date_to_str   = request.query_params.get('date_to')
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

        return {
            'user_growth': user_growth,
            'order_trend': order_trend,
            'group_by': 'month' if by_month else 'day',
            'date_from': str(date_from),
            'date_to': str(date_to),
        }
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


@router.get('/promo-codes')
def list_promo_codes(request: Request, user: CurrentUser = Depends(require_roles('admin'))):
    page, page_size, offset = parse_page_params(request)
    search = request.query_params.get('search', '').strip()
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


@router.post('/promo-codes')
def create_promo_code(body: CreatePromoCodeSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM promo_codes WHERE code = %s", (body.code,))
        if cursor.fetchone():
            return JSONResponse({'error': 'Promo code already exists'}, status_code=409)
        cursor.execute(
            "INSERT INTO promo_codes (code, description, discount_type, discount_value, "
            "min_order_amount, max_uses, valid_from, valid_to, is_active, created_by) "
            "VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)",
            (body.code, body.description, body.discount_type, body.discount_value,
             body.min_order_amount, body.max_uses, body.valid_from, body.valid_to,
             1 if body.is_active else 0, user.user_id),
        )
        promo_id = cursor.lastrowid
        conn.commit()
        cursor.execute("SELECT * FROM promo_codes WHERE id = %s", (promo_id,))
        return JSONResponse(cursor.fetchone(), status_code=201)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.put('/promo-codes/{promo_id}')
def update_promo_code(promo_id: int, body: UpdatePromoCodeSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM promo_codes WHERE id = %s", (promo_id,))
        if not cursor.fetchone():
            return JSONResponse({'error': 'Promo code not found'}, status_code=404)
        fields = body.model_dump(exclude_none=True)
        if not fields:
            return JSONResponse({'error': 'Nothing to update'}, status_code=400)
        set_clause = ", ".join(f"{k} = %s" for k in fields)
        cursor.execute(
            f"UPDATE promo_codes SET {set_clause} WHERE id = %s",
            list(fields.values()) + [promo_id],
        )
        conn.commit()
        cursor.execute("SELECT * FROM promo_codes WHERE id = %s", (promo_id,))
        return cursor.fetchone()
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.delete('/promo-codes/{promo_id}')
def delete_promo_code(promo_id: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("SELECT id FROM promo_codes WHERE id = %s", (promo_id,))
        if not cursor.fetchone():
            return JSONResponse({'error': 'Promo code not found'}, status_code=404)
        cursor.execute("DELETE FROM promo_codes WHERE id = %s", (promo_id,))
        conn.commit()
        return Response(status_code=204)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
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


@router.get('/global-discount')
def get_global_discount(user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        return _get_global_discount_settings(cursor)
    finally:
        cursor.close()
        conn.close()


@router.put('/global-discount')
def update_global_discount(body: GlobalDiscountSchema, user: CurrentUser = Depends(require_roles('admin'))):
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
                (key, value, user.user_id),
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
        return _get_global_discount_settings(cursor)
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


# ── Product Discounts (per-product) ──────────────────────────────────────────

@router.put('/products/{pid}/discount')
def set_product_discount(pid: int, body: SetProductDiscountSchema, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name FROM products WHERE id = %s AND deleted_at IS NULL", (pid,))
        product = cursor.fetchone()
        if not product:
            return JSONResponse({'error': 'Product not found'}, status_code=404)
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
        return {'message': 'Product discount set'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()


@router.delete('/products/{pid}/discount')
def clear_product_discount(pid: int, user: CurrentUser = Depends(require_roles('admin'))):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM products WHERE id = %s AND deleted_at IS NULL", (pid,))
        if not cursor.fetchone():
            return JSONResponse({'error': 'Product not found'}, status_code=404)
        cursor.execute(
            "UPDATE products SET discount_type = NULL, discount_value = NULL, "
            "discount_valid_from = NULL, discount_valid_to = NULL WHERE id = %s",
            (pid,),
        )
        conn.commit()
        return {'message': 'Product discount cleared'}
    except Exception as e:
        conn.rollback()
        return JSONResponse({'error': str(e)}, status_code=500)
    finally:
        cursor.close()
        conn.close()
