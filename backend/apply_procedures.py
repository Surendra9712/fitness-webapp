"""
Stored procedure loader.

Every .sql file in database/procedures/ must hold exactly one
`CREATE PROCEDURE <name>(...) ... END` statement (no DELIMITER lines — the
connector sends the file as a single statement, so they are not needed and
would be a syntax error). Each file is re-applied as DROP + CREATE, which
makes running this script idempotent.

migrate.py syncs tables only; routines live here.

Usage:
    cd backend
    python apply_procedures.py             # apply every procedure
    python apply_procedures.py sp_admin_stats   # apply one by name
    python apply_procedures.py --dry-run
"""

import argparse
import os
import re
import sys

from database.connection import get_connection

PROCEDURES_DIR = os.path.join(os.path.dirname(__file__), 'database', 'procedures')

NAME_RE = re.compile(
    r'CREATE\s+(?:DEFINER\s*=\s*\S+\s+)?PROCEDURE\s+`?(\w+)`?', re.IGNORECASE
)


def strip_leading_comments(sql: str) -> str:
    """Drop the leading `--` comment block so the file starts at CREATE."""
    lines = sql.splitlines()
    while lines and (not lines[0].strip() or lines[0].lstrip().startswith('--')):
        lines.pop(0)
    return '\n'.join(lines).strip().rstrip(';')


def load_files(only=None):
    if not os.path.isdir(PROCEDURES_DIR):
        return []
    out = []
    for filename in sorted(os.listdir(PROCEDURES_DIR)):
        if not filename.endswith('.sql'):
            continue
        path = os.path.join(PROCEDURES_DIR, filename)
        with open(path) as fh:
            body = strip_leading_comments(fh.read())
        match = NAME_RE.search(body)
        if not match:
            print(f'  ! {filename}: no CREATE PROCEDURE found, skipped')
            continue
        name = match.group(1)
        if only and name not in only:
            continue
        out.append((name, body))
    return out


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('names', nargs='*', help='procedure names to apply (default: all)')
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    procedures = load_files(set(args.names) if args.names else None)
    if not procedures:
        print('No procedures to apply.')
        return 0

    if args.dry_run:
        for name, _ in procedures:
            print(f'  would apply {name}')
        return 0

    conn = get_connection()
    cursor = conn.cursor()
    try:
        for name, body in procedures:
            cursor.execute(f'DROP PROCEDURE IF EXISTS `{name}`')
            cursor.execute(body)
            print(f'  ✓ {name}')
        conn.commit()
    except Exception as exc:
        conn.rollback()
        print(f'  ✗ failed: {exc}')
        return 1
    finally:
        cursor.close()
        conn.close()
    return 0


if __name__ == '__main__':
    sys.exit(main())
