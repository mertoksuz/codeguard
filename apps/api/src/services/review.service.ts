import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

export const analysisQueue = new Queue("analysis", { connection });
export const fixQueue = new Queue("fix", { connection });

export async function queuePRAnalysis(data: { reviewId: string; repositoryFullName: string; prNumber: number; teamId: string; slackChannel?: string }) {
  await analysisQueue.add("analyze-pr", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function queueFixGeneration(data: { reviewId: string; issueIds?: string[] }) {
  await fixQueue.add("generate-fix", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
  });
}
