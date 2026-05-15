import { Worker } from "bullmq";
import { env } from "../config/env.js";
import { redis } from "../config/redis.js";
import { aiClientService } from "../services/ai-client.service.js";
import { bettingExtractionService, type BettingExtractionResultJob } from "../services/betting-extraction.service.js";
import { decisionEngineService } from "../services/decision-engine.service.js";
import { scoreService, type ScoreCalculationJobPayload, type ScoreResultJobPayload } from "../services/score.service.js";
import { logger } from "../utils/logger.js";

declare global {
  var __proofidentWorkersStarted__: boolean | undefined;
}

export function startInlineQueueWorkers() {
  if (!env.RUN_INLINE_QUEUE_WORKERS || globalThis.__proofidentWorkersStarted__) {
    return;
  }

  globalThis.__proofidentWorkersStarted__ = true;

  const scoreCalculationWorker = new Worker<ScoreCalculationJobPayload>(
    "score-calculation",
    async (job) => {
      const { user_id, job_id } = job.data;
      try {
        const scoreData = await aiClientService.calculateScore(user_id);
        await scoreService.applyScoreResult({
          job_id,
          user_id,
          status: "success",
          score_data: scoreData,
          completed_at: new Date().toISOString()
        });
      } catch (err) {
        logger.error({ err, userId: user_id, jobId: job_id }, "score_calculation_worker_ai_failed_falling_back_to_rules");
        await decisionEngineService.recalculateScore(user_id);
      }
    },
    { connection: redis, concurrency: 3 }
  );

  scoreCalculationWorker.on("failed", (job, error) => {
    logger.error({ err: error, jobId: job?.id }, "score_calculation_worker_failed");
  });

  const extractionResultsWorker = new Worker<BettingExtractionResultJob>(
    "betting-extraction-results",
    async (job) => bettingExtractionService.applyExtractionResult(job.data),
    {
      connection: redis,
      concurrency: 3
    }
  );

  extractionResultsWorker.on("failed", (job, error) => {
    logger.error({ err: error, jobId: job?.id }, "betting_extraction_results_worker_failed");
  });

  const scoreResultsWorker = new Worker<ScoreResultJobPayload>(
    "score-results",
    async (job) => scoreService.applyScoreResult(job.data),
    {
      connection: redis,
      concurrency: 3
    }
  );

  scoreResultsWorker.on("failed", (job, error) => {
    logger.error({ err: error, jobId: job?.id }, "score_results_worker_failed");
  });

  logger.info("inline_queue_workers_started");
}
