import mysql.connector
from mysql.connector import pooling
import os
from dotenv import load_dotenv

load_dotenv()

_pool = pooling.MySQLConnectionPool(
    pool_name="smartdiet_pool",
    pool_size=5,
    host=os.getenv('DB_HOST', '127.0.0.1'),
    port=int(os.getenv('DB_PORT', 3306)),
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    database=os.getenv('DB_NAME', 'smartdiet_fitness'),
    charset='utf8mb4',
    collation='utf8mb4_unicode_ci',
    autocommit=False,
)


def get_connection():
    return _pool.get_connection()
