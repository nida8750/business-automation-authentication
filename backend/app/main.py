from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import __version__
from app.api.v1.router import api_router
from app.config import settings
from app.core.exceptions import NotFoundError, register_exception_handlers
from app.core.logging import get_logger, setup_logging

logger = get_logger("main")


@asynccontextmanager
async def lifespan(application: FastAPI):
    logger.info(
        "application_startup",
        extra={
            "extra_data": {
                "app": settings.app_name,
                "env": settings.app_env,
                "version": __version__,
            }
        },
    )
    yield
    logger.info("application_shutdown")


def create_app() -> FastAPI:
    """Build and configure the FastAPI application."""
    setup_logging(debug=settings.app_debug)

    application = FastAPI(
        title=settings.app_name,
        version=__version__,
        debug=settings.app_debug,
        lifespan=lifespan,
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
    )

    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    register_exception_handlers(application)
    application.include_router(api_router, prefix=settings.api_v1_prefix)

    @application.get("/", tags=["system"])
    def root() -> dict[str, str]:
        return {
            "message": f"{settings.app_name} API",
            "health": "/health",
            "docs": "/docs" if settings.is_development else "disabled",
        }

    @application.get("/health", tags=["system"])
    def health() -> dict[str, object]:
        return {
            "status": "ok",
            "app": settings.app_name,
            "env": settings.app_env,
            "version": __version__,
            "supabase": {
                "attached": settings.supabase_attached,
                "project_ref": settings.supabase_project_ref or None,
                "url": settings.supabase_url or None,
                "db_host": settings.postgres_host if settings.supabase_attached else None,
            },
        }

    if settings.is_development:
        @application.get("/debug/not-found", tags=["system"], include_in_schema=False)
        def debug_not_found() -> None:
            raise NotFoundError("Lead not found")

    return application


app = create_app()