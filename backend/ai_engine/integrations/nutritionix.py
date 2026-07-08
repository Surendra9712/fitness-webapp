"""
nutritionix.py — Nutritionix API Integration
Secondary nutritional database — used when USDA has no match,
for branded foods, restaurant foods, and natural-language queries.
Free tier: https://www.nutritionix.com/business/api
"""
import os, requests

NUTRITIONIX_APP_ID  = os.getenv("NUTRITIONIX_APP_ID", "")
NUTRITIONIX_APP_KEY = os.getenv("NUTRITIONIX_APP_KEY", "")
NUTRITIONIX_BASE_URL = "https://trackapi.nutritionix.com/v2"

_HEADERS = {
    "x-app-id": NUTRITIONIX_APP_ID,
    "x-app-key": NUTRITIONIX_APP_KEY,
    "Content-Type": "application/json",
}


def is_configured() -> bool:
    return bool(NUTRITIONIX_APP_ID and NUTRITIONIX_APP_KEY)


def search_instant(query: str) -> list:
    """Fast autocomplete-style search — common + branded foods."""
    if not is_configured():
        return []
    try:
        r = requests.get(
            f"{NUTRITIONIX_BASE_URL}/search/instant",
            params={"query": query}, headers=_HEADERS, timeout=5,
        )
        if r.status_code != 200:
            return []
        data = r.json()
        results = []
        for item in data.get("common", [])[:5]:
            results.append({"source": "nutritionix", "name": item["food_name"].title(),
                             "type": "common", "photo": item.get("photo", {}).get("thumb")})
        for item in data.get("branded", [])[:5]:
            results.append({"source": "nutritionix", "name": item["food_name"],
                             "brand": item.get("brand_name"), "type": "branded",
                             "nix_item_id": item.get("nix_item_id"),
                             "photo": item.get("photo", {}).get("thumb")})
        return results
    except Exception:
        return []


def get_nutrients_natural_language(query: str) -> list:
    """
    Natural language nutrient lookup — e.g. "1 cup rice and 2 eggs".
    Returns full nutrition breakdown per food mentioned.
    """
    if not is_configured():
        return []
    try:
        r = requests.post(
            f"{NUTRITIONIX_BASE_URL}/natural/nutrients",
            json={"query": query}, headers=_HEADERS, timeout=6,
        )
        if r.status_code != 200:
            return []
        foods = r.json().get("foods", [])
        return [_normalize_nutritionix(f) for f in foods]
    except Exception:
        return []


def get_branded_food_nutrients(nix_item_id: str) -> dict | None:
    if not is_configured():
        return None
    try:
        r = requests.get(
            f"{NUTRITIONIX_BASE_URL}/search/item",
            params={"nix_item_id": nix_item_id}, headers=_HEADERS, timeout=5,
        )
        if r.status_code != 200:
            return None
        foods = r.json().get("foods", [])
        return _normalize_nutritionix(foods[0]) if foods else None
    except Exception:
        return None


def _normalize_nutritionix(food: dict) -> dict:
    return {
        "source": "nutritionix",
        "name": food.get("food_name", "").title(),
        "brand": food.get("brand_name"),
        "calories": round(float(food.get("nf_calories", 0) or 0), 1),
        "protein_g": round(float(food.get("nf_protein", 0) or 0), 1),
        "carbs_g": round(float(food.get("nf_total_carbohydrate", 0) or 0), 1),
        "fat_g": round(float(food.get("nf_total_fat", 0) or 0), 1),
        "fiber_g": round(float(food.get("nf_dietary_fiber", 0) or 0), 1),
        "sugar_g": round(float(food.get("nf_sugars", 0) or 0), 1),
        "sodium_mg": round(float(food.get("nf_sodium", 0) or 0), 1),
        "serving_size": float(food.get("serving_qty", 1) or 1),
        "serving_unit": food.get("serving_unit", "serving"),
        "serving_weight_g": food.get("serving_weight_grams"),
        "photo": food.get("photo", {}).get("thumb"),
    }
