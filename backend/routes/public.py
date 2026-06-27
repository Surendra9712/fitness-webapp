from flask import Blueprint, request, jsonify
from database.connection import get_connection

public_bp = Blueprint('public', __name__)


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
            f"c.slug AS category, c.name AS category_name, p.image_url "
            f"FROM products p JOIN categories c ON p.category_id = c.id "
            f"WHERE {where} ORDER BY p.created_at DESC LIMIT %s OFFSET %s",
            params + [page_size, offset],
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


@public_bp.route('/products/<int:product_id>', methods=['GET'])
def get_product(product_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
            "c.slug AS category, c.name AS category_name, p.image_url "
            "FROM products p JOIN categories c ON p.category_id = c.id "
            "WHERE p.id = %s AND p.status = 'active' AND p.deleted_at IS NULL AND c.deleted_at IS NULL",
            (product_id,),
        )
        product = cursor.fetchone()
        if not product:
            return jsonify({'error': 'Product not found'}), 404
        return jsonify(product)
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
