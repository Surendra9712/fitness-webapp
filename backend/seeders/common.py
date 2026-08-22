"""
Shared helpers for the seeder scripts in this folder.

Every seeder is standalone and idempotent — running one twice does not create
duplicates. Run them from the backend directory:

    python seeders/clear_data.py
    python seeders/seed_categories.py
    python seeders/seed_products.py
    python seeders/seed_trainers.py
    python seeders/seed_trainees.py
    python seeders/seed_all.py --fresh     # all of the above, in order
"""

from __future__ import annotations

import os
import random
import sys
import threading
import time
from urllib.parse import urlparse

# Seeders live one level below the backend package root.
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import bcrypt  # noqa: E402
import requests  # noqa: E402

from database.connection import get_connection  # noqa: E402  (re-exported)

__all__ = [
    'get_connection', 'password_hash', 'make_email', 'download_image',
    'rand_name', 'rand_dob', 'rand_past', 'rng_for', 'ok', 'info', 'warn', 'fail',
    'PASSWORD', 'EMAIL_DOMAIN', 'CITIES', 'FIRST_NAMES', 'LAST_NAMES',
]

# ── Credentials ───────────────────────────────────────────────────────────────

PASSWORD = 'Test@1234'
EMAIL_DOMAIN = 'smartdiet.com'

_PW_HASH = None


def password_hash() -> str:
    """One bcrypt hash reused for every seeded account — hashing per user makes
    a 100-row seed take minutes for no benefit."""
    global _PW_HASH
    if _PW_HASH is None:
        _PW_HASH = bcrypt.hashpw(PASSWORD.encode(), bcrypt.gensalt()).decode()
    return _PW_HASH


def make_email(name: str, idx: int) -> str:
    """`Aarav Sharma` + 3 → `aarav.sharma3@smartdiet.com`."""
    slug = name.strip().lower().replace(' ', '.')
    return f'{slug}{idx}@{EMAIL_DOMAIN}'


# ── Output ────────────────────────────────────────────────────────────────────

GREEN, YELLOW, RED, CYAN, RESET = (
    '\033[32m', '\033[33m', '\033[31m', '\033[36m', '\033[0m'
)


def ok(msg):
    print(f'  {GREEN}✓{RESET} {msg}')


def info(msg):
    print(f'{CYAN}{msg}{RESET}')


def warn(msg):
    print(f'  {YELLOW}!{RESET} {msg}')


def fail(msg):
    print(f'  {RED}✗{RESET} {msg}')


# ── Images ────────────────────────────────────────────────────────────────────

SEED_IMAGE_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'static', 'uploads', 'seed',
)


class _HostPacer:
    """Keeps a minimum gap between requests to the same host.

    Bulk seeding is exactly the traffic shape image hosts throttle: 128 hits in
    a few seconds from one IP. Spacing them out is what actually prevents the
    429s — retries alone just spend the budget again.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._last: dict[str, float] = {}

    def wait(self, url: str) -> None:
        host = urlparse(url).netloc
        gap = HOST_MIN_INTERVAL.get(host, DEFAULT_MIN_INTERVAL)
        with self._lock:
            elapsed = time.monotonic() - self._last.get(host, 0.0)
            if elapsed < gap:
                time.sleep(gap - elapsed)
            self._last[host] = time.monotonic()

    def penalise(self, url: str, seconds: float) -> None:
        """After a 429, hold every request to this host, not just this one."""
        host = urlparse(url).netloc
        with self._lock:
            self._last[host] = time.monotonic() + seconds


# Wikimedia is the strictest of the three by a wide margin.
HOST_MIN_INTERVAL = {
    'upload.wikimedia.org': 1.2,
    'live.staticflickr.com': 0.4,
    'loremflickr.com': 0.4,
    'randomuser.me': 0.2,
}
DEFAULT_MIN_INTERVAL = 0.3

_pacer = _HostPacer()


def _retry_after(response, attempt: int) -> float:
    """Seconds to wait — the server's own figure when it gives one."""
    header = response.headers.get('Retry-After') if response is not None else None
    if header:
        try:
            return min(float(header), 60.0)
        except ValueError:
            pass
    return min(2 ** attempt + random.uniform(0, 1.5), 30.0)


def _fetch(url: str, path: str, timeout: int, attempts: int) -> bool:
    """Try one URL. True if the file landed on disk."""
    for attempt in range(attempts):
        response = None
        try:
            _pacer.wait(url)
            response = requests.get(
                url, timeout=timeout, allow_redirects=True, headers=HTTP_HEADERS
            )
            if response.status_code in (429, 503):
                delay = _retry_after(response, attempt)
                # Hold the whole host, so parallel workers stop piling on.
                _pacer.penalise(url, delay)
                time.sleep(delay)
                continue
            response.raise_for_status()
            if not response.content:
                return False
            with open(path, 'wb') as fh:
                fh.write(response.content)
            return True
        except Exception:
            if attempt < attempts - 1:
                time.sleep(min(2 ** attempt, 10))
    return False


def download_image(urls, filename: str, timeout: int = 20, attempts: int = 3) -> str:
    """Fetch an image into static/uploads/seed/ and return its app-relative URL.

    `urls` is one URL or an ordered list of candidates from different hosts.
    When the first host is rate limiting, the next candidate is tried rather
    than shipping a product with no local image — a throttled Wikimedia should
    not stop the seed, it should just mean the photo comes from elsewhere.

    Already-downloaded files are reused, so re-running costs no network. If
    every candidate fails, the first remote URL is returned and the image is
    loaded from the internet at view time.
    """
    if isinstance(urls, str):
        urls = [urls]
    # Commons hands back thumburls with utm_* tracking params attached. They
    # change nothing about the file and only hurt cache hits, so drop them.
    urls = [u.split('?')[0] if 'utm_source=' in u else u for u in urls if u]
    if not urls:
        return ''

    os.makedirs(SEED_IMAGE_DIR, exist_ok=True)
    path = os.path.join(SEED_IMAGE_DIR, filename)
    rel_url = f'/static/uploads/seed/{filename}'

    if os.path.exists(path) and os.path.getsize(path) > 0:
        return rel_url

    for candidate in urls:
        if _fetch(candidate, path, timeout, attempts):
            return rel_url

    warn(f'image fetch failed ({filename}) after {len(urls)} source(s) '
         '— falling back to remote URL')
    return urls[0]


def avatar_url(index: int, female: bool) -> str:
    """Deterministic portrait per seeded person."""
    bucket = 'women' if female else 'men'
    return f'https://randomuser.me/api/portraits/{bucket}/{index % 100}.jpg'


HTTP_HEADERS = {
    # Wikimedia rejects requests without a descriptive User-Agent.
    'User-Agent': 'SmartDiet-Seeder/1.0 (dev seeding script)'
}

COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
OPENVERSE_SEARCH = 'https://api.openverse.org/v1/images/'

_openverse_cache: dict[str, list[str]] = {}


def _openverse_candidates(keyword: str) -> list[str]:
    """Relevance-ranked photo URLs for a keyword, or [] if the API is unusable.

    Openverse actually searches, so `leg press` returns leg press machines.
    The random-tag services return anything wearing that tag, which is how you
    end up with a photo of a dog on a product page.
    """
    query = keyword.replace(',', ' ')
    if query in _openverse_cache:
        return _openverse_cache[query]
    try:
        response = requests.get(
            OPENVERSE_SEARCH,
            params={'q': query, 'page_size': 8, 'license_type': 'all',
                    'mature': 'false', 'extension': 'jpg'},
            timeout=15,
            headers={'User-Agent': 'SmartDiet-Seeder/1.0'},
        )
        response.raise_for_status()
        urls = [item['url'] for item in response.json().get('results', [])
                if item.get('url')]
    except Exception:
        urls = []
    _openverse_cache[query] = urls
    return urls


_commons_cache: dict[str, list[str]] = {}


# Words that mark a photo as "person using equipment" rather than a product
# shot. A catalogue wants the object, not somebody's workout selfie.
PEOPLE_WORDS = (
    'woman', 'women', 'man', 'men', 'girl', 'boy', 'people', 'person',
    'soldier', 'airman', 'sailor', 'marine', 'athlete', 'trainer', 'coach',
    'class', 'crowd', 'competition', 'championship', 'contest', 'race',
    'lifting', 'using', 'doing', 'performs', 'performing', 'workout',
    'exercising', 'demonstrates', 'instructor',
)


def _score_title(title: str, tokens: list[str]) -> int:
    """How well a Commons filename matches the product.

    Every required token must appear at all — a "cable crossover machine" photo
    that only matches "cable" is how you end up with a rowing machine on a
    cable crossover product page. Beyond that, object shots outrank action
    shots and shorter names outrank essay-length ones.
    """
    name = title.lower().replace('file:', '').replace('_', ' ')
    if not all(token in name for token in tokens):
        return -1
    score = 10
    if any(word in name for word in PEOPLE_WORDS):
        score -= 6
    if name.startswith(tokens[-1]):
        score += 3
    score -= len(name) // 40  # very long descriptive names are usually scenes
    return score


_commons_cache: dict[str, list[str]] = {}


def _commons_candidates(keyword: str) -> list[str]:
    """Wikimedia Commons photos for a keyword, best match first.

    Commons is catalogued rather than tagged, so a search for "dumbbell"
    returns files actually named and described as dumbbells — much closer to
    a product shot than a random photo that merely carries the tag.
    """
    query = keyword.replace(',', ' ')
    if query in _commons_cache:
        return _commons_cache[query]
    tokens = [t for t in query.lower().split() if len(t) > 3]
    try:
        response = requests.get(
            COMMONS_API,
            params={
                'action': 'query', 'format': 'json',
                'generator': 'search', 'gsrnamespace': 6, 'gsrlimit': 20,
                'gsrsearch': f'filetype:bitmap {query}',
                'prop': 'imageinfo', 'iiprop': 'url', 'iiurlwidth': 800,
            },
            timeout=15, headers=HTTP_HEADERS,
        )
        response.raise_for_status()
        pages = (response.json().get('query') or {}).get('pages') or {}
        scored = []
        for page in pages.values():
            info_block = (page.get('imageinfo') or [{}])[0]
            thumb = info_block.get('thumburl')
            if not thumb:
                continue
            score = _score_title(page.get('title', ''), tokens) if tokens else 0
            if score < 0:
                continue
            # Search rank breaks ties, so equally-good names keep Commons order.
            scored.append((-score, page.get('index', 99), thumb))
        urls = [item[2] for item in sorted(scored)]
    except Exception:
        urls = []
    _commons_cache[query] = urls
    return urls


def product_photo_candidates(keyword: str, index: int) -> list[str]:
    """Ordered photo URLs for a product slot, best source first.

    Commons is catalogued so it matches the product; Openverse is
    relevance-ranked; the tag service is the last resort. They live on
    different hosts, which is the point — if one is rate limiting the seeder
    can still store a local image from another.
    """
    candidates: list[str] = []
    for source in (_commons_candidates, _openverse_candidates):
        found = source(keyword)
        if found:
            candidates.append(found[index % len(found)])
            # A second pick from the same source covers a dead direct link.
            if len(found) > 1:
                candidates.append(found[(index + 1) % len(found)])
    candidates.append(
        'https://loremflickr.com/600/600/%s?lock=%d' % (keyword, index)
    )
    return candidates


def product_photo_url(keyword: str, index: int) -> str:
    """Single best photo URL. Prefer product_photo_candidates when seeding."""
    return product_photo_candidates(keyword, index)[0]


def avatar_fallback(index: int, female: bool) -> str:
    return avatar_url(index, female)


# ── Random data pools ─────────────────────────────────────────────────────────

FIRST_NAMES = [
    'Aarav', 'Aayush', 'Abhishek', 'Aditya', 'Ajay', 'Alisha', 'Amrita',
    'Ananya', 'Anish', 'Anjali', 'Ankit', 'Anusha', 'Arjun', 'Aryan',
    'Ashish', 'Barsha', 'Bibek', 'Binita', 'Bishal', 'Deepak', 'Deepika',
    'Dinesh', 'Dipika', 'Gita', 'Hari', 'Ishaan', 'Jeevan', 'Kabita',
    'Kalpana', 'Kamal', 'Kritika', 'Laxmi', 'Madhav', 'Manish', 'Manisha',
    'Maya', 'Milan', 'Mohan', 'Nandita', 'Nisha', 'Nitesh', 'Pankaj',
    'Prabha', 'Pradip', 'Prakash', 'Priya', 'Puja', 'Rabina', 'Radhika',
    'Rahul', 'Rajesh', 'Ramesh', 'Ravi', 'Rohit', 'Roshan', 'Sachin',
    'Samjhana', 'Sandesh', 'Sanjay', 'Santosh', 'Sarita', 'Shruti', 'Sita',
    'Smriti', 'Sujata', 'Suman', 'Sunita', 'Suresh', 'Swastika', 'Uma',
    'Usha', 'Vijay', 'Yogesh',
]

FEMALE_NAMES = {
    'Alisha', 'Amrita', 'Ananya', 'Anjali', 'Anusha', 'Barsha', 'Binita',
    'Deepika', 'Dipika', 'Gita', 'Kabita', 'Kalpana', 'Kritika', 'Laxmi',
    'Manisha', 'Maya', 'Nandita', 'Nisha', 'Prabha', 'Priya', 'Puja',
    'Rabina', 'Radhika', 'Samjhana', 'Sarita', 'Shruti', 'Sita', 'Smriti',
    'Sujata', 'Sunita', 'Swastika', 'Uma', 'Usha',
}

LAST_NAMES = [
    'Adhikari', 'Acharya', 'Basnet', 'Bhattarai', 'Bista', 'Chaudhary',
    'Dahal', 'Dhakal', 'Gautam', 'Ghimire', 'Gurung', 'Karki', 'Khanal',
    'Koirala', 'Lama', 'Limbu', 'Magar', 'Maharjan', 'Neupane', 'Oli',
    'Pandey', 'Parajuli', 'Poudel', 'Rai', 'Regmi', 'Sapkota', 'Shah',
    'Sharma', 'Shrestha', 'Subedi', 'Tamang', 'Thapa', 'Timilsina',
]

CITIES = [
    'Kathmandu', 'Pokhara', 'Lalitpur', 'Biratnagar', 'Birgunj', 'Butwal',
    'Dharan', 'Hetauda', 'Itahari', 'Janakpur', 'Nepalgunj', 'Bhaktapur',
]


def rng_for(kind: str, index: int) -> random.Random:
    """A generator seeded from (kind, index).

    Everything about a seeded person is derived from this, so slot 7 is always
    the same person with the same email. That is what makes re-running a seeder
    skip existing rows instead of creating near-duplicates under new names.
    """
    return random.Random(f'{kind}-{index}')


def rand_name(rng: random.Random | None = None) -> tuple[str, bool]:
    """Returns (full name, is_female) — the flag picks a matching portrait."""
    rng = rng or random
    first = rng.choice(FIRST_NAMES)
    return f'{first} {rng.choice(LAST_NAMES)}', first in FEMALE_NAMES


def rand_dob(min_age=18, max_age=55, rng: random.Random | None = None) -> str:
    from datetime import date, timedelta
    rng = rng or random
    days = rng.randint(min_age * 365, max_age * 365)
    return (date.today() - timedelta(days=days)).isoformat()


def rand_past(days=365, rng: random.Random | None = None) -> str:
    from datetime import date, timedelta
    rng = rng or random
    offset = rng.randint(0, days)
    return (date.today() - timedelta(days=offset)).strftime('%Y-%m-%d %H:%M:%S')
