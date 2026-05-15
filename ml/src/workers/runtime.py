from __future__ import annotations

import asyncio
import logging
import sys

import redis as redis_sync

from .betting_extraction_worker import BettingExtractionWorker
from .score_worker import ScoreCalculationWorker
from .queue_config import REDIS_CONFIG

logger = logging.getLogger("proofident.worker.runtime")


def _check_redis() -> bool:
    try:
        client = redis_sync.Redis(**REDIS_CONFIG)
        client.ping()
        print("  Redis OK", flush=True)

        # Show errors from the last few failed betting-extraction jobs (ZSet in BullMQ v5)
        failed_ids = client.zrange("bull:betting-extraction:failed", 0, 4)
        if failed_ids:
            print(f"  Last {len(failed_ids)} failed job(s) — error messages:", flush=True)
            for job_id in failed_ids:
                job_key = f"bull:betting-extraction:{job_id.decode()}"
                job_data = client.hgetall(job_key)
                err = job_data.get(b"failedReason", b"(no reason stored)").decode(errors="replace")
                stacktrace = job_data.get(b"stacktrace", b"").decode(errors="replace")[:400]
                print(f"    job {job_id.decode()}: {err}", flush=True)
                if stacktrace:
                    print(f"      {stacktrace}", flush=True)
        else:
            print("  No failed jobs in betting-extraction queue", flush=True)

        client.close()
        return True
    except Exception as exc:
        print(f"  Redis FAILED: {exc}", flush=True)
        return False


async def _poll_queue_depth() -> None:
    """Every 5 s, print how many jobs are waiting so we can tell when the backend enqueues something."""
    client = redis_sync.Redis(**REDIS_CONFIG)
    prev: dict[str, int] = {}
    while True:
        await asyncio.sleep(5)
        try:
            keys = [k.decode() for k in client.keys("bull:betting-extraction:*")]
            snapshot: dict[str, int] = {}
            for k in keys:
                t = client.type(k).decode()
                if t == "list":
                    snapshot[k] = client.llen(k)
                elif t == "zset":
                    snapshot[k] = client.zcard(k)
            if snapshot != prev:
                print(f"[redis] betting-extraction queue snapshot: {snapshot}", flush=True)
                prev = snapshot
        except Exception:
            pass


async def run_workers() -> None:
    print("Checking Redis connection...", flush=True)
    if not _check_redis():
        print("Cannot connect to Redis. Is it running? Check REDIS_URL in ml/.env", flush=True)
        return

    print("Starting workers...", flush=True)
    ScoreCalculationWorker()
    BettingExtractionWorker()
    logger.info("ml_queue_workers_started")
    print("Workers started. Listening on queues: betting-extraction, score-calculation", flush=True)
    print("(Now hit POST /me/data-sources/betting/upload — jobs should appear here within 5s)", flush=True)

    asyncio.create_task(_poll_queue_depth())

    while True:
        await asyncio.sleep(1)


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )
    asyncio.run(run_workers())
