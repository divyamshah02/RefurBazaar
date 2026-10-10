_TRUE_VALUES = {'true', '1', 'yes', 'on'}
_FALSE_VALUES = {'false', '0', 'no', 'off', ''}


def parse_bool(value, default=None):
    """Strictly convert a request value to bool.

    Accepts real booleans, 0/1, and the strings true/false (any case).
    Returns `default` for None or anything unrecognised, so the caller
    decides what an unusable value means instead of bool("false") == True.
    """
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    if isinstance(value, (int, float)):
        return bool(value)
    text = str(value).strip().lower()
    if text in _TRUE_VALUES:
        return True
    if text in _FALSE_VALUES:
        return False
    return default
