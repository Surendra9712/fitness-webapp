from flask import Blueprint, request, jsonify
from database.connection import get_connection

public_bp = Blueprint('public', __name__)


@public_bp.route('/categories', methods=['GET'])
def list_categories():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT id, name, slug, icon FROM categories ORDER BY id")
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()


@public_bp.route('/products', methods=['GET'])
def list_products():
    category_slug = request.args.get('category', '').strip()
    search = request.args.get('q', '').strip()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        conditions = ["p.status = 'active'"]
        params = []

        if category_slug and category_slug != 'all':
            conditions.append("c.slug = %s")
            params.append(category_slug)

        if search:
            conditions.append("p.name LIKE %s")
            params.append(f"%{search}%")

        where = ' AND '.join(conditions)
        cursor.execute(
            f"SELECT p.id, p.name, p.description, p.price, p.stock_quantity, "
            f"c.slug AS category, c.name AS category_name, c.icon AS category_icon, p.image_url "
            f"FROM products p JOIN categories c ON p.category_id = c.id "
            f"WHERE {where} ORDER BY c.name, p.name",
            params,
        )
        return jsonify(cursor.fetchall())
    finally:
        cursor.close()
        conn.close()
