from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import Depends, FastAPI, HTTPException, Request, Security
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from .middleware import RequestContextMiddleware, StructuredFormatter
from .routes import health, score, jobs
from ..config.settings import settings
from . import state


# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

def _configure_logging() -> None:
    handler = logging.StreamHandler()
    handler.setFormatter(StructuredFormatter())
    root = logging.getLogger()
    root.handlers = [handler]
    root.setLevel(settings.log_level.upper())


_configure_logging()
logger = logging.getLogger("proofident.api")


# ---------------------------------------------------------------------------
# Auth dependency
# ---------------------------------------------------------------------------

_bearer = HTTPBearer(auto_error=False)


async def require_api_key(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(_bearer),
) -> None:
    if not settings.auth_enabled:
        return
    if credentials is None or credentials.credentials != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid or missing API key.")


# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("service_startup", extra={"env": settings.env, "port": settings.port})
    loop = asyncio.get_event_loop()
    try:
        await loop.run_in_executor(None, score._ml_scorer.ensure_ready)
        state.models_ready = True
        logger.info("ml_models_ready")
    except Exception:
        logger.exception("ml_models_load_failed_service_degraded")
    yield
    logger.info("service_shutdown")


app = FastAPI(
    title="Proofident AI Service",
    description="Behavioural credit scoring and job matching for the Nigerian informal economy.",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(RequestContextMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type", "X-Request-ID"],
)


# ---------------------------------------------------------------------------
# Exception handlers
# ---------------------------------------------------------------------------

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse(
        status_code=422,
        content={
            "error": {
                "code": "VALIDATION_ERROR",
                "message": "Request body failed validation.",
                "details": exc.errors(),
            }
        },
        headers={"X-Request-ID": getattr(request.state, "request_id", "")},
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": _status_to_code(exc.status_code), "message": exc.detail}},
        headers={"X-Request-ID": getattr(request.state, "request_id", "")},
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled_exception",
        extra={
            "request_id": getattr(request.state, "request_id", ""),
            "path": str(request.url.path),
        },
    )
    return JSONResponse(
        status_code=500,
        content={"error": {"code": "INTERNAL_ERROR", "message": "An unexpected error occurred."}},
        headers={"X-Request-ID": getattr(request.state, "request_id", "")},
    )


def _status_to_code(status: int) -> str:
    return {
        400: "BAD_REQUEST",
        401: "UNAUTHORIZED",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        422: "VALIDATION_ERROR",
        429: "TOO_MANY_REQUESTS",
        500: "INTERNAL_ERROR",
    }.get(status, "ERROR")


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

_v1_deps = [Depends(require_api_key)]

app.include_router(health.router)
app.include_router(score.router, prefix="/v1", dependencies=_v1_deps)
app.include_router(jobs.router, prefix="/v1", dependencies=_v1_deps)
