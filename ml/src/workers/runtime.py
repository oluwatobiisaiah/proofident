from __future__ import annotations

import asyncio
import logging

from .betting_extraction_worker import BettingExtractionWorker
from .score_worker import ScoreCalculationWorker

logger = logging.getLogger("proofident.worker.runtime")


async def run_workers() -> None:
    ScoreCalculationWorker()
    BettingExtractionWorker()
    logger.info("ml_queue_workers_started")
    while True:
        await asyncio.sleep(1)
