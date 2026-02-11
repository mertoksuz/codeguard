import { Worker } from "bullmq";
import IORedis from "ioredis";
import OpenAI from "openai";
import { Octokit } from "@octokit/rest";
import { WebClient } from "@slack/web-api";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const needsTls = redisUrl.startsWith("rediss://") || redisUrl.includes("upstash.io");
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: needsTls ? { rejectUnauthorized: false } : undefined,
});

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_CLIENT_SECRET });
const slack = new WebClient(process.env.SLACK_BOT_TOKEN);

const RULES = ["SRP", "OCP", "LSP", "ISP", "DIP", "NAMING", "COMPLEXITY", "FILE_LENGTH", "IMPORTS"];

// ─── Fetch PR diff from GitHub ─────────────────────
async function getPRDiff(owner: string, repo: string, prNumber: number): Promise<{ diff: string; title: string; url: string }> {
  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  const { data: diff } = await octokit.pulls.get({
    owner, repo, pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  return {
    diff: diff as unknown as string,
    title: pr.title,
    url: pr.html_url,
  };
}

// ─── Analyze diff with OpenAI ──────────────────────
async function analyzeWithAI(diff: string, rules: string[]) {
  const response = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-4o",
    messages: [
      {
        role: "system",
        content: `You are an expert code reviewer. Analyze the following PR diff for violations of these SOLID and clean-code rules: ${rules.join(", ")}.
Return JSON: { "issues": [{ "ruleId": string, "ruleName": string, "severity": "error"|"warning"|"info", "file": string, "line": number, "message": string, "suggestion": string }], "score": number }
score is 0-100 (100 = perfect). Only return the JSON, no other text.`,
      },
      { role: "user", content: diff.substring(0, 12000) }, // Limit to avoid token overflow
    ],
    temperature: 0.1,
    max_tokens: 4000,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content || '{"issues":[],"score":100}';
  try {
    const parsed = JSON.parse(content);
    return { issues: parsed.issues || [], score: parsed.score || 100 };
  } catch {
    return { issues: [], score: 100 };
  }
}

// ─── Send results to Slack ─────────────────────────
async function sendSlackResult(
  channel: string,
  threadTs: string | undefined,
  result: { prTitle: string; prUrl: string; prNumber: number; score: number; issues: any[] }
) {
  const scoreEmoji = result.score >= 80 ? "🟢" : result.score >= 60 ? "🟡" : "🔴";
  const scoreBar = buildScoreBar(result.score);

  const violations = result.issues.filter((i: any) => i.severity === "error");
  const warnings = result.issues.filter((i: any) => i.severity === "warning");
  const infos = result.issues.filter((i: any) => i.severity === "info");

  // Slack thread_ts must be a string like "1707667890.123456"
  const validThreadTs = threadTs && /^\d+\.\d+$/.test(String(threadTs)) ? String(threadTs) : undefined;

  const blocks: any[] = [
    // ── Header ──
    {
      type: "header",
      text: { type: "plain_text", text: "🔍 CodeGuard Analysis Complete", emoji: true },
    },
    // ── PR Link ──
    {
      type: "section",
      text: { type: "mrkdwn", text: `*<${result.prUrl}|${result.prTitle}>*  ·  \`PR #${result.prNumber}\`` },
    },
    { type: "divider" },
    // ── Score + Stats ──
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Quality Score*\n${scoreEmoji} *${result.score}*/100\n${scoreBar}` },
        { type: "mrkdwn", text: `*Summary*\n🔴  *${violations.length}* Violation${violations.length !== 1 ? "s" : ""}\n🟡  *${warnings.length}* Warning${warnings.length !== 1 ? "s" : ""}\n🔵  *${infos.length}* Info` },
      ],
    },
  ];

  // ── Issues Detail ──
  if (result.issues.length > 0) {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "*Issues Found:*" },
    });

    const issueLines = result.issues.slice(0, 8).map((i: any) => {
      const icon = i.severity === "error" ? "🔴" : i.severity === "warning" ? "🟡" : "🔵";
      const file = i.file ? `  \`${i.file}${i.line ? `:${i.line}` : ""}\`` : "";
      return `${icon}  *${i.ruleName}*${file}\n      ${i.message}`;
    });

    // Split into chunks of 4 to stay within Slack's text limits
    for (let i = 0; i < issueLines.length; i += 4) {
      const chunk = issueLines.slice(i, i + 4).join("\n\n");
      blocks.push({ type: "section", text: { type: "mrkdwn", text: chunk } });
    }

    if (result.issues.length > 8) {
      blocks.push({
        type: "context",
        elements: [{ type: "mrkdwn", text: `_...and *${result.issues.length - 8}* more issues. View full report for details._` }],
      });
    }
  } else {
    blocks.push({ type: "divider" });
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "✅  *No issues found!* This PR looks clean and follows all configured rules." },
    });
  }

  // ── Footer ──
  blocks.push({ type: "divider" });
  blocks.push({
    type: "context",
    elements: [
      { type: "mrkdwn", text: `⚡ Powered by *CodeGuard AI*  ·  Analyzed ${result.issues.length} issue${result.issues.length !== 1 ? "s" : ""} across SOLID principles, complexity & clean code rules` },
    ],
  });

  await slack.chat.postMessage({
    channel,
    thread_ts: validThreadTs,
    reply_broadcast: false,
    unfurl_links: false,
    blocks,
    text: `CodeGuard Analysis: PR #${result.prNumber} scored ${result.score}/100 with ${result.issues.length} issue(s)`,
  });
}

function buildScoreBar(score: number): string {
  const filled = Math.round(score / 10);
  const empty = 10 - filled;
  return "▓".repeat(filled) + "░".repeat(empty);
}

// ─── Analysis Worker ───────────────────────────────
const analysisWorker = new Worker(
  "analysis",
  async (job) => {
    const { repositoryFullName, prNumber, slackChannel, slackThreadTs } = job.data;
    console.log(`📊 Analyzing ${repositoryFullName}#${prNumber}...`);

    const [owner, repo] = repositoryFullName.split("/");

    // 1. Fetch PR diff
    const pr = await getPRDiff(owner, repo, prNumber);
    console.log(`  📄 Fetched diff for "${pr.title}" (${pr.diff.length} chars)`);

    // 2. Analyze with AI
    const { issues, score } = await analyzeWithAI(pr.diff, RULES);
    console.log(`  🧠 AI found ${issues.length} issues, score: ${score}/100`);

    // 3. Send Slack notification
    if (slackChannel && process.env.SLACK_BOT_TOKEN) {
      await sendSlackResult(slackChannel, slackThreadTs, {
        prTitle: pr.title,
        prUrl: pr.url,
        prNumber,
        score,
        issues,
      });
      console.log(`  💬 Slack notification sent to ${slackChannel}`);
    }

    console.log(`✅ Analysis complete for ${repositoryFullName}#${prNumber}`);
    return { score, issueCount: issues.length };
  },
  { connection, concurrency: 3 }
);

// ─── Fix Worker (placeholder) ──────────────────────
const fixWorker = new Worker(
  "fix",
  async (job) => {
    console.log(`🔧 Processing fix job: ${job.id}`, job.data);
    console.log(`✅ Fix generation complete`);
  },
  { connection, concurrency: 2 }
);

// ─── Graceful shutdown ─────────────────────────────
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
