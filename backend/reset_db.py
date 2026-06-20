"""
Database reset script.

Drops ALL tables in the configured database, then re-creates them from
database/schema.sql (including seed data).

Usage:
    cd backend
    python3 reset_db.py              # interactive prompt before wiping
    python3 reset_db.py --force      # skip the confirmation prompt
    python3 reset_db.py --dry-run    # show what would be dropped, do nothing
"""

import os
import re
import sys
import argparse
import mysql.connector
from dotenv import load_dotenv

load_dotenv()

SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'database', 'schema.sql')

# ── Colours ───────────────────────────────────────────────────────────────────

GREEN  = '\033[32m'
YELLOW = '\033[33m'
RED    = '\033[31m'
CYAN   = '\033[36m'
BOLD   = '\033[1m'
RESET  = '\033[0m'


# ── Helpers ───────────────────────────────────────────────────────────────────

def connect(db_name: str):
    return mysql.connector.connect(
        host=os.getenv('DB_HOST', '127.0.0.1'),
        port=int(os.getenv('DB_PORT', 3306)),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', ''),
        database=db_name,
        charset='utf8mb4',
    )


def get_all_tables(cursor, db_name: str) -> list[str]:
    cursor.execute(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
        "WHERE TABLE_SCHEMA = %s AND TABLE_TYPE = 'BASE TABLE' "
        "ORDER BY TABLE_NAME",
        (db_name,),
    )
    return [row[0] for row in cursor.fetchall()]


def split_statements(sql: str) -> list[str]:
    """
    Split a SQL file into individual statements on ';', skipping blank
    entries and single-line / block comments.
    """
    # Strip block comments
    sql = re.sub(r'/\*.*?\*/', '', sql, flags=re.DOTALL)
    # Strip line comments
    sql = re.sub(r'--[^\n]*', '', sql)

    statements = []
    for raw in sql.split(';'):
        stmt = raw.strip()
        if stmt:
            statements.append(stmt)
    return statements


# ── Main ──────────────────────────────────────────────────────────────────────

def run(force: bool = False, dry_run: bool = False):
    db_name = os.getenv('DB_NAME', 'smartdiet_fitness')

    print(f"\n{BOLD}Database reset{RESET}")
    print(f"  Target  : {BOLD}{db_name}{RESET} @ {os.getenv('DB_HOST', '127.0.0.1')}")
    print(f"  Schema  : {SCHEMA_PATH}")

    if dry_run:
        print(f"  Mode    : {YELLOW}DRY RUN — no changes applied{RESET}\n")
    else:
        print(f"  Mode    : {RED}DESTRUCTIVE — all tables will be dropped{RESET}\n")

    # ── Confirmation ──────────────────────────────────────────────────────────
    if not dry_run and not force:
        answer = input(
            f"  {RED}{BOLD}WARNING:{RESET} This will permanently drop all tables in "
            f"'{db_name}'.\n  Type  {BOLD}yes{RESET}  to continue: "
        ).strip().lower()
        if answer != 'yes':
            print(f"\n  {YELLOW}Aborted.{RESET}\n")
            sys.exit(0)

    # ── Connect ───────────────────────────────────────────────────────────────
    try:
        conn = connect(db_name)
    except mysql.connector.Error as exc:
        print(f"\n  {RED}Connection failed:{RESET} {exc}\n")
        sys.exit(1)

    cursor = conn.cursor()

    # ── Drop all tables ───────────────────────────────────────────────────────
    tables = get_all_tables(cursor, db_name)

    if not tables:
        print(f"  {CYAN}No tables found — nothing to drop.{RESET}")
    else:
        print(f"  {BOLD}Dropping {len(tables)} table(s):{RESET}")
        for t in tables:
            print(f"    {RED}↓{RESET}  {t}")

        if not dry_run:
            cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
            for table in tables:
                cursor.execute(f"DROP TABLE IF EXISTS `{table}`")
            cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
            conn.commit()
            print(f"\n  {GREEN}✓{RESET}  All tables dropped.\n")

    # ── Re-create from schema.sql ─────────────────────────────────────────────
    if dry_run:
        print(f"\n  {CYAN}Would re-create tables from schema.sql (dry run — skipped).{RESET}\n")
        cursor.close()
        conn.close()
        return

    print(f"  {BOLD}Applying schema.sql …{RESET}")

    with open(SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()

    statements = split_statements(schema_sql)
    created = []
    errors  = []

    for stmt in statements:
        # Skip USE / CREATE DATABASE — we're already connected to the right DB
        upper = stmt.upper().lstrip()
        if upper.startswith('CREATE DATABASE') or upper.startswith('USE '):
            continue

        try:
            cursor.execute(stmt)
            conn.commit()

            m = re.match(r'CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?(\w+)`?', stmt, re.IGNORECASE)
            if m:
                created.append(m.group(1))
                print(f"    {GREEN}+{RESET}  {m.group(1)}")
        except mysql.connector.Error as exc:
            print(f"    {RED}✗{RESET}  Error: {exc}")
            print(f"       Statement: {stmt[:120]}…")
            errors.append(str(exc))
            conn.rollback()

    # ── Summary ───────────────────────────────────────────────────────────────
    print()
    print('─' * 52)
    if created:
        print(f"  {GREEN}Created{RESET}  : {len(created)} table(s) — {', '.join(created)}")
    if errors:
        print(f"  {RED}Errors{RESET}   : {len(errors)} statement(s) failed — see output above")
    else:
        print(f"  {GREEN}✓{RESET}  Database reset complete.")
    print()

    cursor.close()
    conn.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Drop all tables and re-create from schema.sql')
    parser.add_argument('--force',   action='store_true', help='Skip confirmation prompt')
    parser.add_argument('--dry-run', action='store_true', help='Show what would happen without making changes')
    args = parser.parse_args()
    run(force=args.force, dry_run=args.dry_run)
