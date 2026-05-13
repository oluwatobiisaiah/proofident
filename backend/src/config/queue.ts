import { Queue } from "bullmq";
import { redis } from "./redis.js";

export const scoreCalculationQueue = new Queue("score-calculation", {
  connection: redis
});

export const jobMatchingQueue = new Queue("job-matching", {
  connection: redis
});

export const loanProcessingQueue = new Queue("loan-processing", {
  connection: redis
});

export const webhookProcessingQueue = new Queue("webhook-processing", {
  connection: redis
});
