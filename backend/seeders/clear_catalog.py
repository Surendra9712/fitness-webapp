"""
Clear the whole shop domain: products, categories, orders, reviews, product
requests, promo codes, reward points, discounts and the shop notifications
they generated.

Users, trainers, trainer assignments, chats, meal logs and everything else
outside the shop are left alone.

Deletion order follows the foreign keys: order_items → orders → products →
categories. product_reviews cascades from products; product_requests and
promo_codes have no product foreign key and are cleared explicitly.

Usage:
    python seeders/clear_catalog.py                    # full shop wipe (asks first)
    python seeders/clear_catalog.py --force            # no prompt
    python seeders/clear_catalog.py --dry-run          # report only
    python seeders/clear_catalog.py --keep-orders      # keep sales history
    python seeders/clear_catalog.py --keep-promos      # keep promo codes + points
    python seeders/clear_catalog.py --products-only    # leave categories in place
    python seeders/clear_catalog.py --restore-defaults # re-add the 5 base categories
"""

import argparse

from common import fail, get_connection, info, ok, warn

DEFAULT_CATEGORIES = [
    ('Cardio', 'cardio'),
    ('Strength', 'strength'),
    ('Machines', 'machines'),
    ('Recovery', 'recovery'),
    ('Accessories', 'accessories'),
]

# Notifications produced by the shop. Trainer/subscription/chat ones are left.
SHOP_NOTIFICATION_TYPES = (
    'order_received', 'order_status',
    'product_request', 'product_request_approved', 'product_request_rejected',
    'global_discount', 'product_discount',
)

# site_settings rows holding the sitewide discount.
DISCOUNT_SETTING_KEYS = (
    'global_discount_active', 'global_discount_type', 'global_discount_value',
    'global_discount_valid_from', 'global_discount_valid_to',
)

REPORT_TABLES = (
    'categories', 'products', 'orders', 'order_items', 'product_reviews',
    'product_requests', 'promo_codes', 'point_transactions',
)


def snapshot(cursor) -> dict:
    out = {}
    for table in REPORT_TABLES:
        cursor.execute(f'SELECT COUNT(*) AS n FROM `{table}`')
        out[table] = cursor.fetchone()['n']
    placeholders = ', '.join(['%s'] * len(SHOP_NOTIFICATION_TYPES))
    cursor.execute(
        f'SELECT COUNT(*) AS n FROM notifications WHERE type IN ({placeholders})',
        SHOP_NOTIFICATION_TYPES,
    )
    out['shop notifications'] = cursor.fetchone()['n']
    cursor.execute('SELECT COALESCE(SUM(reward_points), 0) AS n FROM users')
    out['reward points held'] = cursor.fetchone()['n']
    return out


def show(label: str, data: dict) -> None:
    info(label)
    for key, value in data.items():
        print(f'  {key:<22} {value}')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true', help='skip confirmation')
    parser.add_argument('--dry-run', action='store_true')
    parser.add_argument('--keep-orders', action='store_true',
                        help='keep orders; products they reference survive too')
    parser.add_argument('--keep-promos', action='store_true',
                        help='keep promo codes, point transactions and reward points')
    parser.add_argument('--products-only', action='store_true',
                        help='leave categories in place')
    parser.add_argument('--restore-defaults', action='store_true',
                        help='re-insert the 5 built-in categories afterwards')
    args = parser.parse_args()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        show('Before:', snapshot(cursor))

        if args.keep_orders:
            cursor.execute(
                'SELECT COUNT(DISTINCT product_id) AS n FROM order_items '
                'WHERE product_id IS NOT NULL'
            )
            locked = cursor.fetchone()['n']
            if locked:
                warn(f'{locked} product(s) are in orders and will be KEPT '
                     '(order_items.product_id is a RESTRICT foreign key)')

        if args.dry_run:
            warn('\ndry run — nothing was deleted')
            return 0

        if not args.force:
            answer = input('\nDelete the shop data listed above? type "yes": ')
            if answer.strip().lower() != 'yes':
                warn('aborted')
                return 1

        print()

        if not args.keep_orders:
            cursor.execute('DELETE FROM order_items')
            ok(f'order items          {cursor.rowcount}')
            cursor.execute('DELETE FROM orders')
            ok(f'orders               {cursor.rowcount}')

        cursor.execute('DELETE FROM product_requests')
        ok(f'product requests     {cursor.rowcount}')

        # Anything still referenced by an order item stays — with --keep-orders
        # that is deliberate, and without it the subquery matches nothing.
        cursor.execute(
            'DELETE FROM products WHERE id NOT IN '
            '(SELECT DISTINCT product_id FROM order_items WHERE product_id IS NOT NULL)'
        )
        ok(f'products             {cursor.rowcount}   (product_reviews cascade)')

        if not args.products_only:
            # products.category_id is NOT NULL, so a category holding a kept
            # product cannot go.
            cursor.execute(
                'DELETE FROM categories WHERE id NOT IN '
                '(SELECT DISTINCT category_id FROM products)'
            )
            ok(f'categories           {cursor.rowcount}')

        if not args.keep_promos:
            cursor.execute('DELETE FROM point_transactions')
            ok(f'point transactions   {cursor.rowcount}')
            cursor.execute('DELETE FROM promo_codes')
            ok(f'promo codes          {cursor.rowcount}')
            cursor.execute('UPDATE users SET reward_points = 0 WHERE reward_points <> 0')
            ok(f'reward points reset  {cursor.rowcount} user(s)')

        placeholders = ', '.join(['%s'] * len(DISCOUNT_SETTING_KEYS))
        cursor.execute(
            f'DELETE FROM site_settings WHERE `key` IN ({placeholders})',
            DISCOUNT_SETTING_KEYS,
        )
        ok(f'discount settings    {cursor.rowcount}')

        placeholders = ', '.join(['%s'] * len(SHOP_NOTIFICATION_TYPES))
        cursor.execute(
            f'DELETE FROM notifications WHERE type IN ({placeholders})',
            SHOP_NOTIFICATION_TYPES,
        )
        ok(f'shop notifications   {cursor.rowcount}')

        if args.restore_defaults:
            cursor.executemany(
                'INSERT INTO categories (name, slug) VALUES (%s, %s) '
                'ON DUPLICATE KEY UPDATE deleted_at = NULL',
                DEFAULT_CATEGORIES,
            )
            ok(f'default categories   {len(DEFAULT_CATEGORIES)} restored')

        conn.commit()

        after = snapshot(cursor)
        print()
        show('After:', after)

        if after['products']:
            cursor.execute(
                'SELECT name FROM products WHERE id IN '
                '(SELECT DISTINCT product_id FROM order_items WHERE product_id IS NOT NULL) '
                'LIMIT 10'
            )
            kept = [row['name'] for row in cursor.fetchall()]
            if kept:
                warn('kept because they appear in orders: ' + ', '.join(kept))
        if not after['categories']:
            warn('no categories left — run seeders/seed_categories.py before '
                 'adding products, products.category_id requires one')
        return 0
    except Exception as exc:
        conn.rollback()
        fail(str(exc))
        return 1
    finally:
        cursor.close()
        conn.close()


if __name__ == '__main__':
    raise SystemExit(main())
