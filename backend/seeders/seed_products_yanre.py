"""
Seed the catalogue from a real gym-equipment store instead of generated copy.

Source: yanrefitness.com, which runs WooCommerce and exposes the public Store
API at /wp-json/wc/store/products. Name, description and photo all come from
the same product record, so an image can never be mismatched to a name — that
is the whole reason for pulling live data rather than searching for photos.

    python seeders/seed_products_yanre.py                # 120 products
    python seeders/seed_products_yanre.py --count 400    # everything it has
    python seeders/seed_products_yanre.py --no-images
    python seeders/seed_products_yanre.py --rate 140     # NPR per USD

NOTE ON CONTENT: the names, descriptions and photos belong to that retailer.
Fine for a local demo database; do not ship them in a public production site.

Requires categories — run seeders/seed_categories.py first.
"""

import argparse
import html
import re
import time
from concurrent.futures import ThreadPoolExecutor

import requests

from common import (
    HTTP_HEADERS, download_image, fail, get_connection, info, ok, rng_for, warn,
)
from seed_products import build_description

STORE_API = 'https://www.yanrefitness.com/wp-json/wc/store/products'
PAGE_SIZE = 100

# Their category names → our slugs, checked in order (first match wins).
CATEGORY_RULES = [
    ('cardio', ('cardio', 'treadmill', 'exercise bike', 'spin bike', 'elliptical',
                'rowing machine', 'climber', 'stepper', 'air bike')),
    ('yoga', ('yoga', 'pilates', 'stretch')),
    ('recovery', ('recovery', 'massage', 'foam roll', 'mobility')),
    ('accessories', ('accessor', 'dumbbell rack', 'storage', 'bumper', 'kettlebell',
                     'medicine ball', 'battle rope', 'band')),
    ('machines', ('pin loaded', 'selectorized', 'machines for', 'multi station',
                  'functional trainer', 'cable')),
    ('strength', ('plate loaded', 'free weight', 'rack', 'bench', 'barbell',
                  'smith', 'strength', 'weight')),
]
DEFAULT_SLUG = 'machines'

# The source is a B2B catalogue whose listed prices are placeholders — the
# whole range is two values. Anything below this many distinct prices gets
# realistic NPR figures derived per category instead, so the demo shop does not
# show one price on every card.
MIN_DISTINCT_PRICES = 5

# Below this, the source blurb is not worth showing on a product page.
MIN_DESCRIPTION_CHARS = 160

PRICE_RANGES_NPR = {
    'cardio': (39500, 152000),
    'strength': (5600, 112000),
    'machines': (92000, 212000),
    'recovery': (1500, 68000),
    'accessories': (900, 13500),
    'supplements': (1900, 11500),
    'apparel': (700, 14500),
    'yoga': (1000, 6400),
}

TAG_RE = re.compile(r'<[^>]+>')
WS_RE = re.compile(r'\s+')


def clean_html(raw: str, limit: int = 700) -> str:
    """WooCommerce returns HTML; the products table stores plain text."""
    text = WS_RE.sub(' ', html.unescape(TAG_RE.sub(' ', raw or ''))).strip()
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut[:cut.rfind('. ') + 1] if '. ' in cut else cut.rstrip() + '…'


def pick_slug(product: dict) -> str:
    names = ' | '.join(c['name'].lower() for c in product.get('categories', []))
    for slug, needles in CATEGORY_RULES:
        if any(needle in names for needle in needles):
            return slug
    return DEFAULT_SLUG


def source_price_usd(product: dict) -> float:
    """Store API prices are minor units scaled by prices.currency_minor_unit."""
    prices = product.get('prices') or {}
    try:
        return float(prices.get('price') or 0) / (10 ** int(
            prices.get('currency_minor_unit') or 0
        ))
    except (TypeError, ValueError):
        return 0.0


def price_for(product: dict, slug: str, rng, use_source: bool, rate: float) -> int:
    """Their price when it is real, otherwise a plausible one for the category."""
    if use_source:
        converted = round(source_price_usd(product) * rate)
        if converted:
            return converted
    low, high = PRICE_RANGES_NPR.get(slug, (2500, 45000))
    return int(round(rng.randint(low, high), -2))  # round to the nearest 100


def fetch_products(limit: int) -> list[dict]:
    """Page through the Store API until `limit` products are collected."""
    collected, page = [], 1
    while len(collected) < limit:
        try:
            response = requests.get(
                STORE_API,
                params={'per_page': PAGE_SIZE, 'page': page},
                timeout=30, headers=HTTP_HEADERS,
            )
            response.raise_for_status()
            batch = response.json()
        except Exception as exc:
            warn(f'store API page {page} failed: {exc}')
            break
        if not batch:
            break
        collected.extend(batch)
        info(f'  fetched page {page} ({len(collected)} products so far)')
        total_pages = int(response.headers.get('X-WP-TotalPages', page))
        if page >= total_pages:
            break
        page += 1
        time.sleep(1)  # be a polite guest on someone else's server
    return collected[:limit]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=120)
    parser.add_argument('--no-images', action='store_true')
    parser.add_argument('--workers', type=int, default=4)
    parser.add_argument('--rate', type=float, default=135.0,
                        help='NPR per USD — their prices are in USD, ours are NPR')
    args = parser.parse_args()

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

        info(f'Fetching up to {args.count} products from the store API…')
        raw_products = fetch_products(args.count)
        if not raw_products:
            fail('nothing fetched — is the site reachable?')
            return 1

        # The catalogue repeats a name across variants; keep the first of each.
        unique, seen = [], set()
        for product in raw_products:
            name = (product.get('name') or '').strip()[:200]
            if not name or name.lower() in seen:
                continue
            seen.add(name.lower())
            unique.append(product)
        info(f'{len(unique)} products after removing repeated names')

        distinct_prices = {source_price_usd(p) for p in unique}
        use_source_price = len(distinct_prices) >= MIN_DISTINCT_PRICES
        if not use_source_price:
            warn(f'source lists only {len(distinct_prices)} distinct price(s) — '
                 'generating realistic prices per category instead')

        images = {}
        if not args.no_images:
            def fetch_image(item):
                index, product = item
                sources = [img['src'] for img in product.get('images', [])
                           if img.get('src')]
                if not sources:
                    return index, None
                return index, download_image(sources, f'yanre-{product["id"]}.jpg')

            info(f'Downloading {len(unique)} product photos…')
            with ThreadPoolExecutor(max_workers=args.workers) as pool:
                images = dict(pool.map(fetch_image, enumerate(unique)))

        for index, product in enumerate(unique):
            name = product['name'].strip()[:200]
            cursor.execute('SELECT id FROM products WHERE name = %s', (name,))
            if cursor.fetchone():
                skipped += 1
                continue

            slug = pick_slug(product)
            category_id = categories.get(slug) or categories.get(DEFAULT_SLUG)
            if not category_id:
                warn(f'skipping {name} — no category for "{slug}"')
                continue

            # Many source records carry a one-line blurb or nothing at all;
            # anything that thin gets the generated copy instead so product
            # pages are not half-empty.
            description = clean_html(
                product.get('description') or product.get('short_description') or ''
            )
            if len(description) < MIN_DESCRIPTION_CHARS:
                description = build_description(name, slug, index)

            rng = rng_for('yanre', index)
            price = price_for(product, slug, rng, use_source_price, args.rate)
            cursor.execute(
                'INSERT INTO products '
                '(name, description, price, stock_quantity, category_id, '
                ' image_url, status, created_by) '
                "VALUES (%s,%s,%s,%s,%s,%s,'active',%s)",
                (name, description, price, rng.randint(3, 40), category_id,
                 images.get(index), created_by),
            )
            created += 1
            conn.commit()

        ok(f'{created} created, {skipped} already existed')
        cursor.execute(
            'SELECT c.name AS category, COUNT(*) AS n FROM products p '
            'JOIN categories c ON c.id = p.category_id GROUP BY 1 ORDER BY n DESC'
        )
        info('  ' + ' | '.join(
            f"{row['category']} {row['n']}" for row in cursor.fetchall()
        ))
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
