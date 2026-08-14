import unicodedata

from pydantic import ValidationError

NAME_MAX_LENGTH = 100

NAME_ERROR = 'Name can only contain letters and spaces'


def clean_person_name(v):
    """Trim a name-like value. Inner spacing is left exactly as typed —
    the client does the same, so what the user sees is what gets stored."""
    if not isinstance(v, str):
        return v
    return v.strip()


def _is_name_letter(ch: str) -> bool:
    # Letters plus combining marks, so scripts such as Devanagari that use
    # vowel signs are accepted.
    return unicodedata.category(ch)[0] in ('L', 'M')


def validate_person_name(v, allow_empty: bool = False):
    """Reject names containing digits or special characters.

    Use as an `after` field validator. Values that are not strings pass
    through untouched so Pydantic reports its own type error.
    """
    if v is None or not isinstance(v, str):
        return v
    if not v:
        if allow_empty:
            return v
        raise ValueError('This field is required')
    if len(v) > NAME_MAX_LENGTH:
        raise ValueError(f'Name must be at most {NAME_MAX_LENGTH} characters')

    # Letters (any script), their combining marks, and spaces. Digits and
    # every punctuation or symbol character are rejected.
    for ch in v:
        if ch != ' ' and not _is_name_letter(ch):
            raise ValueError(NAME_ERROR)
    return v


def pydantic_errors(exc: ValidationError) -> dict:
    """Convert a Pydantic v2 ValidationError into {field: first_message} dict."""
    out = {}
    for err in exc.errors():
        field = str(err['loc'][0]) if err['loc'] else '__root__'
        if field in out:
            continue
        msg = err['msg']
        if msg.startswith('Value error, '):
            msg = msg[len('Value error, '):]
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
