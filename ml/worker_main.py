import asyncio

from src.workers.runtime import run_workers


if __name__ == "__main__":
    asyncio.run(run_workers())
