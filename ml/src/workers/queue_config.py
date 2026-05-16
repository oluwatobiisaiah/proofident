from __future__ import annotations

from ..config.settings import settings


REDIS_CONFIG = settings.redis_connection

QUEUE_NAMES = {
    "score_calculation": "score-calculation",
    "score_results": "score-results",
    "betting_extraction": "betting-extraction",
    "betting_extraction_results": "betting-extraction-results",
}
