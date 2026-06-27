"""
Seed 100 trainees, 100 trainers, and random trainer reviews.

Usage:
    cd backend
    python seed_users.py              # seed all
    python seed_users.py --reviews    # only add reviews (users already exist)
    python seed_users.py --wipe       # drop seeded users + reviews then re-seed
"""

import sys
import os
import random
import bcrypt
import mysql.connector
from datetime import date, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the backend directory (same dir as this script)
load_dotenv(Path(__file__).parent / ".env")

def get_connection():
    host = os.getenv("DB_HOST", "127.0.0.1")
    port = int(os.getenv("DB_PORT", 3306))
    user = os.getenv("DB_USER", "root")
    password = os.getenv("DB_PASSWORD", "")
    database = os.getenv("DB_NAME", "smartdiet_fitness")

    print(f"  Connecting → host={host} port={port} user={user} db={database}")

    cfg = dict(port=port, user=user, password=password, database=database, charset="utf8mb4")
    # MySQL treats 'localhost' (Unix socket) and '127.0.0.1' (TCP) differently.
    # Try the configured host first, then fall back to the other.
    hosts = [host, "localhost" if host == "127.0.0.1" else "127.0.0.1"]
    last_err = None
    for h in hosts:
        try:
            return mysql.connector.connect(host=h, **cfg)
        except mysql.connector.errors.ProgrammingError as e:
            last_err = e
    raise last_err

PASSWORD = "Test@1234"
PW_HASH  = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()

# ── Name pools ────────────────────────────────────────────────────────────────

FIRST_NAMES = [
    "Aarav","Aayush","Abhishek","Aditya","Ajay","Akaash","Alisha","Amrita",
    "Ananya","Anish","Anjali","Ankit","Anup","Anusha","Arjun","Aryan",
    "Ashish","Ayasha","Ayush","Barsha","Bibek","Bina","Binita","Bipana",
    "Bishal","Bishnu","Deepak","Deepika","Dil","Dinesh","Dipak","Dipika",
    "Gita","Hari","Hira","Ishaan","Ishu","Januka","Jeevan","Kabita",
    "Kalpana","Kamal","Kritika","Kumar","Laxmi","Madhav","Manish","Manisha",
    "Maya","Milan","Mohan","Nandita","Naresh","Nisha","Nishan","Nitesh",
    "Pankaj","Pawan","Prabha","Pradip","Prakash","Prashant","Priya","Puja",
    "Purna","Rabina","Rachana","Radhika","Rahul","Raj","Rajesh","Ram",
    "Ramesh","Ranjit","Ravi","Ritesh","Rohit","Roshan","Ruby","Sachin",
    "Sagun","Samjhana","Sandesh","Sanjay","Sanjita","Santosh","Sarita","Saroj",
    "Shanta","Shruti","Sita","Smriti","Sujata","Sujan","Suman","Sunil",
    "Sunita","Suresh","Swastika","Uma","Usha","Vijay","Vikash","Yogesh",
]

LAST_NAMES = [
    "Adhikari","Acharya","Basnet","Bhattarai","Bista","Budhathoki","Chaudhary",
    "Dahal","Dhakal","Gautam","Ghimire","Gurung","Gyawali","Jha","Karki",
    "Khanal","Koirala","Lama","Limbu","Magar","Maharjan","Neupane","Oli",
    "Pandey","Parajuli","Poudel","Rai","Rajbhandari","Regmi","Rijal","Sapkota",
    "Shah","Sharma","Shrestha","Subedi","Tamang","Thapa","Timilsina","Upreti",
]

CITIES = ["Kathmandu","Pokhara","Lalitpur","Biratnagar","Birgunj","Butwal",
          "Dharan","Hetauda","Itahari","Janakpur","Nepalgunj","Bhaktapur"]

GOALS        = ["lose_weight","gain_muscle","maintain","improve_health","athletic_performance"]
ACTIVITY     = ["sedentary","light","moderate","active","very_active"]
FITNESS_LVL  = ["beginner","intermediate","advanced"]
GENDERS      = ["male","female","other"]
DIET_TYPES   = ["none","vegetarian","vegan","keto","low_carb"]
STRESS       = ["low","moderate","high"]

SPECIALIZATIONS = [
    "Weight Loss & Fat Burning",
    "Muscle Building & Strength",
    "Yoga & Flexibility",
    "Sports Performance",
    "Nutrition & Diet Planning",
    "HIIT & Cardio Training",
    "Functional Fitness",
    "Senior Fitness",
    "Post-Natal Fitness",
    "Endurance & Marathon Prep",
    "Bodyweight Training",
    "Holistic Wellness",
]

BIOS = [
    "Certified personal trainer with a passion for helping clients achieve sustainable results through evidence-based programming and lifestyle coaching.",
    "Specialising in body transformation, I combine strength training with smart nutrition strategies to help you reach your goals faster.",
    "Former competitive athlete turned coach. I bring elite-level training principles to everyday people who want to perform and feel their best.",
    "I believe fitness should be fun, accessible, and tailored to your life. Let's build a programme that actually fits your schedule.",
    "With a background in sports science and over 8 years of coaching, I deliver results-driven plans backed by the latest research.",
    "My approach is holistic — we work on mindset, movement, and meals together. Real change starts from the inside out.",
    "Whether you're a beginner or a seasoned gym-goer, I'll meet you where you are and push you towards your best self.",
    "I've helped hundreds of clients lose weight, build muscle, and gain confidence. Your transformation story starts here.",
    "As a certified nutritionist and fitness coach, I address the full picture — not just your workouts but your lifestyle habits too.",
    "I specialise in high-performance training that fits around busy professionals. Effective, efficient, and built around your goals.",
]

REVIEW_COMMENTS = [
    "Amazing trainer! Really helped me understand proper form and pushed me to new limits.",
    "Highly recommended. My fitness has improved dramatically since we started working together.",
    "Very knowledgeable and always available to answer questions. Great experience!",
    "Completely transformed my approach to fitness. Patient, encouraging, and professional.",
    "Results speak for themselves. Lost 8 kg in 3 months following the programme.",
    "Great communicator. Always explains the why behind every exercise and diet change.",
    "I've tried several trainers before but this one truly stands out. Worth every rupee.",
    "Friendly, motivating, and extremely professional. My go-to trainer for life.",
    "Exceeded my expectations. Custom programme felt tailored exactly to my needs.",
    "Consistent progress every week. The accountability check-ins make a huge difference.",
    "Gentle but firm push when I need it most. Felt supported throughout my journey.",
    "Nutrition advice was spot on. Combined with the training plan, results came fast.",
    "Very flexible with scheduling and always punctual. Professionalism at its best.",
    "Changed my relationship with exercise entirely. Now I actually look forward to workouts.",
    "Solid programme design with clear progressions. Saw strength gains within 4 weeks.",
]

# ── Helpers ───────────────────────────────────────────────────────────────────

def rand_name():
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def rand_dob():
    days = random.randint(18 * 365, 50 * 365)
    return (date.today() - timedelta(days=days)).isoformat()

def rand_past(days=365):
    """Random timestamp in the past `days` days."""
    offset = random.randint(0, days)
    return (date.today() - timedelta(days=offset)).strftime("%Y-%m-%d %H:%M:%S")

def make_email(name: str, idx: int, role: str) -> str:
    slug = name.lower().replace(" ", ".") + f"{idx}"
    return f"{slug}@{'trainee' if role == 'trainee' else 'trainer'}.seed"

# ── Seed functions ────────────────────────────────────────────────────────────

def seed_trainees(cursor, conn, count=100):
    print(f"Seeding {count} trainees…")
    ids = []
    for i in range(count):
        name  = rand_name()
        email = make_email(name, i, "trainee")
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            ids.append(cursor.fetchone()["id"])
            continue

        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, status, created_at) "
            "VALUES (%s,%s,%s,'trainee','active',%s)",
            (name, email, PW_HASH, rand_past(400)),
        )
        uid = cursor.lastrowid
        cursor.execute(
            "INSERT INTO user_profiles "
            "(user_id, full_name, date_of_birth, gender, city, country, "
            " height_cm, current_weight_kg, activity_level, primary_goal, "
            " fitness_level, diet_type, stress_level) "
            "VALUES (%s,%s,%s,%s,%s,'Nepal',%s,%s,%s,%s,%s,%s,%s)",
            (
                uid, name, rand_dob(),
                random.choice(GENDERS),
                random.choice(CITIES),
                round(random.uniform(150, 190), 1),
                round(random.uniform(50, 110), 1),
                random.choice(ACTIVITY),
                random.choice(GOALS),
                random.choice(FITNESS_LVL),
                random.choice(DIET_TYPES),
                random.choice(STRESS),
            ),
        )
        ids.append(uid)

    conn.commit()
    print(f"  ✓ {len(ids)} trainees ready")
    return ids


def seed_trainers(cursor, conn, count=100):
    print(f"Seeding {count} trainers…")
    ids = []
    for i in range(count):
        name  = rand_name()
        email = make_email(name, i, "trainer")
        cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
        if cursor.fetchone():
            cursor.execute("SELECT id FROM users WHERE email = %s", (email,))
            ids.append(cursor.fetchone()["id"])
            continue

        cursor.execute(
            "INSERT INTO users (name, email, password_hash, role, status, created_at) "
            "VALUES (%s,%s,%s,'dietitian','active',%s)",
            (name, email, PW_HASH, rand_past(500)),
        )
        uid = cursor.lastrowid
        cursor.execute(
            "INSERT INTO user_profiles "
            "(user_id, full_name, date_of_birth, gender, city, country, "
            " specialization, bio) "
            "VALUES (%s,%s,%s,%s,%s,'Nepal',%s,%s)",
            (
                uid, name, rand_dob(),
                random.choice(GENDERS),
                random.choice(CITIES),
                random.choice(SPECIALIZATIONS),
                random.choice(BIOS),
            ),
        )
        ids.append(uid)

    conn.commit()
    print(f"  ✓ {len(ids)} trainers ready")
    return ids


def seed_reviews(cursor, conn, trainee_ids, trainer_ids):
    print("Seeding trainer reviews…")
    inserted = 0
    skipped  = 0

    for trainee_id in trainee_ids:
        # Each trainee reviews 1–6 random trainers
        num_reviews = random.randint(1, 6)
        targets = random.sample(trainer_ids, min(num_reviews, len(trainer_ids)))

        for trainer_id in targets:
            # Skip if review already exists
            cursor.execute(
                "SELECT id FROM trainer_reviews WHERE user_id=%s AND trainer_id=%s",
                (trainee_id, trainer_id),
            )
            if cursor.fetchone():
                skipped += 1
                continue

            # Weight ratings toward 3-5 (realistic distribution)
            rating = random.choices([1, 2, 3, 4, 5], weights=[2, 5, 18, 40, 35])[0]
            comment = random.choice(REVIEW_COMMENTS) if random.random() > 0.2 else None

            cursor.execute(
                "INSERT INTO trainer_reviews (user_id, trainer_id, rating, comment, created_at) "
                "VALUES (%s,%s,%s,%s,%s)",
                (trainee_id, trainer_id, rating, comment, rand_past(300)),
            )
            inserted += 1

    conn.commit()
    print(f"  ✓ {inserted} reviews inserted, {skipped} already existed")


def seed_assignments(cursor, conn, trainee_ids, trainer_ids):
    print("Seeding trainer assignments…")
    inserted = 0

    # Assign ~40% of trainees to a random trainer (approved)
    sample = random.sample(trainee_ids, int(len(trainee_ids) * 0.4))
    for trainee_id in sample:
        trainer_id = random.choice(trainer_ids)
        cursor.execute(
            "SELECT id FROM trainer_assignments WHERE customer_id=%s AND trainer_id=%s",
            (trainee_id, trainer_id),
        )
        if cursor.fetchone():
            continue
        cursor.execute(
            "INSERT INTO trainer_assignments "
            "(customer_id, trainer_id, status, created_at) "
            "VALUES (%s,%s,'approved',%s)",
            (trainee_id, trainer_id, rand_past(300)),
        )
        inserted += 1

    conn.commit()
    print(f"  ✓ {inserted} assignments inserted")


def wipe_seeded(cursor, conn):
    print("Wiping seeded users…")
    cursor.execute(
        "SELECT id FROM users WHERE email LIKE '%@trainee.seed' OR email LIKE '%@trainer.seed'"
    )
    ids = [r["id"] for r in cursor.fetchall()]
    if ids:
        fmt = ",".join(["%s"] * len(ids))
        cursor.execute(f"DELETE FROM users WHERE id IN ({fmt})", ids)
        conn.commit()
        print(f"  ✓ Removed {len(ids)} seeded users (cascade deletes profiles/reviews)")
    else:
        print("  Nothing to wipe")


# ── Entrypoint ────────────────────────────────────────────────────────────────

def main():
    args = sys.argv[1:]
    conn   = get_connection()
    cursor = conn.cursor(dictionary=True)

    try:
        if "--wipe" in args:
            wipe_seeded(cursor, conn)

        if "--reviews" in args:
            # Only seed reviews using existing seeded users
            cursor.execute("SELECT id FROM users WHERE email LIKE '%@trainee.seed'")
            trainee_ids = [r["id"] for r in cursor.fetchall()]
            cursor.execute("SELECT id FROM users WHERE email LIKE '%@trainer.seed'")
            trainer_ids = [r["id"] for r in cursor.fetchall()]
            if not trainee_ids or not trainer_ids:
                print("No seeded users found. Run without --reviews first.")
                return
            seed_reviews(cursor, conn, trainee_ids, trainer_ids)
            return

        trainee_ids = seed_trainees(cursor, conn, 100)
        trainer_ids = seed_trainers(cursor, conn, 100)
        seed_reviews(cursor, conn, trainee_ids, trainer_ids)
        seed_assignments(cursor, conn, trainee_ids, trainer_ids)

        print("\nDone! All seeded users share the password:", PASSWORD)

    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
