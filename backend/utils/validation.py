from pydantic import ValidationError


def pydantic_errors(exc: ValidationError) -> dict:
    """Convert a Pydantic v2 ValidationError into {field: first_message} dict."""
    out = {}
    for err in exc.errors():
        field = str(err['loc'][0]) if err['loc'] else '__root__'
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
