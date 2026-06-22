from flask import Blueprint, request, jsonify
import bcrypt
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator
from pydantic import ConfigDict
from typing import Literal, Optional
from database.connection import get_connection
from middleware.auth import role_required
from utils.validation import pydantic_errors

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
    role: Literal['admin', 'dietitian', 'user'] = 'user'

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
    role: Optional[Literal['admin', 'dietitian', 'user']] = None
    is_active: Optional[bool] = None


class CreateExerciseSchema(BaseModel):
    name: str = Field(min_length=1)
    category: str = Field(min_length=1)
    calories_burned_per_hour: int = Field(default=0, ge=0)
    description: Optional[str] = None


class CreateProductSchema(BaseModel):
    name: str = Field(min_length=1)
    price: float = Field(gt=0)
    description: Optional[str] = None
    stock_quantity: int = Field(default=0, ge=0)
    category: str = 'strength'
    image_url: Optional[str] = None
    status: Literal['active', 'inactive'] = 'active'


class UpdateProductSchema(BaseModel):
    model_config = ConfigDict(extra='ignore')
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = Field(default=None, gt=0)
    stock_quantity: Optional[int] = Field(default=None, ge=0)
    image_url: Optional[str] = None
    status: Optional[Literal['active', 'inactive']] = None
    category: Optional[str] = None


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

@admin_bp.route('/categories', methods=['GET'])
@role_required('admin', 'dietitian', 'user')
def list_categories():
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(200, int(request.args.get('page_size', 20))))
    offset    = (page - 1) * page_size
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS total FROM categories WHERE deleted_at IS NULL")
        total = cursor.fetchone()['total']
        cursor.execute(
            "SELECT id, name, slug, description FROM categories "
            "WHERE deleted_at IS NULL ORDER BY id LIMIT %s OFFSET %s",
            (page_size, offset)
        )
        return jsonify({
            'items': cursor.fetchall(),
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
        })
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
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(100, int(request.args.get('page_size', 20))))
    search    = request.args.get('search', '').strip()
    offset    = (page - 1) * page_size
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        base_where = "WHERE u.deleted_at IS NULL"
        params_count = []
        if search:
            like = f"%{search}%"
            base_where += " AND (u.name LIKE %s OR u.email LIKE %s)"
            params_count = [like, like]
        cursor.execute(
            f"SELECT COUNT(*) AS total FROM users u {base_where}", params_count
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT u.id, u.name, u.email, u.role, u.is_active, u.created_at, "
            f"p.goal, p.weight_kg, p.height_cm "
            f"FROM users u LEFT JOIN user_profiles p ON u.id = p.user_id "
            f"{base_where} ORDER BY u.created_at DESC LIMIT %s OFFSET %s",
            params_count + [page_size, offset]
        )
        return jsonify({
            'items': cursor.fetchall(),
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
        })
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
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,%s)",
            (body.name, body.email, password_hash, body.role),
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


# ── Exercises ────────────────────────────────────────────────────────────────

@admin_bp.route('/exercises', methods=['GET'])
@role_required('admin', 'dietitian', 'user')
def list_exercises():
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(200, int(request.args.get('page_size', 20))))
    search    = request.args.get('search', '').strip()
    category  = request.args.get('category', '').strip()
    offset    = (page - 1) * page_size
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conditions = ["deleted_at IS NULL"]
        params = []
        if search:
            conditions.append("name LIKE %s")
            params.append(f"%{search}%")
        if category:
            conditions.append("category = %s")
            params.append(category)
        where = "WHERE " + " AND ".join(conditions)
        cursor.execute(f"SELECT COUNT(*) AS total FROM exercises {where}", params)
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT * FROM exercises {where} ORDER BY category, name LIMIT %s OFFSET %s",
            params + [page_size, offset]
        )
        return jsonify({
            'items': cursor.fetchall(),
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
        })
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/exercises', methods=['POST'])
@role_required('admin')
def create_exercise():
    try:
        body = CreateExerciseSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO exercises (name, category, calories_burned_per_hour, description) VALUES (%s,%s,%s,%s)",
            (body.name, body.category, body.calories_burned_per_hour, body.description),
        )
        conn.commit()
        return jsonify({'id': cursor.lastrowid, 'message': 'Exercise created'}), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/exercises/<int:eid>', methods=['DELETE'])
@role_required('admin')
def delete_exercise(eid):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE exercises SET deleted_at = NOW() WHERE id = %s", (eid,))
        conn.commit()
        return jsonify({'message': 'Exercise deleted'})
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
    "p.image_url, p.status, p.created_at, u.name AS created_by_name "
    "FROM products p "
    "JOIN categories c ON p.category_id = c.id "
    "LEFT JOIN users u ON p.created_by = u.id "
)


@admin_bp.route('/products', methods=['GET'])
@role_required('admin')
def list_products():
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(100, int(request.args.get('page_size', 10))))
    search    = request.args.get('search', '').strip()
    offset    = (page - 1) * page_size

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

        items = cursor.fetchall()
        return jsonify({
            'items': items,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),  # ceiling division
        })
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
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(100, int(request.args.get('page_size', 20))))
    offset    = (page - 1) * page_size
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
        return jsonify({
            'items': cursor.fetchall(),
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
        })
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

        cursor.execute(
            "INSERT INTO products (name, description, price, stock_quantity, category_id, status, created_by) "
            "VALUES (%s,%s,%s,%s,%s,'active',%s)",
            (req['product_name'], req['description'], body.price,
             body.stock_quantity, category_id, request.user_id),
        )
        product_id = cursor.lastrowid

        cursor.execute(
            "UPDATE product_requests SET status='approved', admin_note=%s, "
            "reviewed_by=%s, reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, request.user_id, rid),
        )
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
        cursor.execute("SELECT id, status FROM product_requests WHERE id = %s", (rid,))
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
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(100, int(request.args.get('page_size', 20))))
    status    = request.args.get('status', '').strip()
    offset    = (page - 1) * page_size
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
        return jsonify({
            'items': orders,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
        })
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
    cursor = conn.cursor()
    try:
        cursor.execute("UPDATE orders SET status = %s WHERE id = %s", (body.status, oid))
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
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(100, int(request.args.get('page_size', 20))))
    offset    = (page - 1) * page_size
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
        return jsonify({
            'items': cursor.fetchall(),
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
        })
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/trainer-assignments/<int:aid>/approve', methods=['PUT'])
@role_required('admin')
def approve_trainer_assignment(aid):
    try:
        body = TrainerAssignmentNoteSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM trainer_assignments WHERE id = %s", (aid,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assignment not found'}), 404
        if row['status'] != 'pending_admin':
            return jsonify({'error': 'Assignment is not pending admin review'}), 400

        cursor.execute(
            "UPDATE trainer_assignments SET status='approved', admin_note=%s, "
            "reviewed_by_admin=%s, admin_reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, request.user_id, aid),
        )
        conn.commit()
        return jsonify({'message': 'Trainer assignment approved'})
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@admin_bp.route('/trainer-assignments/<int:aid>/reject', methods=['PUT'])
@role_required('admin')
def reject_trainer_assignment(aid):
    try:
        body = TrainerAssignmentNoteSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM trainer_assignments WHERE id = %s", (aid,))
        row = cursor.fetchone()
        if not row:
            return jsonify({'error': 'Assignment not found'}), 404
        if row['status'] not in ('pending_admin', 'pending_trainer'):
            return jsonify({'error': 'Assignment cannot be rejected at this stage'}), 400

        cursor.execute(
            "UPDATE trainer_assignments SET status='rejected', admin_note=%s, "
            "reviewed_by_admin=%s, admin_reviewed_at=NOW() WHERE id = %s",
            (body.admin_note, request.user_id, aid),
        )
        conn.commit()
        return jsonify({'message': 'Trainer assignment rejected'})
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
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='user'")
        users_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM users WHERE role='dietitian'")
        dietitians_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM products WHERE status='active'")
        products_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM orders")
        orders_count = cursor.fetchone()['total']
        cursor.execute("SELECT COUNT(*) AS total FROM product_requests WHERE status='pending'")
        pending_requests = cursor.fetchone()['total']
        cursor.execute(
            "SELECT u.name, u.email, u.role, u.created_at "
            "FROM users u ORDER BY u.created_at DESC LIMIT 5"
        )
        recent_users = cursor.fetchall()
        return jsonify({
            'users': users_count,
            'dietitians': dietitians_count,
            'products': products_count,
            'orders': orders_count,
            'pending_requests': pending_requests,
            'recent_users': recent_users,
        })
    finally:
        cursor.close()
        conn.close()
