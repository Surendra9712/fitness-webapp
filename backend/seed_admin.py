"""Run once to create the default admin account."""
import bcrypt
from database.connection import get_connection

EMAIL = 'admin@smartdiet.com'
PASSWORD = 'Admin@123'
NAME = 'Super Admin'

conn = get_connection()
cursor = conn.cursor(dictionary=True)
try:
    cursor.execute("SELECT id FROM users WHERE email = %s", (EMAIL,))
    if cursor.fetchone():
        print(f"Admin already exists: {EMAIL}")
    else:
        pw_hash = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role) VALUES (%s,%s,%s,'admin')",
            (NAME, EMAIL, pw_hash),
        )
        uid = cursor.lastrowid
        cursor.execute(
            "INSERT INTO user_profiles (user_id) VALUES (%s) "
            "ON DUPLICATE KEY UPDATE user_id = user_id",
            (uid,),
        )
        conn.commit()
        print(f"Admin created — email: {EMAIL}  password: {PASSWORD}")
finally:
    cursor.close()
    conn.close()
