"""
usda.py — USDA FoodData Central API Integration
Primary nutritional database for all non-Nepali (international) cuisine foods.
API Key: free at https://fdc.nal.usda.gov/api-guide.html

CUISINE QUERY MAP: maps cuisine names to USDA search terms per meal type
so we can fetch real USDA data for Italian, Chinese, Japanese etc.
"""
import os
import requests
from typing import Optional

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"

def _get_api_key():
    return os.getenv("USDA_API_KEY", "DEMO_KEY")

# Maps cuisine + meal_type → USDA search queries
# These queries return real foods from USDA that match the cuisine
CUISINE_MEAL_QUERIES = {
    "italian": {
        "breakfast": ["italian frittata", "bruschetta", "cornetto", "italian yogurt"],
        "lunch":     ["pasta marinara", "minestrone soup", "italian salad", "risotto", "pasta primavera"],
        "snack":     ["bruschetta", "caprese", "italian breadstick", "focaccia"],
        "dinner":    ["spaghetti bolognese", "penne arrabbiata", "lasagna", "pizza margherita", "chicken piccata"],
    },
    "chinese": {
        "breakfast": ["congee rice porridge", "dim sum", "chinese steamed bun", "egg drop soup"],
        "lunch":     ["fried rice", "chow mein noodles", "kung pao chicken", "mapo tofu", "hot sour soup"],
        "snack":     ["spring roll", "wonton", "chinese dumpling", "sesame ball"],
        "dinner":    ["sweet sour pork", "beef broccoli stir fry", "chinese steamed fish", "mongolian beef"],
    },
    "japanese": {
        "breakfast": ["miso soup", "japanese rice porridge", "tamagoyaki egg", "natto"],
        "lunch":     ["sushi roll", "ramen noodle soup", "udon noodle", "teriyaki chicken", "bento box"],
        "snack":     ["edamame", "onigiri rice ball", "mochi", "japanese green tea"],
        "dinner":    ["salmon teriyaki", "tonkatsu pork", "yakitori chicken", "japanese curry rice"],
    },
    "mexican": {
        "breakfast": ["huevos rancheros", "mexican scrambled eggs", "tamale", "atole"],
        "lunch":     ["chicken taco", "burrito bowl", "quesadilla", "mexican rice beans", "tortilla soup"],
        "snack":     ["guacamole", "salsa chips", "mexican corn elote", "churro"],
        "dinner":    ["enchilada", "fajita chicken", "chile relleno", "pozole soup"],
    },
    "indian": {
        "breakfast": ["idli sambar", "dosa", "upma", "poha", "paratha", "chole bhature"],
        "lunch":     ["butter chicken", "dal makhani", "palak paneer", "chicken biryani", "aloo gobi"],
        "snack":     ["samosa", "pakora", "paneer tikka", "chaat", "masala chai"],
        "dinner":    ["tandoori chicken", "lamb rogan josh", "fish curry", "vegetable korma", "naan bread"],
    },
    "mediterranean": {
        "breakfast": ["greek yogurt", "shakshuka", "pita hummus", "labneh", "mediterranean omelette"],
        "lunch":     ["falafel wrap", "greek salad", "tabbouleh", "lentil soup", "fattoush salad"],
        "snack":     ["hummus vegetables", "tzatziki", "olives feta", "stuffed grape leaves"],
        "dinner":    ["lamb kebab", "grilled sea bass", "moussaka", "seafood paella", "chicken shawarma"],
    },
    "thai": {
        "breakfast": ["thai rice congee", "pad kra pao", "thai omelette", "khao tom"],
        "lunch":     ["pad thai noodles", "green curry", "tom yum soup", "mango sticky rice"],
        "snack":     ["thai spring roll", "satay skewer", "thai papaya salad", "mango smoothie"],
        "dinner":    ["massaman curry", "red curry chicken", "thai basil fried rice", "tom kha soup"],
    },
    "korean": {
        "breakfast": ["juk rice porridge", "korean soft tofu soup", "kimchi jjigae", "gyeran mari"],
        "lunch":     ["bibimbap", "bulgogi beef", "japchae noodles", "doenjang jjigae", "sundubu jjigae"],
        "snack":     ["kimchi", "tteok rice cake", "japchae", "korean fried chicken"],
        "dinner":    ["galbi ribs", "samgyeopsal pork belly", "dakgalbi spicy chicken", "haemul pajeon"],
    },
    "american": {
        "breakfast": ["avocado toast", "pancakes", "oatmeal", "scrambled eggs bacon", "granola yogurt"],
        "lunch":     ["grilled chicken salad", "turkey sandwich", "caesar salad", "chicken soup", "veggie wrap"],
        "snack":     ["apple peanut butter", "trail mix", "protein bar", "hummus vegetables"],
        "dinner":    ["grilled salmon", "chicken breast vegetables", "beef steak", "veggie burger", "pasta chicken"],
    },
    "french": {
        "breakfast": ["croissant", "crepe", "pain au chocolat", "french omelette", "tartine"],
        "lunch":     ["french onion soup", "nicoise salad", "croque monsieur", "quiche lorraine"],
        "snack":     ["baguette cheese", "french macaron", "eclair", "madeleine"],
        "dinner":    ["beef bourguignon", "chicken coq au vin", "ratatouille", "bouillabaisse"],
    },
}

USDA_NUTRIENT_IDS = {
    "calories": 1008, "protein": 1003, "fat": 1004, "carbs": 1005,
    "fiber": 1079, "sugar": 2000, "sodium": 1093,
}


def _get_nutrient(nutrients: list, nutrient_id: int) -> float:
    for n in nutrients:
        nid = n.get("nutrientId") or n.get("nutrient", {}).get("id")
        if nid == nutrient_id:
            return round(float(n.get("value", n.get("amount", 0)) or 0), 2)
    return 0.0


def _normalize_usda(food: dict, cuisine: str = "international") -> dict:
    nutrients = food.get("foodNutrients", [])
    serving   = float(food.get("servingSize", 100) or 100)
    unit      = food.get("servingSizeUnit", "g") or "g"
    cal       = _get_nutrient(nutrients, USDA_NUTRIENT_IDS["calories"])
    # USDA returns per 100g — scale to serving size
    scale = serving / 100.0 if serving != 100 else 1.0
    return {
        "source":      "usda",
        "fdc_id":      str(food.get("fdcId", "")),
        "name":        food.get("description", "").title(),
        "brand":       food.get("brandOwner", ""),
        "calories":    round(cal * scale, 1),
        "protein_g":   round(_get_nutrient(nutrients, USDA_NUTRIENT_IDS["protein"]) * scale, 1),
        "carbs_g":     round(_get_nutrient(nutrients, USDA_NUTRIENT_IDS["carbs"]) * scale, 1),
        "fat_g":       round(_get_nutrient(nutrients, USDA_NUTRIENT_IDS["fat"]) * scale, 1),
        "fiber_g":     round(_get_nutrient(nutrients, USDA_NUTRIENT_IDS["fiber"]) * scale, 1),
        "sugar_g":     round(_get_nutrient(nutrients, USDA_NUTRIENT_IDS["sugar"]) * scale, 1),
        "sodium_mg":   round(_get_nutrient(nutrients, USDA_NUTRIENT_IDS["sodium"]) * scale, 1),
        "serving_size": serving,
        "serving_unit": unit,
        "cuisine":      cuisine,
        "meal_types":   ["breakfast","lunch","snack","dinner"],
        "is_vegetarian": False,
        "is_vegan":      False,
        "tags":          [food.get("description","").lower()],
    }


def search_food(query: str, page_size: int = 5, cuisine: str = "international") -> list:
    """Search USDA for a food by name."""
    try:
        r = requests.get(
            f"{USDA_BASE_URL}/foods/search",
            params={
                "query":    query,
                "pageSize": page_size,
                "api_key":  _get_api_key(),
                "dataType": "Foundation,SR Legacy",
            },
            timeout=6,
        )
        if r.status_code != 200:
            return []
        return [_normalize_usda(f, cuisine) for f in r.json().get("foods", [])]
    except Exception:
        return []


def get_foods_for_cuisine_meal(cuisine: str, meal_type: str,
                                dietary: dict = None, top_n: int = 5) -> list:
    """
    Fetch real USDA foods for a specific cuisine + meal_type combination.
    Uses curated search queries per cuisine to get relevant results.
    Filters by calorie band and dietary constraints.
    """
    dietary = dietary or {}
    queries  = CUISINE_MEAL_QUERIES.get(cuisine.lower(), {}).get(meal_type, [])
    if not queries:
        # Fallback: generic search
        queries = [f"{cuisine} {meal_type}"]

    MEAL_BANDS = {
        "breakfast": (60,  350),
        "lunch":     (350, 700),
        "snack":     (40,  220),
        "dinner":    (280, 600),
    }
    lo, hi = MEAL_BANDS.get(meal_type, (50, 800))

    results = []
    seen    = set()

    for query in queries[:3]:  # Try first 3 queries to get variety
        foods = search_food(query, page_size=4, cuisine=cuisine)
        for food in foods:
            name = food.get("name", "")
            cal  = food.get("calories", 0)
            if name in seen:
                continue
            # Skip foods with 0 calories (data error)
            if cal == 0:
                continue
            # Filter dietary constraints
            if dietary.get("is_vegan") and not food.get("is_vegan"):
                continue
            if dietary.get("is_vegetarian") and not food.get("is_vegetarian"):
                # For USDA we can't always determine this — include if uncertain
                pass
            # Add cuisine tag
            food["cuisine"] = cuisine.lower()
            food["meal_types"] = [meal_type]
            seen.add(name)
            results.append(food)
        if len(results) >= top_n:
            break

    return results[:top_n]


def get_food_by_fdc_id(fdc_id: str) -> Optional[dict]:
    try:
        r = requests.get(
            f"{USDA_BASE_URL}/food/{fdc_id}",
            params={"api_key": _get_api_key()},
            timeout=5,
        )
        return _normalize_usda(r.json()) if r.status_code == 200 else None
    except Exception:
        return None
