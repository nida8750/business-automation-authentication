from __future__ import annotations
from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from app.config import settings
from app.core.logging import get_logger
logger = get_logger("exceptions")
class AppError(Exception):
    """Base error for expected, user-facing API failures."""
    def __init__(
        self,
        message: str,
        *,
        code: str,
        status_code: int,
        details: dict[str, object] | None = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
class BadRequestError(AppError):
    def __init__(self, message: str = "Bad request", *, details: dict[str, object] | None = None) -> None:
        super().__init__(message, code="bad_request", status_code=400, details=details)
class UnauthorizedError(AppError):
    def __init__(self, message: str = "Not authenticated", *, details: dict[str, object] | None = None) -> None:
        super().__init__(message, code="unauthorized", status_code=401, details=details)
class ForbiddenError(AppError):
    def __init__(self, message: str = "Not allowed", *, details: dict[str, object] | None = None) -> None:
        super().__init__(message, code="forbidden", status_code=403, details=details)
class NotFoundError(AppError):
    def __init__(self, message: str = "Resource not found", *, details: dict[str, object] | None = None) -> None:
        super().__init__(message, code="not_found", status_code=404, details=details)
class ConflictError(AppError):
    def __init__(self, message: str = "Conflict", *, details: dict[str, object] | None = None) -> None:
        super().__init__(message, code="conflict", status_code=409, details=details)
class TooManyRequestsError(AppError):
    def __init__(self, message: str = "Too many requests", *, details: dict[str, object] | None = None) -> None:
        super().__init__(message, code="too_many_requests", status_code=429, details=details)
def error_payload(
    *,
    code: str,
    message: str,
    details: dict[str, object] | list[object] | None = None,
) -> dict[str, object]:
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {},
        }
    }
async def app_error_handler(_request: Request, exc: AppError) -> JSONResponse:
    logger.warning(
        "app_error",
        extra={
            "extra_data": {
                "code": exc.code,
                "status_code": exc.status_code,
                "message": exc.message,
            }
        },
    )
    return JSONResponse(
        status_code=exc.status_code,
        content=error_payload(code=exc.code, message=exc.message, details=exc.details),
    )
async def validation_error_handler(_request: Request, exc: RequestValidationError) -> JSONResponse:
    logger.warning("validation_error")
    return JSONResponse(
        status_code=422,
        content=error_payload(
            code="validation_error",
            message="Request validation failed",
            details=jsonable_encoder(exc.errors(), custom_encoder={Exception: str}),
        ),
    )
async def unhandled_error_handler(_request: Request, exc: Exception) -> JSONResponse:
    logger.exception("unhandled_error")
    message = str(exc) if settings.app_debug else "An unexpected error occurred"
    return JSONResponse(
        status_code=500,
        content=error_payload(
            code="internal_error",
            message=message,
            details={"type": type(exc).__name__} if settings.app_debug else {},
        ),
    )
def register_exception_handlers(application: FastAPI) -> None:
    """Attach centralized handlers to the FastAPI app."""
    application.add_exception_handler(AppError, app_error_handler)
    application.add_exception_handler(RequestValidationError, validation_error_handler)
    application.add_exception_handler(Exception, unhandled_error_handler)
