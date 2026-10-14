from django.core.cache import cache


def client_ip(request):
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")


def hit_limit(scope, identifier, limit, window_seconds):
    """Count one hit for (scope, identifier). Returns True once the limit is exceeded."""
    key = f"rl:{scope}:{identifier}"
    cache.add(key, 0, timeout=window_seconds)
    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window_seconds)
        count = 1
    return count > limit
