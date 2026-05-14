from datetime import datetime, timezone

from fastapi import APIRouter, Response

from .. import state
from ..schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse, tags=["system"])
async def health_check(response: Response) -> HealthResponse:
    is_ready = state.models_ready
    if not is_ready:
        response.status_code = 503
    return HealthResponse(
        status="ok" if is_ready else "degraded",
        service="proofident-ai-service",
        version="1.0.0",
        models_loaded=is_ready,
        timestamp=datetime.now(timezone.utc),
    )
