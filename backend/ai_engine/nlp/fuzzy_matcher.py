"""
fuzzy_matcher.py
RapidFuzz-based fuzzy string matching for misspellings, abbreviations,
and Nepali local food names. Normalizes user text before querying
the food knowledge base.
"""
from __future__ import annotations
from rapidfuzz import fuzz, process

# ── Synonym map: local/abbreviated terms -> canonical food names ──
SYNONYM_MAP = {
    "chiya": "tea", "kalo chiya": "black tea", "doodh chiya": "milk tea",
    "masala chiya": "masala tea", "dudh chiya": "milk tea",
    "pauroti": "bread", "paurot": "bread",
    "dal bhat": "daal bhaat", "daal bhat": "daal bhaat", "dalbhat": "daal bhaat",
    "buff": "buffalo", "bhaisi": "buffalo",
    "alu": "potato", "aloo": "potato",
    "tarkari": "vegetable curry", "sabji": "vegetable curry",
    "momo": "dumplings", "mo:mo": "dumplings",
    "khasi": "goat", "kukhura": "chicken",
    "machha": "fish", "maccha": "fish",
    "dahi": "yogurt", "curd": "yogurt",
    "syau": "apple", "kera": "banana", "suntala": "orange",
    "anda": "egg", "phul": "egg",
    "chamal": "rice", "bhat": "rice",
    "badam": "peanut", "akhrot": "walnut", "kaju": "cashew", "kismis": "raisin",
    "saag": "spinach", "palungo": "spinach",
    "roti": "flatbread", "chapati": "flatbread",
    "selroti": "sel roti",
}

# ── Cuisine keyword detection ──
CUISINE_KEYWORDS = {
    "nepali": ["nepali", "nepalese", "daal", "dal bhat", "momo", "gundruk", "dhido", "thukpa"],
    "indian": ["indian", "punjabi", "tandoori", "biryani", "naan", "paneer"],
    "chinese": ["chinese", "noodles", "fried rice", "spring roll", "kungpao"],
    "japanese": ["japanese", "sushi", "ramen", "tempura", "miso"],
    "korean": ["korean", "kimchi", "bibimbap", "bulgogi"],
    "thai": ["thai", "pad thai", "tom yum", "green curry"],
    "italian": ["italian", "pasta", "pizza", "risotto", "lasagna"],
    "mediterranean": ["mediterranean", "hummus", "falafel", "greek"],
    "mexican": ["mexican", "taco", "burrito", "quesadilla", "nachos"],
    "american": ["american", "burger", "fries", "hot dog", "bbq"],
}

# ── Meal-type keyword detection ──
MEAL_TYPE_KEYWORDS = {
    "breakfast": ["breakfast", "morning", "bihana"],
    "lunch": ["lunch", "din ko khana", "midday", "afternoon meal"],
    "snack": ["snack", "nasta", "evening snack", "tea time"],
    "dinner": ["dinner", "raati ko khana", "evening meal", "supper"],
}


def normalize_text(text: str) -> str:
    """Lowercase + apply synonym replacement for known local terms."""
    text_lower = text.lower().strip()
    for local_term, canonical in SYNONYM_MAP.items():
        if local_term in text_lower:
            text_lower = text_lower.replace(local_term, canonical)
    return text_lower


def fuzzy_match_food(query: str, food_index: dict, threshold: int = 75) -> dict | None:
    """
    Fuzzy-matches a (possibly misspelled/local) food query against the
    knowledge base tag index. Returns the best matching food dict or None.
    `food_index` is a flat {tag: food_dict} map (see knowledge_base.nepali_foods.get_all_tags_index).
    """
    normalized = normalize_text(query)
    candidates = list(food_index.keys())
    if not candidates:
        return None

    best_match = process.extractOne(normalized, candidates, scorer=fuzz.WRatio)
    if best_match and best_match[1] >= threshold:
        matched_tag = best_match[0]
        return food_index[matched_tag]
    return None


def fuzzy_match_multiple(query: str, food_index: dict, limit: int = 5, threshold: int = 65) -> list:
    """Returns top N fuzzy matches above threshold — useful for autocomplete."""
    normalized = normalize_text(query)
    candidates = list(food_index.keys())
    matches = process.extract(normalized, candidates, scorer=fuzz.WRatio, limit=limit)
    results = []
    seen_names = set()
    for tag, score, _ in matches:
        if score >= threshold:
            food = food_index[tag]
            if food["name"] not in seen_names:
                results.append({**food, "match_score": score})
                seen_names.add(food["name"])
    return results


def detect_cuisine(text: str) -> str | None:
    text_lower = text.lower()
    for cuisine, keywords in CUISINE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return cuisine
    return None


def detect_meal_type(text: str) -> str | None:
    text_lower = text.lower()
    for meal_type, keywords in MEAL_TYPE_KEYWORDS.items():
        if any(kw in text_lower for kw in keywords):
            return meal_type
    return None
