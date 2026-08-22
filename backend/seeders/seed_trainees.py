"""
Seed trainees with a completed profile.

Login: <first>.<last><n>@smartdiet.com / Test@1234

Emails share the domain with the trainer seeder, so the index offset below
keeps the two sets from colliding on the same generated name.

Portraits are optional and off by default: profile_image_url stays NULL, the
app falls back to initials, and the seed needs no network. Pass --images to
download one per trainee.

Usage:
    python seeders/seed_trainees.py                # 30 trainees, no portraits
    python seeders/seed_trainees.py --count 100
    python seeders/seed_trainees.py --images       # download portraits too
"""

import argparse

from common import (
    CITIES, PASSWORD, avatar_url, download_image, fail, get_connection, info,
    make_email, ok, password_hash, rand_dob, rand_name, rand_past, rng_for,
)

# Trainer emails use indexes 0..n; trainees start well past that.
INDEX_OFFSET = 1000

GOALS = ['lose_weight', 'gain_muscle', 'maintain', 'improve_health', 'athletic_performance']
ACTIVITY = ['sedentary', 'light', 'moderate', 'active', 'very_active']
FITNESS_LEVELS = ['beginner', 'intermediate', 'advanced']
DIET_TYPES = ['none', 'vegetarian', 'vegan', 'keto', 'low_carb']
OCCUPATIONS = [
    'Software Engineer', 'Teacher', 'Nurse', 'Accountant', 'Student',
    'Shop Owner', 'Bank Officer', 'Designer', 'Driver', 'Chef',
]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=30)
    parser.add_argument('--images', action='store_true',
                        help='download a portrait per trainee (off by default)')
    # Accepted so older commands and scripts keep working; images are already
    # off unless --images is passed.
    parser.add_argument('--no-images', action='store_true', help=argparse.SUPPRESS)
    args = parser.parse_args()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    created = skipped = 0
    try:
        info(f'Seeding {args.count} trainees…')
        for offset in range(args.count):
            index = INDEX_OFFSET + offset
            rng = rng_for('trainee', index)
            name, is_female = rand_name(rng)
            email = make_email(name, index)

            cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
            if cursor.fetchone():
                skipped += 1
                continue

            image_url = None
            if args.images and not args.no_images:
                image_url = download_image(
                    avatar_url(index, is_female), f'trainee-{index}.jpg'
                )

            cursor.execute(
                'INSERT INTO users '
                '(name, email, password_hash, role, status, profile_image_url, created_at) '
                "VALUES (%s,%s,%s,'trainee','active',%s,%s)",
                (name, email, password_hash(), image_url, rand_past(400, rng)),
            )
            uid = cursor.lastrowid

            height = round(rng.uniform(150, 190), 1)
            weight = round(rng.uniform(48, 105), 1)
            cursor.execute(
                'INSERT INTO user_profiles '
                '(user_id, full_name, date_of_birth, gender, phone_number, city, '
                ' country, occupation, height_cm, current_weight_kg, activity_level, '
                ' primary_goal, fitness_level, target_water_ml, diet_type, '
                ' meals_per_day, profile_image_url) '
                "VALUES (%s,%s,%s,%s,%s,%s,'Nepal',%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)",
                (
                    uid, name, rand_dob(18, 55, rng),
                    'female' if is_female else 'male',
                    f'98{rng.randint(10000000, 99999999)}'[:10],
                    rng.choice(CITIES),
                    rng.choice(OCCUPATIONS),
                    height, weight,
                    rng.choice(ACTIVITY),
                    rng.choice(GOALS),
                    rng.choice(FITNESS_LEVELS),
                    rng.choice([2000, 2500, 3000]),
                    rng.choice(DIET_TYPES),
                    rng.choice([3, 4, 5]),
                    image_url,
                ),
            )
            created += 1
            conn.commit()

        ok(f'{created} created, {skipped} already existed')
        if created:
            info(f'  login: <first>.<last><n>@smartdiet.com  /  {PASSWORD}')
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
