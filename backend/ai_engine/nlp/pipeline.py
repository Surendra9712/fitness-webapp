"""
pipeline.py
spaCy-based NLP pipeline for understanding natural language food/diet
queries (e.g. "I ate chiya and biscuits", "recommend something high
in protein", "I want a low-carb Nepali lunch").

Pipeline stages:
  1. Text normalization (lowercase, synonym mapping)
  2. Tokenization + Lemmatization (spaCy)
  3. Stop-word removal (selective — keeps nutrition-relevant words)
  4. Food entity recognition (fuzzy-matched against knowledge base)
  5. Cuisine detection
  6. Meal-type detection
  7. Intent detection (log_meal / get_recommendation / ask_nutrition_info)
"""
try:
    import spacy
    _SPACY_AVAILABLE = True
except ImportError:
    _SPACY_AVAILABLE = False
    spacy = None
from ai_engine.nlp.fuzzy_matcher import (
    normalize_text, fuzzy_match_multiple, detect_cuisine, detect_meal_type,
)
from ai_engine.knowledge_base.nepali_foods import get_all_tags_index

# Load spaCy model once at module level (small English model — fast, CPU-friendly)
try:
    _nlp = spacy.load("en_core_web_sm")
except (OSError, Exception):
    # Model not downloaded or spacy not installed
    # Run: pip install spacy && python -m spacy download en_core_web_sm
    try:
        _nlp = spacy.blank("en") if _SPACY_AVAILABLE else None
    except Exception:
        _nlp = None

_FOOD_TAG_INDEX = get_all_tags_index()

# Nutrition-relevant words we never want stop-word-stripped
_KEEP_WORDS = {"high", "low", "no", "not", "more", "less", "without"}

# Intent trigger phrases
_INTENT_PATTERNS = {
    "log_meal": ["i ate", "i had", "i just had", "log", "had for", "ate for", "consumed"],
    "get_recommendation": ["recommend", "suggest", "what should i eat", "give me", "i want"],
    "ask_nutrition_info": ["how many calories", "how much protein", "nutrition of", "calories in"],
}


class NLPResult:
    def __init__(self):
        self.raw_text = ""
        self.normalized_text = ""
        self.tokens = []
        self.lemmas = []
        self.foods_detected = []     # list of matched food dicts
        self.cuisine = None
        self.meal_type = None
        self.intent = "unknown"
        self.nutrient_focus = None   # e.g. "protein" if "high in protein" detected
        self.nutrient_direction = None  # "high" or "low"

    def to_dict(self):
        return {
            "raw_text": self.raw_text, "normalized_text": self.normalized_text,
            "tokens": self.tokens, "lemmas": self.lemmas,
            "foods_detected": [f["name"] for f in self.foods_detected],
            "cuisine": self.cuisine, "meal_type": self.meal_type,
            "intent": self.intent, "nutrient_focus": self.nutrient_focus,
            "nutrient_direction": self.nutrient_direction,
        }


def detect_intent(text_lower: str) -> str:
    for intent, patterns in _INTENT_PATTERNS.items():
        if any(p in text_lower for p in patterns):
            return intent
    return "get_recommendation"  # default assumption


def detect_nutrient_focus(text_lower: str) -> tuple:
    """Detects phrases like 'high in protein' or 'low-carb'."""
    nutrients = ["protein", "carb", "carbohydrate", "fat", "calorie", "fiber", "sugar"]
    direction = "high" if "high" in text_lower else ("low" if "low" in text_lower else None)
    for nutrient in nutrients:
        if nutrient in text_lower:
            normalized_nutrient = "carbs" if "carb" in nutrient else nutrient
            return normalized_nutrient, direction
    return None, None


def extract_food_entities(doc, text_lower: str) -> list:
    """
    Extracts candidate food entities using noun chunks + fuzzy matching
    against the Nepali/global food knowledge base index.
    """
    detected = []
    seen_names = set()

    # Try fuzzy matching the full text first (handles multi-word foods like "daal bhaat")
    whole_text_matches = fuzzy_match_multiple(text_lower, _FOOD_TAG_INDEX, limit=3, threshold=78)
    for m in whole_text_matches:
        if m["name"] not in seen_names:
            detected.append(m)
            seen_names.add(m["name"])

    # Then try individual noun chunks / tokens for foods not caught above.
    # noun_chunks requires the full statistical model (dependency parser);
    # if only the blank pipeline is loaded (model not yet downloaded),
    # skip chunking gracefully and fall back to token-level matching only.
    try:
        chunks = [chunk.text for chunk in doc.noun_chunks]
    except (ValueError, NotImplementedError):
        chunks = []
    tokens_text = [t.text for t in doc if not t.is_punct and not t.is_space]
    candidates = chunks + tokens_text

    for candidate in candidates:
        if len(candidate) < 3:
            continue
        matches = fuzzy_match_multiple(candidate, _FOOD_TAG_INDEX, limit=1, threshold=82)
        for m in matches:
            if m["name"] not in seen_names:
                detected.append(m)
                seen_names.add(m["name"])

    return detected


def process_text(text: str) -> NLPResult:
    """Main entry point — runs the full NLP pipeline on a user query."""
    result = NLPResult()
    result.raw_text = text

    normalized = normalize_text(text)
    result.normalized_text = normalized

    doc = _nlp(normalized) if _nlp else None
    result.tokens = [t.text for t in doc if not t.is_space]
    result.lemmas = [
        t.lemma_ for t in doc
        if not t.is_punct and not t.is_space
        and (not t.is_stop or t.text in _KEEP_WORDS)
    ]

    result.foods_detected = extract_food_entities(doc, normalized)
    result.cuisine = detect_cuisine(normalized)
    result.meal_type = detect_meal_type(normalized)
    result.intent = detect_intent(normalized)
    result.nutrient_focus, result.nutrient_direction = detect_nutrient_focus(normalized)

    return result
