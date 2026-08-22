"""
Wipe every row from every table, leaving the schema intact.

This deletes data only — it never drops or alters a table, so migrations stay
applied (use reset_db.py when you want the schema rebuilt instead).

Usage:
    python seeders/clear_data.py                # asks for confirmation
    python seeders/clear_data.py --force        # no prompt
    python seeders/clear_data.py --keep-admin   # keep admin accounts
    python seeders/clear_data.py --dry-run      # list tables, change nothing
"""

import argparse

from common import fail, get_connection, info, ok, warn

# Rows the app cannot boot without are re-inserted by schema.sql, so these are
# refilled rather than left empty.
DEFAULT_CATEGORIES = [
    ('Cardio', 'cardio'),
    ('Strength', 'strength'),
    ('Machines', 'machines'),
    ('Recovery', 'recovery'),
    ('Accessories', 'accessories'),
]


def all_tables(cursor) -> list[str]:
    cursor.execute('SELECT DATABASE()')
    db_name = cursor.fetchone()[0]
    cursor.execute(
        'SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES '
        "WHERE TABLE_SCHEMA = %s AND TABLE_TYPE = 'BASE TABLE' "
        'ORDER BY TABLE_NAME',
        (db_name,),
    )
    return [row[0] for row in cursor.fetchall()]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--force', action='store_true', help='skip confirmation')
    parser.add_argument('--keep-admin', action='store_true',
                        help='preserve admin users and their profiles')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    conn = get_connection()
    cursor = conn.cursor()
    try:
        tables = all_tables(cursor)
        info(f'{len(tables)} tables in this database:')
        print('  ' + ', '.join(tables))

        if args.dry_run:
            warn('dry run — nothing was deleted')
            return 0

        if not args.force:
            print()
            answer = input('Delete ALL rows from these tables? type "yes": ')
            if answer.strip().lower() != 'yes':
                warn('aborted')
                return 1

        admins = []
        if args.keep_admin:
            cursor.execute("SELECT id FROM users WHERE role = 'admin'")
            admins = [row[0] for row in cursor.fetchall()]
            info(f'keeping {len(admins)} admin account(s)')

        cursor.execute('SET FOREIGN_KEY_CHECKS = 0')
        for table in tables:
            if args.keep_admin and table in ('users', 'user_profiles'):
                continue
            cursor.execute(f'TRUNCATE TABLE `{table}`')
            ok(f'cleared {table}')

        if args.keep_admin and admins:
            placeholders = ', '.join(['%s'] * len(admins))
            cursor.execute(
                f'DELETE FROM user_profiles WHERE user_id NOT IN ({placeholders})',
                admins,
            )
            cursor.execute(
                f'DELETE FROM users WHERE id NOT IN ({placeholders})', admins
            )
            ok('cleared users / user_profiles (admins kept)')

        # categories is referenced by products.category_id with a hard FK, so
        # the app needs at least the default set to function.
        cursor.executemany(
            'INSERT INTO categories (name, slug) VALUES (%s, %s)',
            DEFAULT_CATEGORIES,
        )
        ok(f'restored {len(DEFAULT_CATEGORIES)} default categories')

        cursor.execute('SET FOREIGN_KEY_CHECKS = 1')
        conn.commit()
        info('\nDatabase cleared.')
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
