"""
usda.py — USDA FoodData Central API Integration
Primary nutritional database for all non-Nepali foods.
API Key: free at https://fdc.nal.usda.gov/api-guide.html
"""
import os, requests
from typing import Optional

USDA_BASE_URL = "https://api.nal.usda.gov/fdc/v1"
USDA_API_KEY  = os.getenv("USDA_API_KEY", "DEMO_KEY")


def search_food(query: str, page_size: int = 5) -> list:
    """Search USDA FoodData Central for a food by name."""
    try:
        r = requests.get(
            f"{USDA_BASE_URL}/foods/search",
            params={"query": query, "pageSize": page_size, "api_key": USDA_API_KEY,
                    "dataType": "Foundation,SR Legacy"},
            timeout=5,
        )
        if r.status_code != 200:
            return []
        items = r.json().get("foods", [])
        return [_normalize_usda(f) for f in items]
    except Exception:
        return []


def get_food_by_fdc_id(fdc_id: str) -> Optional[dict]:
    """Get full nutritional details for a specific FDC food ID."""
    try:
        r = requests.get(
            f"{USDA_BASE_URL}/food/{fdc_id}",
            params={"api_key": USDA_API_KEY},
            timeout=5,
        )
        return _normalize_usda_detail(r.json()) if r.status_code == 200 else None
    except Exception:
        return None


def _get_nutrient(nutrients: list, nutrient_id: int) -> float:
    """Extract a specific nutrient value by USDA nutrient ID."""
    for n in nutrients:
        if n.get("nutrientId") == nutrient_id or n.get("nutrient", {}).get("id") == nutrient_id:
            return round(float(n.get("value", n.get("amount", 0)) or 0), 2)
    return 0.0


# USDA nutrient IDs (standard)
_USDA_IDS = {
    "calories": 1008, "protein": 1003, "fat": 1004, "carbs": 1005,
    "fiber": 1079, "sugar": 2000, "sodium": 1093,
    "vitamin_c": 1162, "calcium": 1087, "iron": 1089,
    "potassium": 1092, "vitamin_d": 1114,
}


def _normalize_usda(food: dict) -> dict:
    nutrients = food.get("foodNutrients", [])
    serving = food.get("servingSize", 100)
    unit = food.get("servingSizeUnit", "g")
    return {
        "source": "usda",
        "fdc_id": str(food.get("fdcId", "")),
        "name": food.get("description", ""),
        "brand": food.get("brandOwner", ""),
        "calories": _get_nutrient(nutrients, _USDA_IDS["calories"]),
        "protein_g": _get_nutrient(nutrients, _USDA_IDS["protein"]),
        "carbs_g": _get_nutrient(nutrients, _USDA_IDS["carbs"]),
        "fat_g": _get_nutrient(nutrients, _USDA_IDS["fat"]),
        "fiber_g": _get_nutrient(nutrients, _USDA_IDS["fiber"]),
        "sugar_g": _get_nutrient(nutrients, _USDA_IDS["sugar"]),
        "sodium_mg": _get_nutrient(nutrients, _USDA_IDS["sodium"]),
        "serving_size": float(serving or 100),
        "serving_unit": unit,
        "is_vegetarian": False, "is_vegan": False,
    }


def _normalize_usda_detail(food: dict) -> dict:
    nutrients = food.get("foodNutrients", [])
    portions = food.get("foodPortions", [])
    serving = portions[0].get("gramWeight", 100) if portions else 100
    unit = portions[0].get("portionDescription", "g") if portions else "g"
    return {
        "source": "usda",
        "fdc_id": str(food.get("fdcId", "")),
        "name": food.get("description", ""),
        "calories": _get_nutrient(nutrients, _USDA_IDS["calories"]),
        "protein_g": _get_nutrient(nutrients, _USDA_IDS["protein"]),
        "carbs_g": _get_nutrient(nutrients, _USDA_IDS["carbs"]),
        "fat_g": _get_nutrient(nutrients, _USDA_IDS["fat"]),
        "fiber_g": _get_nutrient(nutrients, _USDA_IDS["fiber"]),
        "sugar_g": _get_nutrient(nutrients, _USDA_IDS["sugar"]),
        "sodium_mg": _get_nutrient(nutrients, _USDA_IDS["sodium"]),
        "vitamin_c_mg": _get_nutrient(nutrients, _USDA_IDS["vitamin_c"]),
        "calcium_mg": _get_nutrient(nutrients, _USDA_IDS["calcium"]),
        "iron_mg": _get_nutrient(nutrients, _USDA_IDS["iron"]),
        "serving_size": float(serving),
        "serving_unit": unit,
    }
