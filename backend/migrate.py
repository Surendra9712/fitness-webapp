"""
Schema migration script.

Reads database/schema.sql and syncs the live database to match it:
  - Creates tables that are missing
  - Adds columns that are missing from existing tables
  - Reports column type/definition mismatches (does NOT auto-modify — requires manual review)
  - Ignores: index changes, foreign key changes, column ordering

Usage:
    cd backend
    python migrate.py              # apply changes
    python migrate.py --dry-run    # preview without touching the database
"""

import os
import re
import sys
import argparse
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'database', 'schema.sql')


# ── SQL parsing ───────────────────────────────────────────────────────────────

def strip_comments(sql):
    sql = re.sub(r'--[^\n]*', '', sql)
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    return sql


def extract_create_tables(sql):
    """Return list of (table_name, full_create_sql) from a SQL file."""
    sql = strip_comments(sql)
    results = []
    pos = 0

    while True:
        m = re.search(
            r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?\s*\(',
            sql[pos:], re.IGNORECASE,
        )
        if not m:
            break

        table_name = m.group(1)
        abs_start = pos + m.start()
        abs_paren = pos + m.end() - 1  # index of opening '('

        depth = 0
        i = abs_paren
        while i < len(sql):
            if sql[i] == '(':
                depth += 1
            elif sql[i] == ')':
                depth -= 1
                if depth == 0:
                    break
            i += 1

        semi = sql.find(';', i)
        end = semi + 1 if semi != -1 else i + 1
        full_sql = sql[abs_start:end].strip()
        results.append((table_name, full_sql))
        pos = end

    return results


def split_top_level(s):
    """Split s by top-level commas (respects parentheses for ENUM/SET values)."""
    parts, current, depth = [], [], 0
    for ch in s:
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth -= 1
        elif ch == ',' and depth == 0:
            parts.append(''.join(current).strip())
            current = []
            continue
        current.append(ch)
    if current:
        parts.append(''.join(current).strip())
    return parts


_CONSTRAINT = re.compile(
    r'^\s*(PRIMARY\s+KEY|UNIQUE\s+KEY|UNIQUE\s+INDEX|UNIQUE|INDEX|KEY'
    r'|FOREIGN\s+KEY|CONSTRAINT)\b',
    re.IGNORECASE,
)


def parse_columns(create_sql):
    """
    Return ordered list of (col_name, col_definition) from a CREATE TABLE statement.
    Skips constraint lines (PRIMARY KEY, FOREIGN KEY, INDEX, etc.).
    """
    # Find the body between the outermost parens
    depth = 0
    paren_start = paren_end = -1
    for idx, ch in enumerate(create_sql):
        if ch == '(':
            if depth == 0:
                paren_start = idx
            depth += 1
        elif ch == ')':
            depth -= 1
            if depth == 0:
                paren_end = idx
                break

    if paren_start == -1 or paren_end == -1:
        return []

    body = create_sql[paren_start + 1:paren_end]
    columns = []

    for part in split_top_level(body):
        part = part.strip()
        if not part or _CONSTRAINT.match(part):
            continue
        m = re.match(r'`?(\w+)`?\s+(.*)', part, re.DOTALL)
        if m:
            col_name = m.group(1)
            col_def = ' '.join(m.group(2).split())  # normalize whitespace
            columns.append((col_name, col_def))

    return columns


# ── Database introspection ────────────────────────────────────────────────────

def get_existing_tables(cursor, db_name):
    cursor.execute(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
        "WHERE TABLE_SCHEMA = %s AND TABLE_TYPE = 'BASE TABLE'",
        (db_name,),
    )
    return {row[0] for row in cursor.fetchall()}


def get_existing_columns(cursor, db_name, table_name):
    """Return dict {col_name: COLUMN_TYPE} for an existing table."""
    cursor.execute(
        "SELECT COLUMN_NAME, COLUMN_TYPE "
        "FROM INFORMATION_SCHEMA.COLUMNS "
        "WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s "
        "ORDER BY ORDINAL_POSITION",
        (db_name, table_name),
    )
    return {row[0]: row[1].lower() for row in cursor.fetchall()}


def base_type(col_def):
    """Extract the base SQL type keyword from a column definition string."""
    return col_def.split('(')[0].split()[0].lower() if col_def else ''


# ── Output helpers ────────────────────────────────────────────────────────────

GREEN  = '\033[32m'
YELLOW = '\033[33m'
RED    = '\033[31m'
CYAN   = '\033[36m'
RESET  = '\033[0m'
BOLD   = '\033[1m'

def ok(msg):      print(f"  {GREEN}✓{RESET}  {msg}")
def added(msg):   print(f"  {GREEN}+{RESET}  {msg}")
def warn(msg):    print(f"  {YELLOW}!{RESET}  {msg}")
def err(msg):     print(f"  {RED}✗{RESET}  {msg}")
def info(msg):    print(f"  {CYAN}~{RESET}  {msg}")


# ── Migration runner ──────────────────────────────────────────────────────────

def run(dry_run=False):
    db_name = os.getenv('DB_NAME', 'smartdiet_fitness')

    try:
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', '127.0.0.1'),
            port=int(os.getenv('DB_PORT', 3306)),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=db_name,
            charset='utf8mb4',
        )
    except mysql.connector.Error as e:
        print(f"{RED}Connection failed:{RESET} {e}")
        sys.exit(1)

    cursor = conn.cursor()

    print(f"\n{BOLD}Database{RESET} : {db_name} @ {os.getenv('DB_HOST', '127.0.0.1')}")
    print(f"{BOLD}Schema  {RESET} : {SCHEMA_PATH}")
    if dry_run:
        print(f"{BOLD}Mode    {RESET} : {YELLOW}DRY RUN — no changes applied{RESET}")
    print()

    with open(SCHEMA_PATH, 'r') as f:
        schema_sql = f.read()

    schema_tables = extract_create_tables(schema_sql)
    if not schema_tables:
        print("No CREATE TABLE statements found in schema.sql")
        sys.exit(1)

    existing_tables = get_existing_tables(cursor, db_name)

    tables_created  = []
    columns_added   = []
    columns_changed = []  # (table, col, db_type, schema_type)
    errors          = []

    for table_name, create_sql in schema_tables:
        if table_name not in existing_tables:
            print(f"  {GREEN}CREATE{RESET}  {BOLD}{table_name}{RESET}")
            if not dry_run:
                try:
                    cursor.execute(create_sql)
                    conn.commit()
                    tables_created.append(table_name)
                except mysql.connector.Error as e:
                    err(f"Failed to create {table_name}: {e}")
                    conn.rollback()
                    errors.append(table_name)
            else:
                tables_created.append(table_name)
        else:
            schema_cols = dict(parse_columns(create_sql))
            db_cols     = get_existing_columns(cursor, db_name, table_name)

            missing = {k: v for k, v in schema_cols.items() if k not in db_cols}
            changed = {}
            for col, defn in schema_cols.items():
                if col in db_cols:
                    s_type = base_type(defn)
                    d_type = base_type(db_cols[col])
                    if s_type and d_type and s_type != d_type:
                        changed[col] = {'db': db_cols[col], 'schema': defn}

            if not missing and not changed:
                ok(table_name)
                continue

            print(f"  {CYAN}ALTER {RESET}  {BOLD}{table_name}{RESET}")

            for col_name, col_def in missing.items():
                preview = col_def[:70] + ('…' if len(col_def) > 70 else '')
                added(f"  ADD COLUMN {col_name}  {preview}")
                if not dry_run:
                    sql = f"ALTER TABLE `{table_name}` ADD COLUMN `{col_name}` {col_def}"
                    try:
                        cursor.execute(sql)
                        conn.commit()
                        columns_added.append(f"{table_name}.{col_name}")
                    except mysql.connector.Error as e:
                        err(f"    Failed: {e}")
                        conn.rollback()
                        errors.append(f"{table_name}.{col_name}")
                else:
                    columns_added.append(f"{table_name}.{col_name}")

            for col_name, info in changed.items():
                warn(f"  TYPE MISMATCH {col_name}")
                warn(f"    db     : {info['db']}")
                warn(f"    schema : {info['schema'][:70]}")
                warn(f"    → run manually: ALTER TABLE `{table_name}` MODIFY COLUMN `{col_name}` {info['schema']};")
                columns_changed.append((table_name, col_name))

    # ── Summary ───────────────────────────────────────────────────────────────

    print()
    print('─' * 52)

    if tables_created:
        label = 'Would create' if dry_run else 'Created'
        print(f"  {GREEN}{label}{RESET}  : {', '.join(tables_created)}")
    if columns_added:
        label = 'Would add' if dry_run else 'Added'
        print(f"  {GREEN}{label}{RESET}    : {', '.join(columns_added)}")
    if columns_changed:
        print(f"  {YELLOW}Skipped{RESET}   : {len(columns_changed)} type mismatch(es) need manual ALTER")
    if errors:
        print(f"  {RED}Errors{RESET}    : {len(errors)} failed — see output above")
    if not tables_created and not columns_added and not columns_changed and not errors:
        print(f"  {GREEN}✓{RESET} Database is already up to date.")

    print()
    cursor.close()
    conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Sync database to match database/schema.sql'
    )
    parser.add_argument(
        '--dry-run', action='store_true',
        help='Show what would change without applying anything',
    )
    args = parser.parse_args()
    run(dry_run=args.dry_run)
