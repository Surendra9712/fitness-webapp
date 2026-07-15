from __future__ import annotations
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
"""
exercisedb.py — ExerciseDB API Integration
Reads API key dynamically on every call (not at import time) so .env
changes are always picked up without restarting the server.
"""
import os
import requests

CATEGORY_TO_BODYPART = {
    "cardio_light":    ["cardio"],
    "cardio_moderate": ["cardio"],
    "cardio_intense":  ["cardio"],
    "strength_light":  ["chest", "back", "upper legs"],
    "strength_heavy":  ["chest", "back", "upper legs", "shoulders"],
    "yoga_light":      ["waist", "back"],
    "rest_recovery":   ["waist"],
}

_FALLBACK_DB = {
    "cardio": [
        {"exercise_id":"fb_card_1","name":"Jogging In Place","body_part":"cardio","target_muscle":"cardiovascular system","secondary_muscles":["calves","quads"],"equipment":"body weight","instructions":["Stand tall.","Jog in place lifting knees moderately.","Maintain steady breathing for the duration."],"gif_url":"","difficulty":"beginner"},
        {"exercise_id":"fb_card_2","name":"Jumping Jacks","body_part":"cardio","target_muscle":"cardiovascular system","secondary_muscles":["shoulders","calves"],"equipment":"body weight","instructions":["Stand with feet together, arms at sides.","Jump while spreading legs and raising arms overhead.","Return to start and repeat."],"gif_url":"","difficulty":"beginner"},
        {"exercise_id":"fb_card_3","name":"High Knees","body_part":"cardio","target_muscle":"cardiovascular system","secondary_muscles":["hip flexors","quads"],"equipment":"body weight","instructions":["Stand tall.","Alternate driving knees up to waist height quickly.","Pump arms in sync with legs."],"gif_url":"","difficulty":"beginner"},
    ],
    "chest": [
        {"exercise_id":"fb_chest_1","name":"Push-Ups","body_part":"chest","target_muscle":"pectorals","secondary_muscles":["triceps","shoulders"],"equipment":"body weight","instructions":["Start in a plank position.","Lower body until chest nearly touches floor.","Push back up to start."],"gif_url":"","difficulty":"beginner"},
        {"exercise_id":"fb_chest_2","name":"Wide Push-Ups","body_part":"chest","target_muscle":"pectorals","secondary_muscles":["triceps"],"equipment":"body weight","instructions":["Place hands wider than shoulder width.","Lower chest to floor.","Press back up."],"gif_url":"","difficulty":"beginner"},
    ],
    "back": [
        {"exercise_id":"fb_back_1","name":"Superman Hold","body_part":"back","target_muscle":"lower back","secondary_muscles":["glutes"],"equipment":"body weight","instructions":["Lie face down, arms extended forward.","Lift arms and legs simultaneously.","Hold briefly then lower."],"gif_url":"","difficulty":"beginner"},
        {"exercise_id":"fb_back_2","name":"Bird Dog","body_part":"back","target_muscle":"lower back","secondary_muscles":["core","glutes"],"equipment":"body weight","instructions":["Start on hands and knees.","Extend opposite arm and leg simultaneously.","Hold 2 seconds then switch sides."],"gif_url":"","difficulty":"beginner"},
    ],
    "upper legs": [
        {"exercise_id":"fb_leg_1","name":"Bodyweight Squats","body_part":"upper legs","target_muscle":"quads","secondary_muscles":["glutes","hamstrings"],"equipment":"body weight","instructions":["Stand feet shoulder-width apart.","Lower hips back and down as if sitting.","Push through heels to stand."],"gif_url":"","difficulty":"beginner"},
        {"exercise_id":"fb_leg_2","name":"Lunges","body_part":"upper legs","target_muscle":"quads","secondary_muscles":["glutes","hamstrings"],"equipment":"body weight","instructions":["Stand tall.","Step forward with one leg and lower knee toward floor.","Push back to start and alternate legs."],"gif_url":"","difficulty":"beginner"},
    ],
    "shoulders": [
        {"exercise_id":"fb_sh_1","name":"Pike Push-Ups","body_part":"shoulders","target_muscle":"deltoids","secondary_muscles":["triceps"],"equipment":"body weight","instructions":["Start in downward-dog position.","Bend elbows to lower head toward floor.","Push back up."],"gif_url":"","difficulty":"intermediate"},
    ],
    "waist": [
        {"exercise_id":"fb_waist_1","name":"Seated Forward Bend","body_part":"waist","target_muscle":"hamstrings","secondary_muscles":["lower back"],"equipment":"body weight","instructions":["Sit with legs extended.","Hinge at hips and reach toward toes.","Hold and breathe deeply."],"gif_url":"","difficulty":"beginner"},
        {"exercise_id":"fb_waist_2","name":"Cat-Cow Stretch","body_part":"waist","target_muscle":"spine","secondary_muscles":["core"],"equipment":"body weight","instructions":["Start on hands and knees.","Alternate arching and rounding the spine.","Move slowly with breath."],"gif_url":"","difficulty":"beginner"},
        {"exercise_id":"fb_waist_3","name":"Child's Pose","body_part":"waist","target_muscle":"lower back","secondary_muscles":["hips"],"equipment":"body weight","instructions":["Kneel and sit back on heels.","Extend arms forward on the floor.","Hold and breathe deeply."],"gif_url":"","difficulty":"beginner"},
    ],
}


def is_configured() -> bool:
    return bool(os.getenv("EXERCISEDB_API_KEY", "").strip())


def _get_headers() -> dict:
    return {
        "X-RapidAPI-Key":  os.getenv("EXERCISEDB_API_KEY", ""),
        "X-RapidAPI-Host": os.getenv("EXERCISEDB_HOST", "exercisedb.p.rapidapi.com"),
    }


def _get_base_url() -> str:
    return os.getenv("EXERCISEDB_BASE_URL", "https://exercisedb.p.rapidapi.com")


def _normalize_exercise(e: dict) -> dict:
    exercise_id = e.get("id", "")
    return {
        "exercise_id":       exercise_id,
        "name":              e.get("name", "").title(),
        "body_part":         e.get("bodyPart", ""),
        "target_muscle":     e.get("target", ""),
        "secondary_muscles": e.get("secondaryMuscles", []),
        "equipment":         e.get("equipment", ""),
        "instructions":      e.get("instructions", []),
        # Points at OUR backend's proxy route (routes/ai.py: /exercise-gif/{id}),
        # never at ExerciseDB directly - keeps EXERCISEDB_API_KEY out of the browser.
        "gif_url":           f"/api/ai/exercise-gif/{exercise_id}" if exercise_id else "",
        "difficulty":        e.get("difficulty", "intermediate"),
    }


def fetch_gif_bytes(exercise_id: str, resolution: str = "180"):
    """Fetches raw gif bytes from ExerciseDB server-side, using our API key.
    Called only by the /exercise-gif/{id} backend route - never exposed
    directly to the browser."""
    if not is_configured() or not exercise_id:
        return None, None
    try:
        r = requests.get(
            f"{_get_base_url()}/image",
            headers=_get_headers(),
            params={"exerciseId": exercise_id, "resolution": resolution},
            timeout=8,
        )
        if r.status_code != 200:
            return None, None
        return r.content, r.headers.get("Content-Type", "image/gif")
    except Exception:
        return None, None


def _fallback_exercises(body_part: str) -> list:
    return list(_FALLBACK_DB.get(body_part, _FALLBACK_DB["cardio"]))


def get_exercises_by_body_part(body_part: str, limit: int = 6) -> list:
    if not is_configured():
        return _fallback_exercises(body_part)[:limit]
    try:
        r = requests.get(
            f"{_get_base_url()}/exercises/bodyPart/{body_part}",
            headers=_get_headers(),
            params={"limit": limit},
            timeout=8,
        )
        if r.status_code == 200:
            data = r.json()
            if isinstance(data, list) and data:
                return [_normalize_exercise(e) for e in data[:limit]]
        print(f"  ExerciseDB {r.status_code} for {body_part} — using fallback")
        return _fallback_exercises(body_part)[:limit]
    except Exception as ex:
        print(f"  ExerciseDB error: {ex} — using fallback")
        return _fallback_exercises(body_part)[:limit]


def get_exercises_for_category(category: str, limit_per_part: int = 3) -> list:
    body_parts = CATEGORY_TO_BODYPART.get(category, ["cardio"])
    result = []
    for bp in body_parts:
        result.extend(get_exercises_by_body_part(bp, limit_per_part))
    return result


def get_exercise_by_id(exercise_id: str) -> dict | None:
    if not is_configured():
        return None
    try:
        r = requests.get(
            f"{_get_base_url()}/exercises/exercise/{exercise_id}",
            headers=_get_headers(),
            timeout=5,
        )
        return _normalize_exercise(r.json()) if r.status_code == 200 else None
    except Exception:
        return None
