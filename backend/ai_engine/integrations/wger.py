"""
wger.py — wger.de Exercise API integration.
Free, public, no API key required.
Used as the EXERCISE KNOWLEDGE BASE only — never used to train the AI.
The recommendation engine decides WHAT KIND of workout fits the user
(category, intensity, body parts to target), then this module fetches
matching exercises (with real illustration images, instructions,
equipment) from wger.de.

API docs: https://wger.de/en/software/api
"""
import requests

WGER_BASE_URL = "https://wger.de/api/v2"
ENGLISH_LANGUAGE_ID = 2

# wger.de exercisecategory IDs (fetched from /api/v2/exercisecategory/)
CATEGORY_IDS = {
    "abs": 10, "arms": 8, "back": 12, "calves": 14,
    "cardio": 15, "chest": 11, "legs": 9, "shoulders": 13,
}

# Maps our internal recommendation categories -> wger body-part keys
CATEGORY_TO_BODYPART = {
    "cardio_light":    ["cardio"],
    "cardio_moderate": ["cardio"],
    "cardio_intense":  ["cardio"],
    "strength_light":  ["chest", "back", "legs"],
    "strength_heavy":  ["chest", "back", "legs", "shoulders"],
    "yoga_light":      ["abs", "back"],
    "rest_recovery":   ["abs"],
}


def get_exercises_by_body_part(body_part: str, limit: int = 6) -> list:
    """Fetch exercises for a body part that have a real illustration image."""
    category_id = CATEGORY_IDS.get(body_part)
    if not category_id:
        return _fallback_exercises(body_part)
    try:
        r = requests.get(
            f"{WGER_BASE_URL}/exerciseinfo/",
            params={"category": category_id, "language": ENGLISH_LANGUAGE_ID, "limit": 30},
            timeout=6,
        )
        if r.status_code != 200:
            return _fallback_exercises(body_part)
        exercises = []
        for e in r.json().get("results", []):
            if not e.get("images"):
                continue
            normalized = _normalize_exercise(e, body_part)
            if normalized:
                exercises.append(normalized)
            if len(exercises) >= limit:
                break
        return exercises if exercises else _fallback_exercises(body_part)
    except Exception:
        return _fallback_exercises(body_part)


def get_exercises_for_category(category: str, limit_per_part: int = 3) -> list:
    """
    Given our AI-decided category (e.g. 'strength_light'), pulls a mixed
    set of matching exercises across the relevant body parts.
    """
    body_parts = CATEGORY_TO_BODYPART.get(category, ["cardio"])
    all_exercises = []
    for bp in body_parts:
        all_exercises.extend(get_exercises_by_body_part(bp, limit_per_part))
    return all_exercises


def _clean_instructions(description_source: str) -> list:
    lines = [l.strip().lstrip("*-• ").replace("**", "") for l in (description_source or "").split("\n")]
    return [l for l in lines if l][:6]


def _normalize_exercise(e: dict, body_part: str) -> dict | None:
    translation = next(
        (t for t in e.get("translations", []) if t.get("language") == ENGLISH_LANGUAGE_ID and t.get("name")),
        None,
    )
    if not translation:
        return None
    muscles = e.get("muscles") or []
    secondary = e.get("muscles_secondary") or []
    equipment = e.get("equipment") or []
    return {
        "exercise_id": str(e.get("id", "")),
        "name": translation["name"],
        "body_part": body_part,
        "target_muscle": muscles[0].get("name_en") or muscles[0].get("name") if muscles else e.get("category", {}).get("name", ""),
        "secondary_muscles": [m.get("name_en") or m.get("name") for m in secondary],
        "equipment": equipment[0]["name"] if equipment else "body weight",
        "instructions": _clean_instructions(translation.get("description_source") or translation.get("description")),
        "gif_url": e["images"][0].get("image", ""),
        "difficulty": "intermediate",
    }


# ── Fallback static library (used only when wger.de is unreachable,
#    so the feature still demos without requiring network access) ──────
_FALLBACK_DB = {
    "cardio": [
        {"exercise_id": "fb_card_1", "name": "Jogging In Place", "body_part": "cardio", "target_muscle": "cardiovascular system",
         "secondary_muscles": ["calves", "quads"], "equipment": "body weight",
         "instructions": ["Stand tall.", "Jog in place lifting knees moderately.", "Maintain steady breathing for the duration."],
         "gif_url": "", "difficulty": "beginner"},
        {"exercise_id": "fb_card_2", "name": "Jumping Jacks", "body_part": "cardio", "target_muscle": "cardiovascular system",
         "secondary_muscles": ["shoulders", "calves"], "equipment": "body weight",
         "instructions": ["Stand with feet together, arms at sides.", "Jump while spreading legs and raising arms overhead.", "Return to start and repeat."],
         "gif_url": "", "difficulty": "beginner"},
    ],
    "chest": [
        {"exercise_id": "fb_chest_1", "name": "Push-Ups", "body_part": "chest", "target_muscle": "pectorals",
         "secondary_muscles": ["triceps", "shoulders"], "equipment": "body weight",
         "instructions": ["Start in a plank position.", "Lower body until chest nearly touches floor.", "Push back up to start."],
         "gif_url": "", "difficulty": "beginner"},
    ],
    "back": [
        {"exercise_id": "fb_back_1", "name": "Superman Hold", "body_part": "back", "target_muscle": "lower back",
         "secondary_muscles": ["glutes"], "equipment": "body weight",
         "instructions": ["Lie face down, arms extended forward.", "Lift arms and legs simultaneously.", "Hold briefly then lower."],
         "gif_url": "", "difficulty": "beginner"},
    ],
    "legs": [
        {"exercise_id": "fb_leg_1", "name": "Bodyweight Squats", "body_part": "legs", "target_muscle": "quads",
         "secondary_muscles": ["glutes", "hamstrings"], "equipment": "body weight",
         "instructions": ["Stand feet shoulder-width apart.", "Lower hips back and down as if sitting.", "Push through heels to stand."],
         "gif_url": "", "difficulty": "beginner"},
    ],
    "shoulders": [
        {"exercise_id": "fb_sh_1", "name": "Pike Push-Ups", "body_part": "shoulders", "target_muscle": "deltoids",
         "secondary_muscles": ["triceps"], "equipment": "body weight",
         "instructions": ["Start in downward-dog position.", "Bend elbows to lower head toward floor.", "Push back up."],
         "gif_url": "", "difficulty": "intermediate"},
    ],
    "abs": [
        {"exercise_id": "fb_abs_1", "name": "Seated Forward Bend (Yoga)", "body_part": "abs", "target_muscle": "hamstrings, lower back",
         "secondary_muscles": ["calves"], "equipment": "body weight",
         "instructions": ["Sit with legs extended.", "Hinge at hips and reach toward toes.", "Hold and breathe deeply."],
         "gif_url": "", "difficulty": "beginner"},
        {"exercise_id": "fb_abs_2", "name": "Cat-Cow Stretch", "body_part": "abs", "target_muscle": "spine",
         "secondary_muscles": ["core"], "equipment": "body weight",
         "instructions": ["Start on hands and knees.", "Alternate arching and rounding the spine.", "Move slowly with breath."],
         "gif_url": "", "difficulty": "beginner"},
    ],
}


def _fallback_exercises(body_part: str) -> list:
    return _FALLBACK_DB.get(body_part, _FALLBACK_DB["cardio"])
