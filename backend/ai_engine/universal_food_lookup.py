from ai_engine.knowledge_base.nepali_foods import get_all_tags_index
from ai_engine.nlp.fuzzy_matcher import fuzzy_match_multiple
from ai_engine.integrations import usda, nutritionix
_FOOD_INDEX = get_all_tags_index()
def recognize_food(raw_text: str) -> dict:
    text = raw_text.strip()
    if not text: return {"found":False,"source":None,"food":None,"reason":"empty input"}
    matches = fuzzy_match_multiple(text, _FOOD_INDEX, limit=1, threshold=72)
    if matches: return {"found":True,"source":"nepali_kb","food":matches[0],"confidence":matches[0]["match_score"]}
    usda_results = usda.search_food(text, page_size=1)
    if usda_results: return {"found":True,"source":"usda","food":usda_results[0],"confidence":80}
    if nutritionix.is_configured():
        nix = nutritionix.get_nutrients_natural_language(text)
        if nix: return {"found":True,"source":"nutritionix","food":nix[0],"confidence":75}
    return {"found":False,"source":None,"food":None,"reason":"Not found in Nepali database or USDA. Try a more specific name."}
def recognize_multiple_foods(food_mentions: list) -> list:
    return [{"query":text,**recognize_food(text)} for text in food_mentions]
