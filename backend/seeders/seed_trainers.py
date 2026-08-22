"""
Seed approved trainers with availability, certifications, client assignments
and reviews.

Login: <first>.<last><n>@smartdiet.com / Test@1234

Trainers are created with trainer_request_status = 'approved', which is the
gate the trainee-facing listing, detail and booking queries check — anything
else and they would not show up in the app.

Portraits are optional and off by default: profile_image_url stays NULL, the
app falls back to initials, and the seed needs no network. Pass --images to
download one per trainer.

The engagement pass runs after the accounts exist and fills
trainer_assignments and trainer_reviews. It needs trainees in the database, so
run seed_trainees.py first (seed_all.py already orders them that way). It runs
over every seeded trainer, not just newly created ones, so an existing set of
trainers gains assignments on a re-run.

Usage:
    python seeders/seed_trainers.py                  # 20 trainers + engagement
    python seeders/seed_trainers.py --count 50
    python seeders/seed_trainers.py --images         # download portraits too
    python seeders/seed_trainers.py --no-engagement  # accounts only
"""

import argparse
import json

from common import (
    CITIES, PASSWORD, avatar_url, download_image, fail, get_connection, info,
    make_email, ok, password_hash, rand_dob, rand_name, rand_past, rng_for,
    warn,
)

SPECIALIZATIONS = [
    'Weight Loss and Fat Burning',
    'Muscle Building and Strength',
    'Yoga and Flexibility',
    'Sports Performance',
    'Nutrition and Diet Planning',
    'HIIT and Cardio Training',
    'Functional Fitness',
    'Senior Fitness',
    'Post-Natal Fitness',
    'Endurance and Marathon Prep',
]

BIOS = [
    'Certified personal trainer helping clients reach sustainable results through evidence-based programming and lifestyle coaching.',
    'Specialising in body transformation, combining strength training with practical nutrition strategies.',
    'Former competitive athlete turned coach, bringing elite training principles to everyday people.',
    'Fitness should fit your life. Programmes built around real schedules and real constraints.',
    'Sports science background with over eight years of coaching and a research-led approach.',
    'Holistic coaching across mindset, movement and meals — change starts from the inside out.',
    'Beginner or seasoned lifter, the plan meets you where you are and moves you forward.',
    'Hundreds of clients coached through weight loss, muscle gain and lasting confidence.',
]

CERTIFICATIONS = [
    ('NASM Certified Personal Trainer', 'National Academy of Sports Medicine'),
    ('ACE Personal Trainer Certification', 'American Council on Exercise'),
    ('ISSA Nutritionist Certification', 'International Sports Sciences Association'),
    ('Certified Strength and Conditioning Specialist', 'NSCA'),
    ('Yoga Alliance RYT-200', 'Yoga Alliance'),
    ('Precision Nutrition Level 1', 'Precision Nutrition'),
]

DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

# ── Engagement content ────────────────────────────────────────────────────────

CUSTOMER_NOTES = [
    'Looking to lose about 8 kg before my wedding in June.',
    'I want to build strength but I have a desk job and limited time.',
    'Recovering from a knee injury — need a programme that works around it.',
    'Complete beginner, never trained in a gym before. Need guidance.',
    'Training for my first half marathon and struggling with nutrition.',
    'Want to gain muscle. I eat vegetarian, so meal planning is the hard part.',
    'Need help staying consistent — I start well and give up after two weeks.',
    'Post-natal and easing back into training. Prefer a female trainer.',
]

TRAINER_ACCEPT_NOTES = [
    'Happy to take this on — the goal is realistic in that timeframe.',
    'Good fit for my specialisation. I have capacity from next week.',
    'Accepting. We will start with an assessment before building the plan.',
    'This is exactly the kind of programme I run. Looking forward to it.',
]

TRAINER_REJECT_NOTES = [
    'Fully booked this month — better to pair with a trainer who has capacity.',
    'This needs a rehab specialist rather than general strength coaching.',
    'Outside my specialisation. Another trainer would serve them better.',
]

ADMIN_REJECT_NOTES = [
    'Trainee already has an active assignment with another trainer.',
    'Trainer is at their client limit for this period.',
    'Declined pending verification of the trainer certificate.',
]

ADMIN_END_NOTES = [
    'Ended at the trainee\'s request.',
    'Programme completed — trainee met their goal.',
    'Trainee has been inactive for over two months.',
]

REVIEW_COMMENTS = {
    5: [
        'Completely changed how I train. Lost 11 kg and kept it off.',
        'Explains the reasoning behind every exercise, so it actually sticks.',
        'Best coach I have worked with. Always prepared, always on time.',
        'Meal plans were realistic for a Nepali kitchen, which made all the difference.',
        'Patient with a total beginner and never made me feel out of place.',
    ],
    4: [
        'Great programming and steady progress. Replies can be slow at times.',
        'Really knowledgeable. I would have liked a bit more check-in frequency.',
        'Solid coaching, saw clear results in three months.',
        'Good structure and variety. Scheduling around my shifts was tricky.',
    ],
    3: [
        'Decent plan but fairly generic — not much tailoring to my situation.',
        'Helped me get started, though follow-up was inconsistent.',
        'Fine for the basics. I expected more nutrition guidance.',
    ],
    2: [
        'Sessions often rescheduled at short notice. Progress stalled.',
        'Plan barely changed over two months despite asking.',
    ],
}

# Ratings skew high, the way a live marketplace does — most people who bother
# to review a trainer they stuck with are happy.
RATING_WEIGHTS = [(5, 52), (4, 30), (3, 12), (2, 6)]


def availability(rng) -> str:
    days = rng.sample(DAYS, rng.randint(3, 5))
    start = rng.choice(['06:00', '07:00', '08:00', '09:00'])
    end = rng.choice(['16:00', '17:00', '18:00', '19:00'])
    return json.dumps(
        [{'day': day, 'from': start, 'to': end} for day in sorted(days, key=DAYS.index)]
    )


def chronology(rng):
    """Four timestamps in order: request, trainer review, admin review, review.

    rand_past() picks an independent offset per call, which would happily place
    a trainer's decision before the request that prompted it. Deriving each
    stage from the previous one keeps the audit trail readable in the UI.
    """
    from datetime import datetime, timedelta

    days_ago = rng.randint(25, 200)
    points = [days_ago]
    for _ in range(3):
        previous = points[-1]
        # Each stage lands somewhere between the previous one and today.
        points.append(max(0, previous - rng.randint(1, max(1, previous // 2))))

    now = datetime.now()
    return [
        (now - timedelta(days=d, hours=rng.randint(0, 23),
                         minutes=rng.randint(0, 59))).strftime('%Y-%m-%d %H:%M:%S')
        for d in points
    ]


def weighted_rating(rng) -> int:
    total = sum(weight for _, weight in RATING_WEIGHTS)
    roll = rng.uniform(0, total)
    upto = 0.0
    for rating, weight in RATING_WEIGHTS:
        upto += weight
        if roll <= upto:
            return rating
    return RATING_WEIGHTS[-1][0]


# ── Engagement ────────────────────────────────────────────────────────────────

# Statuses seeded per trainer, so every screen in the app has something to
# show: the trainer's own request queue (pending_trainer), the admin approval
# queue (pending_admin), live pairings (approved), and history (rejected,
# ended). Counts are per trainer and capped by how many trainees exist.
MIX = [
    ('approved', 1, 4),
    ('pending_trainer', 0, 2),
    ('pending_admin', 0, 1),
    ('rejected', 0, 1),
    ('ended', 0, 1),
]


def seed_engagement(conn, cursor, review_ratio: float) -> None:
    """Fill trainer_assignments and trainer_reviews for seeded trainers.

    Mirrors the constraints the API enforces, so the seeded rows are states the
    app could actually have produced:
      - at most one non-rejected assignment per (trainee, trainer) pair
      - at most one 'approved' trainer per trainee, since the trainee-facing
        listing treats an approved pairing as "already has this trainer"
      - a review only exists where the pairing reached 'approved' (the review
        endpoint refuses otherwise); 'ended' rows keep the review written
        while the pairing was still live
      - trainer_reviewed_at / admin_reviewed_at / reviewed_by_admin are filled
        to match the stage each row reached
    """
    cursor.execute(
        "SELECT id FROM users WHERE role = 'trainee' AND status = 'active' "
        'AND deleted_at IS NULL ORDER BY id'
    )
    trainees = [row['id'] for row in cursor.fetchall()]
    if not trainees:
        warn('no trainees found — skipping assignments and reviews '
             '(run seeders/seed_trainees.py first)')
        return

    cursor.execute(
        "SELECT id FROM users WHERE role = 'admin' AND deleted_at IS NULL "
        'ORDER BY id LIMIT 1'
    )
    admin_row = cursor.fetchone()
    admin_id = admin_row['id'] if admin_row else None

    cursor.execute(
        "SELECT id, name FROM users WHERE role = 'dietitian' AND status = 'active' "
        "AND trainer_request_status = 'approved' AND deleted_at IS NULL ORDER BY id"
    )
    trainers = cursor.fetchall()
    if not trainers:
        warn('no approved trainers found — skipping assignments and reviews')
        return

    # A trainee already paired with someone must not be handed a second live
    # trainer, including pairings seeded on an earlier run.
    cursor.execute(
        "SELECT DISTINCT customer_id FROM trainer_assignments "
        "WHERE status = 'approved' AND deleted_at IS NULL"
    )
    taken = {row['customer_id'] for row in cursor.fetchall()}

    assignments = reviews = touched = 0

    for trainer in trainers:
        trainer_id = trainer['id']

        # Idempotency: a trainer who already has assignments is left alone, so
        # re-running never stacks duplicate pairings onto the same person.
        cursor.execute(
            'SELECT COUNT(*) AS n FROM trainer_assignments WHERE trainer_id = %s',
            (trainer_id,),
        )
        if cursor.fetchone()['n']:
            continue

        rng = rng_for('engagement', trainer_id)
        touched += 1

        # One pool per trainer, sampled without replacement, so the same
        # trainee never appears twice for this trainer.
        pool = trainees[:]
        rng.shuffle(pool)
        cursor_pos = 0

        for status, low, high in MIX:
            wanted = rng.randint(low, high)
            for _ in range(wanted):
                # 'approved' consumes a trainee's single live slot, so skip
                # anyone already paired. Other statuses are free to overlap.
                while cursor_pos < len(pool) and (
                    status == 'approved' and pool[cursor_pos] in taken
                ):
                    cursor_pos += 1
                if cursor_pos >= len(pool):
                    break
                customer_id = pool[cursor_pos]
                cursor_pos += 1

                created_at, t_at, a_at, review_at = chronology(rng)
                customer_note = rng.choice(CUSTOMER_NOTES)
                trainer_note = admin_note = None
                trainer_reviewed = admin_reviewed = None
                reviewed_by = None

                if status == 'pending_trainer':
                    pass  # waiting on the trainer; nothing reviewed yet
                elif status == 'pending_admin':
                    trainer_note = rng.choice(TRAINER_ACCEPT_NOTES)
                    trainer_reviewed = t_at
                elif status == 'approved':
                    trainer_note = rng.choice(TRAINER_ACCEPT_NOTES)
                    trainer_reviewed = t_at
                    admin_reviewed = a_at
                    reviewed_by = admin_id
                    taken.add(customer_id)
                elif status == 'rejected':
                    # Either the trainer declined outright, or the admin
                    # declined after the trainer had accepted.
                    if rng.random() < 0.6:
                        trainer_note = rng.choice(TRAINER_REJECT_NOTES)
                        trainer_reviewed = t_at
                    else:
                        trainer_note = rng.choice(TRAINER_ACCEPT_NOTES)
                        trainer_reviewed = t_at
                        admin_note = rng.choice(ADMIN_REJECT_NOTES)
                        admin_reviewed = a_at
                        reviewed_by = admin_id
                elif status == 'ended':
                    trainer_note = rng.choice(TRAINER_ACCEPT_NOTES)
                    trainer_reviewed = t_at
                    admin_note = rng.choice(ADMIN_END_NOTES)
                    admin_reviewed = a_at
                    reviewed_by = admin_id

                cursor.execute(
                    'INSERT INTO trainer_assignments '
                    '(customer_id, trainer_id, status, customer_note, trainer_note, '
                    ' admin_note, trainer_reviewed_at, admin_reviewed_at, '
                    ' reviewed_by_admin, created_at) '
                    'VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s)',
                    (customer_id, trainer_id, status, customer_note, trainer_note,
                     admin_note, trainer_reviewed, admin_reviewed, reviewed_by,
                     created_at),
                )
                assignments += 1

                # Only a pairing that reached 'approved' can carry a review.
                if status in ('approved', 'ended') and rng.random() < review_ratio:
                    rating = weighted_rating(rng)
                    cursor.execute(
                        'INSERT INTO trainer_reviews '
                        '(user_id, trainer_id, rating, comment, created_at) '
                        'VALUES (%s,%s,%s,%s,%s) '
                        'ON DUPLICATE KEY UPDATE rating = VALUES(rating), '
                        'comment = VALUES(comment)',
                        (customer_id, trainer_id, rating,
                         rng.choice(REVIEW_COMMENTS[rating]), review_at),
                    )
                    reviews += 1

        conn.commit()

    if touched:
        ok(f'{assignments} assignments and {reviews} reviews across {touched} trainer(s)')
    else:
        ok('every trainer already had assignments — nothing to add')


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=20)
    parser.add_argument('--images', action='store_true',
                        help='download a portrait per trainer (off by default)')
    # Accepted so older commands and scripts keep working; images are already
    # off unless --images is passed.
    parser.add_argument('--no-images', action='store_true', help=argparse.SUPPRESS)
    parser.add_argument('--no-engagement', action='store_true',
                        help='skip client assignments and reviews')
    parser.add_argument('--review-ratio', type=float, default=0.7,
                        help='chance an eligible client leaves a review (0-1)')
    args = parser.parse_args()

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    created = skipped = 0
    try:
        info(f'Seeding {args.count} trainers…')
        for index in range(args.count):
            rng = rng_for('trainer', index)
            name, is_female = rand_name(rng)
            email = make_email(name, index)

            cursor.execute('SELECT id FROM users WHERE email = %s', (email,))
            if cursor.fetchone():
                skipped += 1
                continue

            image_url = None
            if args.images and not args.no_images:
                image_url = download_image(
                    avatar_url(index, is_female), f'trainer-{index}.jpg'
                )

            cursor.execute(
                'INSERT INTO users '
                '(name, email, password_hash, role, status, trainer_request_status, '
                ' profile_image_url, created_at) '
                "VALUES (%s,%s,%s,'dietitian','active','approved',%s,%s)",
                (name, email, password_hash(), image_url, rand_past(500, rng)),
            )
            uid = cursor.lastrowid

            cursor.execute(
                'INSERT INTO user_profiles '
                '(user_id, full_name, date_of_birth, gender, phone_number, city, '
                ' country, bio, specialization, experience_years, available_time, '
                ' profile_image_url) '
                "VALUES (%s,%s,%s,%s,%s,%s,'Nepal',%s,%s,%s,%s,%s)",
                (
                    uid, name, rand_dob(25, 50, rng),
                    'female' if is_female else 'male',
                    f'98{rng.randint(10000000, 99999999)}'[:10],
                    rng.choice(CITIES),
                    rng.choice(BIOS),
                    rng.choice(SPECIALIZATIONS),
                    rng.randint(2, 18),
                    availability(rng),
                    image_url,
                ),
            )

            for cert_name, issuer in rng.sample(CERTIFICATIONS, rng.randint(1, 3)):
                cursor.execute(
                    'INSERT INTO trainer_certifications '
                    '(user_id, name, issued_by, issued_date, file_url, file_type) '
                    "VALUES (%s,%s,%s,%s,%s,'url')",
                    (uid, cert_name, issuer, rand_dob(1, 8, rng), 'https://example.com/certificate.pdf'),
                )

            created += 1
            conn.commit()

        ok(f'{created} created, {skipped} already existed')

        if args.no_engagement:
            info('  skipping assignments and reviews (--no-engagement)')
        else:
            info('Seeding client assignments and reviews…')
            seed_engagement(conn, cursor, max(0.0, min(1.0, args.review_ratio)))

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
