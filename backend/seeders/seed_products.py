"""
Seed the shop catalogue — 128 products across all 8 categories, each with a
real photo downloaded once into static/uploads/seed/.

Requires categories — run seeders/seed_categories.py first.

Usage:
    python seeders/seed_products.py
    python seeders/seed_products.py --count 40     # first 40 only
    python seeders/seed_products.py --no-images    # skip the downloads
    python seeders/seed_products.py --workers 16   # parallel image fetches
"""

import argparse
from concurrent.futures import ThreadPoolExecutor

from common import (
    download_image, fail, get_connection, info, ok, product_photo_candidates,
    rng_for, warn,
)

# (name, category slug, price NPR, stock, photo keyword)
PRODUCTS = [
    # ── Cardio ───────────────────────────────────────────────────────────────
    ('Motorised Treadmill T400', 'cardio', 129900, 8, 'treadmill'),
    ('Folding Treadmill Compact', 'cardio', 78500, 14, 'treadmill,home'),
    ('Curved Manual Treadmill', 'cardio', 152000, 4, 'running,machine'),
    ('Air Assault Bike', 'cardio', 84500, 12, 'exercise,bike'),
    ('Spin Bike Pro', 'cardio', 62000, 15, 'spinning,bike'),
    ('Recumbent Exercise Bike', 'cardio', 58000, 10, 'recumbent,bike'),
    ('Upright Cycle Trainer', 'cardio', 44500, 18, 'cycling,gym'),
    ('Magnetic Rowing Machine', 'cardio', 96000, 6, 'rowing,machine'),
    ('Water Resistance Rower', 'cardio', 134000, 5, 'rowing,water'),
    ('Cross Trainer Elliptical', 'cardio', 88000, 9, 'elliptical'),
    ('Stair Climber Machine', 'cardio', 118000, 4, 'stair,climber'),
    ('Ski Erg Trainer', 'cardio', 105000, 3, 'ski,machine'),
    ('Mini Stepper With Bands', 'cardio', 12500, 30, 'stepper,fitness'),
    ('Vertical Climber Frame', 'cardio', 39500, 11, 'climbing,machine'),

    # ── Strength ─────────────────────────────────────────────────────────────
    ('Adjustable Dumbbell Set 40kg', 'strength', 38500, 25, 'dumbbell'),
    ('Hex Rubber Dumbbell Pair 10kg', 'strength', 8900, 45, 'dumbbell,rubber'),
    ('Hex Rubber Dumbbell Pair 20kg', 'strength', 16500, 32, 'dumbbell,heavy'),
    ('Chrome Dumbbell Rack', 'strength', 27500, 12, 'dumbbell,rack'),
    ('Olympic Barbell 20kg', 'strength', 24500, 30, 'barbell'),
    ('Womens Olympic Barbell 15kg', 'strength', 22800, 20, 'barbell,gym'),
    ('Hex Trap Bar', 'strength', 19500, 16, 'trap,bar'),
    ('EZ Curl Bar', 'strength', 9800, 28, 'curl,bar'),
    ('Rubber Bumper Plate Set 100kg', 'strength', 68000, 10, 'weight,plates'),
    ('Cast Iron Plate Set 60kg', 'strength', 42000, 14, 'iron,plates'),
    ('Fractional Plate Set', 'strength', 5600, 40, 'weight,plate'),
    ('Kettlebell Set 8 to 24kg', 'strength', 29500, 18, 'kettlebell'),
    ('Competition Kettlebell 16kg', 'strength', 11200, 26, 'kettlebell,steel'),
    ('Power Rack With Pull Up Bar', 'strength', 112000, 5, 'power,rack,gym'),
    ('Half Rack Compact', 'strength', 74000, 7, 'squat,rack'),
    ('Wall Mounted Folding Rack', 'strength', 56000, 9, 'rack,gym'),
    ('Flat Bench Press', 'strength', 21000, 20, 'weight,bench'),
    ('Adjustable Incline Bench', 'strength', 32500, 15, 'incline,bench'),
    ('Preacher Curl Bench', 'strength', 28900, 8, 'curl,bench'),
    ('Weighted Vest 20kg', 'strength', 14500, 22, 'weighted,vest'),
    ('Landmine Attachment', 'strength', 7800, 24, 'landmine,barbell'),
    ('Sandbag Training Kit', 'strength', 9600, 19, 'sandbag,training'),

    # ── Machines ─────────────────────────────────────────────────────────────
    ('Cable Crossover Machine', 'machines', 168000, 4, 'cable,machine,gym'),
    ('Functional Trainer Dual Pulley', 'machines', 195000, 3, 'pulley,machine'),
    ('Leg Press Machine', 'machines', 145000, 3, 'leg,press'),
    ('Hack Squat Machine', 'machines', 158000, 2, 'squat,machine'),
    ('Leg Extension And Curl', 'machines', 96000, 6, 'leg,machine'),
    ('Lat Pulldown Station', 'machines', 98000, 7, 'lat,pulldown'),
    ('Seated Row Machine', 'machines', 92000, 6, 'row,machine'),
    ('Chest Press Machine', 'machines', 124000, 4, 'chest,press'),
    ('Shoulder Press Machine', 'machines', 118000, 4, 'shoulder,press'),
    ('Pec Deck Fly Machine', 'machines', 106000, 5, 'gym,machine'),
    ('Smith Machine', 'machines', 187000, 2, 'smith,machine,gym'),
    ('Multi Station Home Gym', 'machines', 212000, 2, 'home,gym'),
    ('Assisted Pull Up Machine', 'machines', 134000, 3, 'pullup,machine'),
    ('Glute Drive Machine', 'machines', 128000, 3, 'glute,gym'),

    # ── Recovery ─────────────────────────────────────────────────────────────
    ('Foam Roller 90cm', 'recovery', 3200, 60, 'foam,roller'),
    ('Grid Textured Foam Roller', 'recovery', 4100, 48, 'foam,roller,massage'),
    ('Percussion Massage Gun', 'recovery', 14500, 35, 'massage,gun'),
    ('Mini Massage Gun Travel', 'recovery', 8200, 42, 'massage,device'),
    ('Ice Bath Tub', 'recovery', 42000, 9, 'ice,bath'),
    ('Compression Boots Recovery', 'recovery', 68000, 5, 'compression,legs'),
    ('Massage Ball Set', 'recovery', 1800, 85, 'massage,ball'),
    ('Stretching Strap With Loops', 'recovery', 1500, 90, 'stretching,strap'),
    ('Muscle Scraper Tool', 'recovery', 2600, 55, 'massage,tool'),
    ('Infrared Heat Pad', 'recovery', 7400, 28, 'heat,therapy'),
    ('Cryo Cold Pack Set', 'recovery', 2200, 66, 'cold,pack'),
    ('Acupressure Mat And Pillow', 'recovery', 3900, 40, 'acupressure,mat'),

    # ── Accessories ──────────────────────────────────────────────────────────
    ('Resistance Band Set', 'accessories', 2800, 80, 'resistance,band'),
    ('Heavy Pull Up Assist Bands', 'accessories', 3600, 62, 'pullup,band'),
    ('Fabric Booty Bands', 'accessories', 1900, 95, 'fitness,band'),
    ('Weightlifting Belt', 'accessories', 5400, 45, 'weightlifting,belt'),
    ('Leather Powerlifting Belt', 'accessories', 9200, 24, 'lifting,belt'),
    ('Lifting Straps Pair', 'accessories', 1800, 90, 'lifting,straps'),
    ('Wrist Wraps Pair', 'accessories', 2100, 78, 'wrist,wraps'),
    ('Knee Sleeves 7mm', 'accessories', 4800, 52, 'knee,sleeve'),
    ('Elbow Sleeves Pair', 'accessories', 3800, 47, 'elbow,support'),
    ('Training Gloves', 'accessories', 2200, 70, 'gym,gloves'),
    ('Skipping Rope Speed', 'accessories', 1500, 100, 'jump,rope'),
    ('Weighted Jump Rope', 'accessories', 2400, 68, 'jump,rope,weighted'),
    ('Ab Roller Wheel', 'accessories', 1700, 88, 'ab,roller'),
    ('Push Up Bars Pair', 'accessories', 1600, 92, 'pushup,bars'),
    ('Gymnastic Rings Wooden', 'accessories', 5200, 33, 'gymnastic,rings'),
    ('Battle Rope 12m', 'accessories', 11800, 17, 'battle,rope'),
    ('Plyometric Jump Box', 'accessories', 13500, 14, 'plyo,box'),
    ('Agility Ladder And Cones', 'accessories', 2900, 58, 'agility,ladder'),
    ('Medicine Ball 8kg', 'accessories', 6400, 36, 'medicine,ball'),
    ('Slam Ball 15kg', 'accessories', 8900, 21, 'slam,ball'),
    ('Suspension Trainer Kit', 'accessories', 7600, 29, 'suspension,training'),
    ('Chalk Block Set', 'accessories', 900, 120, 'gym,chalk'),

    # ── Supplements ──────────────────────────────────────────────────────────
    ('Whey Protein Isolate 2kg', 'supplements', 11500, 40, 'protein,powder'),
    ('Whey Protein Concentrate 1kg', 'supplements', 6800, 55, 'protein,supplement'),
    ('Plant Protein Blend 1kg', 'supplements', 7400, 38, 'vegan,protein'),
    ('Mass Gainer 3kg', 'supplements', 9900, 26, 'mass,gainer'),
    ('Casein Protein Night 1kg', 'supplements', 8600, 22, 'protein,shake'),
    ('Creatine Monohydrate 500g', 'supplements', 4800, 55, 'creatine,supplement'),
    ('BCAA Recovery Drink', 'supplements', 3900, 50, 'supplement,drink'),
    ('EAA Amino Complex', 'supplements', 4600, 34, 'amino,supplement'),
    ('Pre Workout Boost 300g', 'supplements', 5200, 44, 'preworkout,powder'),
    ('L Carnitine Liquid', 'supplements', 3400, 39, 'supplement,bottle'),
    ('Omega 3 Fish Oil 120 Caps', 'supplements', 2800, 72, 'fish,oil,capsules'),
    ('Multivitamin 90 Tablets', 'supplements', 2400, 65, 'vitamins'),
    ('Vitamin D3 And K2', 'supplements', 2100, 60, 'vitamin,supplement'),
    ('Magnesium Glycinate', 'supplements', 2600, 48, 'supplement,pills'),
    ('Electrolyte Hydration Mix', 'supplements', 1900, 84, 'electrolyte,drink'),
    ('Collagen Peptides 500g', 'supplements', 6200, 31, 'collagen,powder'),

    # ── Apparel ──────────────────────────────────────────────────────────────
    ('Performance Training Tee', 'apparel', 2600, 75, 'sportswear,shirt'),
    ('Dry Fit Tank Top', 'apparel', 2200, 82, 'tank,top,gym'),
    ('Long Sleeve Compression Top', 'apparel', 3400, 54, 'compression,shirt'),
    ('Compression Leggings', 'apparel', 3800, 60, 'leggings,fitness'),
    ('Training Shorts 7 Inch', 'apparel', 2900, 70, 'gym,shorts'),
    ('Joggers Tapered Fit', 'apparel', 4200, 48, 'joggers,sportswear'),
    ('Sports Bra High Support', 'apparel', 3100, 58, 'sports,bra'),
    ('Zip Through Training Hoodie', 'apparel', 5600, 36, 'hoodie,sport'),
    ('Training Shoes Flex', 'apparel', 8900, 30, 'training,shoes'),
    ('Weightlifting Shoes Raised Heel', 'apparel', 14500, 16, 'weightlifting,shoes'),
    ('Running Shoes Cushioned', 'apparel', 11800, 24, 'running,shoes'),
    ('Grip Training Socks', 'apparel', 800, 130, 'sports,socks'),
    ('Gym Duffel Bag', 'apparel', 4500, 40, 'gym,bag'),
    ('Drawstring Kit Bag', 'apparel', 1400, 96, 'drawstring,bag'),
    ('Sweat Wicking Headband', 'apparel', 700, 140, 'headband,sport'),
    ('Insulated Water Bottle 1L', 'apparel', 2300, 88, 'water,bottle'),

    # ── Yoga ─────────────────────────────────────────────────────────────────
    ('Premium Yoga Mat 6mm', 'yoga', 4200, 50, 'yoga,mat'),
    ('Travel Yoga Mat 2mm', 'yoga', 2800, 62, 'yoga,mat,rolled'),
    ('Natural Rubber Grip Mat', 'yoga', 6400, 28, 'yoga,studio'),
    ('Cork Yoga Block Pair', 'yoga', 1900, 65, 'yoga,block'),
    ('Foam Yoga Block', 'yoga', 1100, 88, 'yoga,props'),
    ('Yoga Wheel', 'yoga', 3400, 25, 'yoga,wheel'),
    ('Cotton Yoga Strap', 'yoga', 1000, 94, 'yoga,strap'),
    ('Meditation Cushion', 'yoga', 2900, 35, 'meditation,cushion'),
    ('Bolster Support Pillow', 'yoga', 3600, 30, 'yoga,bolster'),
    ('Yoga Mat Carry Sling', 'yoga', 1200, 76, 'yoga,bag'),
    ('Pilates Ring Circle', 'yoga', 2400, 44, 'pilates,ring'),
    ('Balance Cushion Disc', 'yoga', 2700, 41, 'balance,cushion'),
]

DISCOUNTED = (
    'Whey Protein Isolate 2kg', 'Premium Yoga Mat 6mm', 'Spin Bike Pro',
    'Resistance Band Set', 'Training Shoes Flex', 'Percussion Massage Gun',
)


# Description copy, per category. Three parts are combined per product so the
# catalogue does not read as one sentence repeated 128 times, and rng_for keeps
# each product's text stable across re-runs.
COPY = {
    'cardio': {
        'intro': [
            'Built for steady conditioning work and interval sessions alike.',
            'A cardio staple that holds up to daily use in a busy gym floor.',
            'Designed for endurance training without the pounding of road work.',
        ],
        'detail': [
            'The frame is powder-coated steel with a stabilising base, and the console tracks time, distance, pace and estimated calories.',
            'Resistance steps up smoothly through the range, so warm-ups and all-out efforts both feel controlled.',
            'Transport wheels and a compact footprint make it easy to reposition between sessions.',
        ],
        'use': [
            'Suits fat-loss blocks, base-building and low-impact recovery days.',
            'Pairs well with a structured interval plan from your trainer.',
            'A solid choice for anyone rebuilding fitness after a long break.',
        ],
    },
    'strength': {
        'intro': [
            'Serious loading equipment for progressive strength work.',
            'Made for heavy compound lifting, session after session.',
            'A core piece for any programme built around barbell and dumbbell work.',
        ],
        'detail': [
            'Knurling is cut for a secure grip without shredding the hands, and the finish resists chalk and sweat corrosion.',
            'Welds are reinforced at the load points and the steel is rated well beyond typical training weights.',
            'Rubber-coated contact surfaces protect both the equipment and your flooring when a set gets dropped.',
        ],
        'use': [
            'Ideal for squat, press, deadlift and accessory work at any level.',
            'Works equally well in a home garage setup or a commercial floor.',
            'A long-term buy — this outlasts the phase of training you bought it for.',
        ],
    },
    'machines': {
        'intro': [
            'Guided resistance for safe, isolated work without a spotter.',
            'A plate-loaded station that keeps the movement path honest.',
            'Commercial-grade equipment for high-traffic training floors.',
        ],
        'detail': [
            'Pulleys run on sealed bearings, and the adjustment pins lock positively so the setup does not drift mid-set.',
            'Pads are high-density foam with double stitching, and the seat adjusts through a wide range for different heights.',
            'The cable is aircraft-grade and rated far above the working load, with a smooth travel through the full stroke.',
        ],
        'use': [
            'Good for beginners learning a pattern and for controlled overload work.',
            'Useful for training around an injury where free weights are risky.',
            'A dependable finisher station for hypertrophy blocks.',
        ],
    },
    'recovery': {
        'intro': [
            'Recovery kit that makes the next session possible.',
            'For the work between workouts — the part most people skip.',
            'Targets soreness, stiffness and the tightness that limits range.',
        ],
        'detail': [
            'Firm enough to reach deep tissue without being punishing on a first pass, and easy to control on tender areas.',
            'Lightweight and quick to set up, so it actually gets used instead of living in a cupboard.',
            'Materials are skin-safe, easy to wipe down and hold their shape over months of use.',
        ],
        'use': [
            'Use it post-session or on rest days to keep mobility moving forward.',
            'Pairs well with a mobility routine prescribed by your trainer.',
            'Especially useful during high-volume training blocks.',
        ],
    },
    'accessories': {
        'intro': [
            'The small kit that quietly makes every session better.',
            'A training accessory that earns its place in the gym bag.',
            'Simple, hard-wearing gear for warm-ups, accessories and conditioning.',
        ],
        'detail': [
            'Stitching is reinforced at the stress points and the hardware is rated well past normal training loads.',
            'Compact enough to carry anywhere, so travel is no longer an excuse to skip a session.',
            'Grip surfaces stay secure when hands are sweaty, and the material resists stretching over time.',
        ],
        'use': [
            'Great for warm-ups, activation work and finishers.',
            'Works at home, in the gym or outdoors with no setup required.',
            'A low-cost upgrade that changes how much you get from each session.',
        ],
    },
    'supplements': {
        'intro': [
            'Everyday nutrition support to back up the training.',
            'Third-party tested and formulated without unnecessary filler.',
            'Straightforward supplementation for people who train consistently.',
        ],
        'detail': [
            'Mixes cleanly in water or milk with no grit, and the serving scoop is included.',
            'Each batch is lab-tested for purity, with the full amino profile printed on the tub.',
            'No proprietary blends — every ingredient is listed at its actual dose.',
        ],
        'use': [
            'Fits around training as part of a plan your dietitian has set.',
            'Best used alongside a diet that already covers the basics.',
            'Convenient when whole-food meals are not practical.',
        ],
    },
    'apparel': {
        'intro': [
            'Training wear built for the gym floor, not the catalogue photo.',
            'Cut to move with you through a full range of motion.',
            'Everyday training kit that survives the wash cycle.',
        ],
        'detail': [
            'Sweat-wicking fabric with flatlock seams that do not chafe under a bar or a pack.',
            'Four-way stretch through the panels, with a waistband that stays put during squats and hinges.',
            'Colour holds through repeated washes and the fabric keeps its shape rather than bagging out.',
        ],
        'use': [
            'Works for lifting, conditioning and everything in between.',
            'Comfortable enough to wear on the commute either side of a session.',
            'True to size — size up for a looser fit.',
        ],
    },
    'yoga': {
        'intro': [
            'For yoga, pilates and daily mobility work.',
            'A studio-quality prop for practice at home.',
            'Supports balance, flexibility and controlled breathing work.',
        ],
        'detail': [
            'The surface grips even in a sweaty practice, and the closed-cell construction wipes clean in seconds.',
            'Dense enough to support bodyweight without bottoming out, with a soft top layer for joint comfort.',
            'Made from non-toxic material with no chemical smell out of the box.',
        ],
        'use': [
            'Suits beginners finding positions and experienced practitioners deepening them.',
            'Light enough to carry to a class or roll out in a small space.',
            'A good companion to a guided mobility plan.',
        ],
    },
}

CLOSERS = [
    'Ships with a one-year warranty and free delivery inside the valley.',
    'Covered by a one-year warranty, with free delivery inside the valley.',
    'Includes a one-year manufacturer warranty and free valley-wide delivery.',
]


def build_description(name: str, slug: str, index: int) -> str:
    """Four sentences assembled from category copy — stable per product."""
    rng = rng_for('product', index)
    copy = COPY.get(slug)
    if not copy:
        return f'{name} — supplied by SmartDiet. {rng.choice(CLOSERS)}'
    return ' '.join([
        f'{name}. {rng.choice(copy["intro"])}',
        rng.choice(copy['detail']),
        rng.choice(copy['use']),
        rng.choice(CLOSERS),
    ])


def prefetch_images(products, workers: int) -> dict:
    """Download every photo up front, in parallel.

    128 sequential fetches take minutes; a small pool cuts that to seconds.
    Already-cached files return immediately, so a re-run costs nothing.
    """
    def fetch(item):
        index, (_, slug, _, _, keyword) = item
        # Several candidates across different hosts: if the first is rate
        # limiting, the next one still yields a locally stored image.
        return index, download_image(
            product_photo_candidates(keyword, index),
            f'product-{slug}-{index}.jpg',
        )

    info(f'Fetching {len(products)} product photos ({workers} at a time)…')
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return dict(pool.map(fetch, enumerate(products)))


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=len(PRODUCTS),
                        help=f'how many of the {len(PRODUCTS)} products to seed')
    parser.add_argument('--no-images', action='store_true')
    parser.add_argument('--workers', type=int, default=4,
                        help='parallel image fetches; requests are paced per host anyway')
    args = parser.parse_args()

    selection = PRODUCTS[:max(0, args.count)]

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    created = skipped = 0
    try:
        cursor.execute('SELECT id, slug FROM categories WHERE deleted_at IS NULL')
        categories = {row['slug']: row['id'] for row in cursor.fetchall()}
        if not categories:
            fail('No categories found — run seeders/seed_categories.py first')
            return 1

        cursor.execute("SELECT id FROM users WHERE role = 'admin' LIMIT 1")
        admin = cursor.fetchone()
        created_by = admin['id'] if admin else None

        images = {} if args.no_images else prefetch_images(selection, args.workers)

        info(f'Seeding {len(selection)} products…')
        for index, (name, slug, price, stock, _) in enumerate(selection):
            category_id = categories.get(slug)
            if not category_id:
                warn(f'skipping {name} — category "{slug}" missing')
                continue

            cursor.execute('SELECT id FROM products WHERE name = %s', (name,))
            if cursor.fetchone():
                skipped += 1
                continue

            cursor.execute(
                'INSERT INTO products '
                '(name, description, price, stock_quantity, category_id, '
                ' image_url, status, created_by) '
                "VALUES (%s,%s,%s,%s,%s,%s,'active',%s)",
                (
                    name, build_description(name, slug, index),
                    price, stock, category_id, images.get(index), created_by,
                ),
            )
            created += 1
            conn.commit()  # per product, so a mid-run failure keeps progress

        # A few carry a discount so the pricing UI has something to show.
        placeholders = ', '.join(['%s'] * len(DISCOUNTED))
        cursor.execute(
            "UPDATE products SET discount_type = 'percentage', discount_value = 10 "
            f'WHERE name IN ({placeholders})',
            DISCOUNTED,
        )
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
