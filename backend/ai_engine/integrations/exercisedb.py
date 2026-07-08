"""
exercisedb.py — ExerciseDB API Integration
Used as the EXERCISE KNOWLEDGE BASE only — never used to train the AI.
The recommendation engine decides WHAT KIND of workout fits the user
(category, intensity, body parts to target), then this module fetches
the matching exercises (with GIFs, instructions, equipment) from
ExerciseDB.

API: https://www.exercisedb.dev or RapidAPI ExerciseDB
Free tier available via RapidAPI.
"""
import os, requests

EXERCISEDB_BASE_URL = os.getenv("EXERCISEDB_BASE_URL", "https://exercisedb.p.rapidapi.com")
EXERCISEDB_API_KEY  = os.getenv("EXERCISEDB_API_KEY", "")
EXERCISEDB_HOST     = os.getenv("EXERCISEDB_HOST", "exercisedb.p.rapidapi.com")

_HEADERS = {
    "X-RapidAPI-Key": EXERCISEDB_API_KEY,
    "X-RapidAPI-Host": EXERCISEDB_HOST,
}

# Maps our internal recommendation categories -> ExerciseDB bodyPart/target filters
CATEGORY_TO_BODYPART = {
    "cardio_light":    ["cardio"],
    "cardio_moderate": ["cardio"],
    "cardio_intense":  ["cardio"],
    "strength_light":  ["chest", "back", "upper legs"],
    "strength_heavy":  ["chest", "back", "upper legs", "shoulders"],
    "yoga_light":      ["waist", "back"],
    "rest_recovery":   ["waist"],
}


def is_configured() -> bool:
    return bool(EXERCISEDB_API_KEY)


def get_exercises_by_body_part(body_part: str, limit: int = 6) -> list:
    """Fetch exercises filtered by body part — includes GIF + instructions."""
    if not is_configured():
        return _fallback_exercises(body_part)
    try:
        r = requests.get(
            f"{EXERCISEDB_BASE_URL}/exercises/bodyPart/{body_part}",
            headers=_HEADERS, params={"limit": limit}, timeout=6,
        )
        if r.status_code != 200:
            return _fallback_exercises(body_part)
        return [_normalize_exercise(e) for e in r.json()[:limit]]
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


def get_exercise_by_id(exercise_id: str) -> dict | None:
    if not is_configured():
        return None
    try:
        r = requests.get(f"{EXERCISEDB_BASE_URL}/exercises/exercise/{exercise_id}", headers=_HEADERS, timeout=5)
        return _normalize_exercise(r.json()) if r.status_code == 200 else None
    except Exception:
        return None


def _normalize_exercise(e: dict) -> dict:
    return {
        "exercise_id": e.get("id", ""),
        "name": e.get("name", "").title(),
        "body_part": e.get("bodyPart", ""),
        "target_muscle": e.get("target", ""),
        "secondary_muscles": e.get("secondaryMuscles", []),
        "equipment": e.get("equipment", ""),
        "instructions": e.get("instructions", []),
        "gif_url": e.get("gifUrl", ""),
        "difficulty": e.get("difficulty", "intermediate"),
    }


# ── Fallback static library (used only when no API key is configured,
#    so the feature still demos without requiring a paid key) ──────
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
    "upper legs": [
        {"exercise_id": "fb_leg_1", "name": "Bodyweight Squats", "body_part": "upper legs", "target_muscle": "quads",
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
    "waist": [
        {"exercise_id": "fb_waist_1", "name": "Seated Forward Bend (Yoga)", "body_part": "waist", "target_muscle": "hamstrings, lower back",
         "secondary_muscles": ["calves"], "equipment": "body weight",
         "instructions": ["Sit with legs extended.", "Hinge at hips and reach toward toes.", "Hold and breathe deeply."],
         "gif_url": "", "difficulty": "beginner"},
        {"exercise_id": "fb_waist_2", "name": "Cat-Cow Stretch", "body_part": "waist", "target_muscle": "spine",
         "secondary_muscles": ["core"], "equipment": "body weight",
         "instructions": ["Start on hands and knees.", "Alternate arching and rounding the spine.", "Move slowly with breath."],
         "gif_url": "", "difficulty": "beginner"},
    ],
}


def _fallback_exercises(body_part: str) -> list:
    return _FALLBACK_DB.get(body_part, _FALLBACK_DB["cardio"])
