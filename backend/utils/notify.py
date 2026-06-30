"""Lightweight helper to insert a notification row inside an open transaction."""


def push(cursor, user_id, type_, title, message=None, reference_id=None):
    """Insert a notification. Must be called before conn.commit()."""
    cursor.execute(
        "INSERT INTO notifications (user_id, type, title, message, reference_id) "
        "VALUES (%s, %s, %s, %s, %s)",
        (user_id, type_, title, message, reference_id),
    )


def push_to_admins(cursor, type_, title, message=None, reference_id=None):
    """Insert a notification for every active admin."""
    cursor.execute(
        "SELECT id FROM users WHERE role='admin' AND deleted_at IS NULL AND status='active'"
    )
    for row in cursor.fetchall():
        push(cursor, row['id'], type_, title, message, reference_id)


def push_to_non_admins(cursor, type_, title, message=None, reference_id=None):
    """Insert a notification for every active non-admin user."""
    cursor.execute(
        "SELECT id FROM users WHERE role != 'admin' AND deleted_at IS NULL AND status='active'"
    )
    for row in cursor.fetchall():
        push(cursor, row['id'], type_, title, message, reference_id)
