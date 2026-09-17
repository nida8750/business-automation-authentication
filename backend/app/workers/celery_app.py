from celery import Celery

from app.config import settings

celery_app = Celery(
    "nexusflow",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
    task_always_eager=settings.celery_task_always_eager,
    task_eager_propagates=True,
)

# Register tasks on import.
from app.workers import tasks as _tasks  # noqa: E402, F401

__all__ = ["celery_app"]
