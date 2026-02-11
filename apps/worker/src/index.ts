import { Worker } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", { maxRetriesPerRequest: null });

// Analysis worker
const analysisWorker = new Worker(
  "analysis",
  async (job) => {
    console.log(`📊 Processing analysis job: ${job.id}`, job.data);
    const { repositoryFullName, prNumber } = job.data;
    console.log(`Analyzing PR ${repositoryFullName}#${prNumber}...`);
    // TODO: Implement full analysis pipeline
    console.log(`✅ Analysis complete for ${repositoryFullName}#${prNumber}`);
  },
  { connection, concurrency: 5, limiter: { max: 10, duration: 60000 } }
);

// Fix worker
const fixWorker = new Worker(
  "fix",
  async (job) => {
    console.log(`🔧 Processing fix job: ${job.id}`, job.data);
    // TODO: Implement fix generation pipeline
    console.log(`✅ Fix generation complete`);
  },
  { connection, concurrency: 3 }
);

// Graceful shutdown
const shutdown = async () => {
  console.log("🛑 Shutting down workers...");
  await analysisWorker.close();
  await fixWorker.close();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

analysisWorker.on("completed", (job) => console.log(`✅ Job ${job.id} completed`));
analysisWorker.on("failed", (job, err) => console.error(`❌ Job ${job?.id} failed:`, err.message));
fixWorker.on("completed", (job) => console.log(`✅ Fix job ${job.id} completed`));
fixWorker.on("failed", (job, err) => console.error(`❌ Fix job ${job?.id} failed:`, err.message));

console.log("🚀 CodeGuard Worker started — listening for jobs...");
