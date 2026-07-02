import bcrypt
import json
from flask import Blueprint, request, jsonify
from pydantic import BaseModel, EmailStr, Field, ValidationError, field_validator
from typing import List, Optional
from database.connection import get_connection
from middleware.auth import generate_token
from routes.dietitian import CertificationSchema
from utils.notify import push_to_admins
from utils.validation import pydantic_errors

public_bp = Blueprint('public', __name__)


class PublicBecomeTrainerSchema(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=6)
    date_of_birth: str = Field(min_length=1)
    specialization: str = Field(min_length=1)
    experience_years: int
    bio: Optional[str] = None
    phone_number: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    profile_image_url: Optional[str] = None
    available_time: List[dict] = Field(default_factory=list)
    certifications: List[CertificationSchema] = Field(default_factory=list)

    @field_validator('name', mode='before')
    @classmethod
    def strip_name(cls, v):
        return str(v).strip() if v else v

    @field_validator('email', mode='before')
    @classmethod
    def normalise_email(cls, v):
        return str(v).strip().lower() if v else v


def _compute_discounted_price(price, discount_type, discount_value):
    """Return effective price after applying product-level discount, or None if no discount."""
    if not discount_type or not discount_value or float(discount_value) <= 0:
        return None
    price = float(price)
    dv = float(discount_value)
    if discount_type == 'percentage':
        return round(price * (1 - dv / 100), 2)
    return round(max(0.0, price - dv), 2)


@public_bp.route('/categories', methods=['GET'])
def list_categories():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, slug FROM categories WHERE deleted_at IS NULL ORDER BY id")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@public_bp.route('/products', methods=['GET'])
def list_products():
    category_slug = request.args.get('category', '').strip()
    search    = request.args.get('q', '').strip()
    page      = max(1, int(request.args.get('page', 1)))
    page_size = max(1, min(50, int(request.args.get('page_size', 12))))
    offset    = (page - 1) * page_size

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conditions = ["p.status = 'active'", "p.deleted_at IS NULL", "c.deleted_at IS NULL"]
        params = []

        if category_slug and category_slug != 'all':
            conditions.append("c.slug = %s")
            params.append(category_slug)

        if search:
            conditions.append("p.name LIKE %s")
            params.append(f"%{search}%")

        where = ' AND '.join(conditions)
        cursor.execute(
            f"SELECT COUNT(*) AS total FROM products p "
            f"JOIN categories c ON p.category_id = c.id WHERE {where}",
            params
        )
        total = cursor.fetchone()['total']
        cursor.execute(
            f"SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
            f"c.slug AS category, c.name AS category_name, p.image_url, "
            f"p.discount_type, p.discount_value "
            f"FROM products p JOIN categories c ON p.category_id = c.id "
            f"WHERE {where} ORDER BY p.created_at DESC LIMIT %s OFFSET %s",
            params + [page_size, offset],
        )
        rows = cursor.fetchall()
        for row in rows:
            row['discounted_price'] = _compute_discounted_price(
                row['price'], row.get('discount_type'), row.get('discount_value')
            )
        return jsonify({
            'items': rows,
            'total': total,
            'page': page,
            'page_size': page_size,
            'total_pages': max(1, -(-total // page_size)),
        })
    finally:
        cursor.close()
        conn.close()


@public_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
            "c.slug AS category, c.name AS category_name, p.image_url, "
            "p.discount_type, p.discount_value "
            "FROM products p JOIN categories c ON p.category_id = c.id "
            "WHERE p.id = %s AND p.status = 'active' AND p.deleted_at IS NULL AND c.deleted_at IS NULL",
            (product_id,),
        )
        product = cursor.fetchone()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        product['discounted_price'] = _compute_discounted_price(
            product['price'], product.get('discount_type'), product.get('discount_value')
        )
        return jsonify(product)
    finally:
        cursor.close()
        conn.close()


@public_bp.route('/global-discount', methods=['GET'])
def get_global_discount():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT `key`, value FROM site_settings "
            "WHERE `key` IN ('global_discount_type','global_discount_value','global_discount_active')"
        )
        s = {row['key']: row['value'] for row in cursor.fetchall()}
        return jsonify({
            'discount_type':  s.get('global_discount_type', 'percentage'),
            'discount_value': float(s.get('global_discount_value', '0') or '0'),
            'is_active':      s.get('global_discount_active', '0') == '1',
        })
    finally:
        cursor.close()
        conn.close()


@public_bp.route('/trainers', methods=['GET'])
def list_trainers():
    page_size = max(1, min(20, int(request.args.get('page_size', 6))))
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT u.id, u.name, u.profile_image_url, "
            "p.bio, p.specialization, "
            "COALESCE(AVG(r.rating), 0) AS avg_rating, "
            "COUNT(DISTINCT r.id) AS review_count, "
            "COUNT(DISTINCT ta.id) AS customer_count "
            "FROM users u "
            "LEFT JOIN user_profiles p ON u.id = p.user_id "
            "LEFT JOIN trainer_reviews r ON u.id = r.trainer_id "
            "LEFT JOIN trainer_assignments ta ON u.id = ta.trainer_id "
            "  AND ta.status = 'approved' AND ta.deleted_at IS NULL "
            "WHERE u.role = 'dietitian' AND u.status = 'active' AND u.deleted_at IS NULL "
            "GROUP BY u.id "
            "ORDER BY (COALESCE(AVG(r.rating), 0) * COUNT(DISTINCT r.id)) DESC, "
            "COUNT(DISTINCT ta.id) DESC "
            "LIMIT %s",
            (page_size,)
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@public_bp.route('/products/<int:product_id>/reviews', methods=['GET'])
def list_product_reviews(product_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT r.id, r.user_id, u.name AS user_name, r.rating, r.comment, r.created_at "
            "FROM product_reviews r JOIN users u ON r.user_id = u.id "
            "WHERE r.product_id = %s ORDER BY r.created_at DESC",
            (product_id,),
        )
        reviews = cursor.fetchall()
        avg = sum(r['rating'] for r in reviews) / len(reviews) if reviews else 0
        return jsonify({'reviews': reviews, 'avg_rating': round(avg, 1), 'count': len(reviews)})
    finally:
        cursor.close()
        conn.close()


@public_bp.route('/become-trainer', methods=['POST'])
def become_trainer_public():
    try:
        body = PublicBecomeTrainerSchema.model_validate(request.get_json() or {})
    except ValidationError as exc:
        return jsonify({'errors': pydantic_errors(exc)}), 422

    if not body.available_time:
        return jsonify({'error': 'At least one availability slot is required'}), 422
    if not body.certifications:
        return jsonify({'error': 'At least one certification is required'}), 422

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id FROM users WHERE email = %s", (body.email,))
        if cursor.fetchone():
            return jsonify({'errors': {'email': 'Email already registered'}}), 422

        password_hash = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, status, is_verified) "
            "VALUES (%s, %s, %s, 'dietitian', 'active', 0)",
            (body.name, body.email, password_hash),
        )
        user_id = cursor.lastrowid
        cursor.execute("INSERT INTO user_profiles (user_id) VALUES (%s)", (user_id,))

        profile_fields = {
            'full_name':         body.name,
            'date_of_birth':     body.date_of_birth,
            'bio':                body.bio,
            'specialization':    body.specialization,
            'experience_years':  body.experience_years,
            'phone_number':      body.phone_number,
            'city':              body.city,
            'country':           body.country,
            'profile_image_url': body.profile_image_url,
            'available_time':    json.dumps(body.available_time),
        }
        profile_fields = {k: v for k, v in profile_fields.items() if v is not None}
        set_clause = ', '.join(f"{k} = %s" for k in profile_fields)
        cursor.execute(
            f"UPDATE user_profiles SET {set_clause} WHERE user_id = %s",
            list(profile_fields.values()) + [user_id],
        )

        for cert in body.certifications:
            cursor.execute(
                "INSERT INTO trainer_certifications (user_id, name, issued_by, issued_date, file_url, file_type) "
                "VALUES (%s, %s, %s, %s, %s, %s)",
                (user_id, cert.name, cert.issued_by or None,
                 cert.issued_date or None, cert.file_url or None, cert.file_type),
            )

        push_to_admins(cursor, 'trainer_signup_request',
                       'New Trainer Request',
                       f"{body.name} has requested to become a trainer. Please review and verify.",
                       user_id)
        conn.commit()

        token = generate_token(user_id, 'dietitian')
        return jsonify({
            'token': token,
            'user': {'id': user_id, 'name': body.name, 'email': body.email, 'role': 'dietitian'},
        }), 201
    except Exception as e:
        conn.rollback()
        return jsonify({'error': str(e)}), 500
    finally:
        cursor.close()
        conn.close()
