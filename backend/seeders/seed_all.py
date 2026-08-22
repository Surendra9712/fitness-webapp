"""
Run every seeder in dependency order.

    python seeders/seed_all.py                 # seed on top of existing data
    python seeders/seed_all.py --fresh         # wipe everything first
    python seeders/seed_all.py --fresh --force # wipe without the prompt
    python seeders/seed_all.py --images        # download portraits too

An admin account is created first — clearing the database removes the one
seed_admin.py made, and without an admin nobody can reach the admin panel.
The admin also signs the seeded trainer assignments, which record which admin
approved them.

Trainees run before trainers because the trainer seeder assigns real trainees
as clients and has them leave reviews.
"""

import argparse
import os
import runpy
import sys

import bcrypt

from common import fail, get_connection, info, ok

ADMIN_EMAIL = 'admin@smartdiet.com'
ADMIN_PASSWORD = 'Admin@123'
ADMIN_NAME = 'Super Admin'


def ensure_admin() -> None:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute('SELECT id FROM users WHERE email = %s', (ADMIN_EMAIL,))
        if cursor.fetchone():
            ok(f'admin already exists ({ADMIN_EMAIL})')
            return
        pw_hash = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, status) "
            "VALUES (%s,%s,%s,'admin','active')",
            (ADMIN_NAME, ADMIN_EMAIL, pw_hash),
        )
        cursor.execute(
            'INSERT INTO user_profiles (user_id) VALUES (%s)', (cursor.lastrowid,)
        )
        conn.commit()
        ok(f'admin created — {ADMIN_EMAIL} / {ADMIN_PASSWORD}')
    finally:
        cursor.close()
        conn.close()


SEEDER_DIR = os.path.dirname(os.path.abspath(__file__))


def run(script: str, argv: list[str]) -> int:
    """Runs a sibling seeder in-process with the given argv."""
    saved = sys.argv
    sys.argv = [script, *argv]
    try:
        runpy.run_path(os.path.join(SEEDER_DIR, script), run_name='__main__')
        return 0
    except SystemExit as exc:
        return int(exc.code or 0)
    finally:
        sys.argv = saved


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--fresh', action='store_true', help='clear all data first')
    parser.add_argument('--force', action='store_true', help='no confirmation prompt')
    parser.add_argument('--images', action='store_true',
                        help='download portraits and product photos')
    # Accepted so older commands keep working; portraits are already off
    # unless --images is passed.
    parser.add_argument('--no-images', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--trainers', type=int, default=20)
    parser.add_argument('--trainees', type=int, default=30)
    args = parser.parse_args()

    want_images = args.images and not args.no_images
    # Products ship with real photos unless images are switched off outright;
    # a catalogue of blank tiles is not worth seeding.
    product_flag = ['--no-images'] if args.no_images else []
    people_flag = ['--images'] if want_images else []

    if args.fresh:
        info('\n── Clearing database ──')
        code = run('clear_data.py', ['--force'] if args.force else [])
        if code != 0:
            fail('clear step failed or was aborted — stopping')
            return code

    info('\n── Admin ──')
    ensure_admin()

    steps = [
        ('── Categories ──', 'seed_categories.py', []),
        ('── Products ──', 'seed_products.py', product_flag),
        # Trainees first: the trainer seeder pairs trainers with existing
        # trainees and seeds the reviews those clients left.
        ('── Trainees ──', 'seed_trainees.py', ['--count', str(args.trainees), *people_flag]),
        ('── Trainers ──', 'seed_trainers.py', ['--count', str(args.trainers), *people_flag]),
    ]
    for heading, script, argv in steps:
        info(f'\n{heading}')
        code = run(script, argv)
        if code != 0:
            fail(f'{script} failed — stopping')
            return code

    info('\nAll seeders finished.')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
