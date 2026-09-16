from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from fastapi import Request

from app.config import settings
from app.core.exceptions import TooManyRequestsError

_hits: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def enforce_auth_rate_limit(request: Request) -> None:
    """Sliding-window limit per client IP + path. Swap to Redis when the worker tier is added."""
    client_ip = request.client.host if request.client else "unknown"
    key = f"{client_ip}:{request.url.path}"
    now = monotonic()
    window_seconds = 60.0
    limit = settings.auth_rate_limit_per_minute
    cutoff = now - window_seconds

    with _lock:
        bucket = _hits[key]
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()
        if len(bucket) >= limit:
            raise TooManyRequestsError("Too many requests. Try again later.")
        bucket.append(now)


def reset_auth_rate_limit() -> None:
    """Clear in-memory buckets. Used by tests so cases do not leak into each other."""
    with _lock:
        _hits.clear()
