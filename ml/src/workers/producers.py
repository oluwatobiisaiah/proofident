from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from bullmq import Queue

from .queue_config import QUEUE_NAMES, REDIS_CONFIG


class ScoreResultsProducer:
    def __init__(self) -> None:
        self.queue = Queue(QUEUE_NAMES["score_results"], {"connection": REDIS_CONFIG})

    async def publish(
        self,
        job_id: str,
        user_id: str,
        status: str,
        score_data: dict[str, Any] | None = None,
        error: str | None = None,
    ) -> None:
        await self.queue.add(
            f"score-result-{job_id}",
            {
                "job_id": job_id,
                "user_id": user_id,
                "status": status,
                "score_data": score_data,
                "error": error,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            },
            {"jobId": job_id},
        )


class BettingExtractionResultsProducer:
    def __init__(self) -> None:
        self.queue = Queue(QUEUE_NAMES["betting_extraction_results"], {"connection": REDIS_CONFIG})

    async def publish(
        self,
        payload: dict[str, Any],
    ) -> None:
        await self.queue.add(
            f"betting-extraction-result-{payload['extraction_job_id']}",
            payload,
            {"jobId": payload["extraction_job_id"]},
        )
