import time

from django.db import DatabaseError

from .services import release_expired_holds

_CHECK_INTERVAL_SECONDS = 30


class ReleaseExpiredHoldsMiddleware:
    """
    Frees devices held by abandoned checkouts, at most once every 30 seconds
    per process, so every listing, cart and checkout request sees fresh
    availability without needing a cron job.
    """

    _last_run = 0.0

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        now = time.monotonic()
        if now - ReleaseExpiredHoldsMiddleware._last_run >= _CHECK_INTERVAL_SECONDS:
            ReleaseExpiredHoldsMiddleware._last_run = now
            try:
                release_expired_holds()
            except DatabaseError:
                pass
        return self.get_response(request)
