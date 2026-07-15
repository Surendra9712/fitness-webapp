from pydantic import ValidationError

# FastAPI's RequestValidationError wraps the same per-error dicts as a plain
# pydantic ValidationError, but prefixes `loc` with where the value came from
# (e.g. ('body', 'email')). Skipping that prefix keeps the reported field name
# identical whether the error came from FastAPI's automatic body validation
# or from a manual model_validate() call.
_LOC_PREFIXES = {'body', 'query', 'path', 'header', 'cookie'}


def pydantic_errors(exc) -> dict:
    """Convert a Pydantic v2 ValidationError (or FastAPI's RequestValidationError,
    which exposes the same .errors() shape) into a {field: first_message} dict."""
    out = {}
    for err in exc.errors():
        loc = err['loc']
        start = 1 if loc and loc[0] in _LOC_PREFIXES else 0
        field = str(loc[start]) if len(loc) > start else '__root__'
        if field in out:
            continue
        msg = err['msg']
        t = err.get('type', '')
        ctx = err.get('ctx', {})
        if 'too_short' in t:
            min_len = ctx.get('min_length', 1)
            msg = f'Must be at least {min_len} character{"s" if min_len != 1 else ""}'
        elif 'missing' in t:
            msg = 'This field is required'
        elif 'email' in t:
            msg = 'Invalid email address'
        elif 'literal_error' in t:
            expected = ctx.get('expected', '')
            msg = f'Must be one of: {expected}'
        elif 'greater_than' in t or 'greater_than_equal' in t:
            gt = ctx.get('gt') or ctx.get('ge')
            msg = f'Must be greater than {"or equal to " if "equal" in t else ""}{gt}'
        out[field] = msg
    return out
