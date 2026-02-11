import { Queue } from "bullmq";
import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
});

export const analysisQueue = new Queue("analysis", { connection });
export const fixQueue = new Queue("fix", { connection });

export async function queuePRAnalysis(data: {
  repositoryFullName: string;
  prNumber: number;
  slackChannel?: string;
  slackThreadTs?: string;
}) {
  await analysisQueue.add("analyze-pr", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
  });
}

export async function queueFixGeneration(data: { reviewId?: string; issueIds?: string[] }) {
  await fixQueue.add("generate-fix", data, {
    attempts: 2,
    backoff: { type: "exponential", delay: 3000 },
  });
}
