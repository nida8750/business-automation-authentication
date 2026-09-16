from __future__ import annotations
import json
import logging
import sys
from datetime import datetime, timezone
APP_LOGGER_NAME = "nexusflow"
class JsonFormatter(logging.Formatter):
    """Format log records as single-line JSON for production aggregators."""
    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        extra = getattr(record, "extra_data", None)
        if isinstance(extra, dict):
            payload.update(extra)
        return json.dumps(payload, ensure_ascii=True)
def setup_logging(*, debug: bool) -> None:
    """Configure process-wide logging. Call once during app startup."""
    level = logging.DEBUG if debug else logging.INFO
    handler = logging.StreamHandler(sys.stdout)
    if debug:
        handler.setFormatter(
            logging.Formatter("%(asctime)s | %(levelname)s | %(name)s | %(message)s")
        )
    else:
        handler.setFormatter(JsonFormatter())
    root = logging.getLogger()
    root.handlers.clear()
    root.setLevel(level)
    root.addHandler(handler)
    logging.getLogger("uvicorn").setLevel(level)
    logging.getLogger("uvicorn.error").setLevel(level)
    logging.getLogger("uvicorn.access").setLevel(logging.INFO)
    logging.getLogger(APP_LOGGER_NAME).setLevel(level)
def get_logger(name: str | None = None) -> logging.Logger:
    """Return a child logger under the NexusFlow namespace."""
    if name is None:
        return logging.getLogger(APP_LOGGER_NAME)
    if name.startswith(APP_LOGGER_NAME):
        return logging.getLogger(name)
    return logging.getLogger(f"{APP_LOGGER_NAME}.{name}")
