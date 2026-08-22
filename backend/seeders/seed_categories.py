"""
Seed product categories. Categories carry no image by design — the UI shows
them as text chips and filter pills.

Usage:
    python seeders/seed_categories.py
"""

from common import fail, get_connection, info, ok, warn

CATEGORIES = [
    ('Cardio', 'cardio', 'Treadmills, bikes, rowers and everything that gets the heart rate up.'),
    ('Strength', 'strength', 'Free weights, barbells, plates and racks for building strength.'),
    ('Machines', 'machines', 'Pin-loaded and plate-loaded machines for guided resistance work.'),
    ('Recovery', 'recovery', 'Foam rollers, massage guns and mobility tools for rest days.'),
    ('Accessories', 'accessories', 'Belts, straps, gloves, bands and the small kit that rounds out a session.'),
    ('Supplements', 'supplements', 'Protein, creatine, vitamins and everyday nutrition support.'),
    ('Apparel', 'apparel', 'Training clothes and footwear built for the gym floor.'),
    ('Yoga', 'yoga', 'Mats, blocks and props for yoga, pilates and stretching.'),
]


def main() -> int:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    created = skipped = 0
    try:
        info(f'Seeding {len(CATEGORIES)} categories…')
        for name, slug, description in CATEGORIES:
            cursor.execute('SELECT id FROM categories WHERE slug = %s', (slug,))
            row = cursor.fetchone()
            if row:
                # Keeps a category that clear_data restored without a description.
                cursor.execute(
                    'UPDATE categories SET name = %s, description = %s, deleted_at = NULL '
                    'WHERE id = %s',
                    (name, description, row['id']),
                )
                skipped += 1
                continue
            cursor.execute(
                'INSERT INTO categories (name, slug, description) VALUES (%s, %s, %s)',
                (name, slug, description),
            )
            created += 1
        conn.commit()
        ok(f'{created} created, {skipped} already existed')
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
