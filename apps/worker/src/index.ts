import { Worker } from "bullmq";
import IORedis from "ioredis";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "@octokit/rest";
import { WebClient } from "@slack/web-api";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const needsTls = redisUrl.startsWith("rediss://") || redisUrl.includes("upstash.io");
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: needsTls ? { rejectUnauthorized: false } : undefined,
});

const AI_PROVIDER = process.env.AI_PROVIDER || "openai";
const openai = AI_PROVIDER === "openai" ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = AI_PROVIDER === "claude" ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;
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

// ─── Analyze diff with AI (OpenAI or Claude) ──────
const ANALYSIS_SYSTEM_PROMPT = (rules: string[]) =>
  `You are an expert code reviewer. Analyze the following PR diff for violations of these SOLID and clean-code rules: ${rules.join(", ")}.
Return JSON: { "issues": [{ "ruleId": string, "ruleName": string, "severity": "error"|"warning"|"info", "file": string, "line": number, "message": string, "suggestion": string }], "score": number }
score is 0-100 (100 = perfect). Only return the JSON, no other text.`;

async function analyzeWithAI(diff: string, rules: string[]) {
  const truncatedDiff = diff.substring(0, 12000);
  let content = '{"issues":[],"score":100}';

  if (AI_PROVIDER === "claude" && anthropic) {
    console.log("  🤖 Using Claude for analysis...");
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: ANALYSIS_SYSTEM_PROMPT(rules),
      messages: [{ role: "user", content: truncatedDiff }],
    });
    const block = response.content[0];
    content = block.type === "text" ? block.text : content;
  } else {
    console.log("  🤖 Using OpenAI for analysis...");
    const oa = openai || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await oa.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT(rules) },
        { role: "user", content: truncatedDiff },
      ],
      temperature: 0.1,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    });
    content = response.choices[0]?.message?.content || content;
  }

  try {
    // Claude may wrap JSON in markdown code blocks
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
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
  const violations = result.issues.filter((i: any) => i.severity === "error");
  const warnings = result.issues.filter((i: any) => i.severity === "warning");
  const scoreColor = result.score >= 80 ? "#6366f1" : result.score >= 60 ? "#f59e0b" : "#ef4444";

  // Slack thread_ts must be a string like "1707667890.123456"
  const validThreadTs = threadTs && /^\d+\.\d+$/.test(String(threadTs)) ? String(threadTs) : undefined;

  // ── Build issue lines ──
  const issueLines = result.issues.slice(0, 6).map((i: any) => {
    const color = i.severity === "error" ? "🔴" : i.severity === "warning" ? "🟠" : "🔵";
    return `${color}  *${i.ruleName}* — ${i.message}`;
  }).join("\n\n");

  const moreText = result.issues.length > 6
    ? `\n\n_...and ${result.issues.length - 6} more_`
    : "";

  // ── Main attachment (for the colored side bar) ──
  const attachment: any = {
    color: scoreColor,
    blocks: [
      // Title
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔍  *Analysis Complete — <${result.prUrl}|PR #${result.prNumber}>*`,
        },
      },
      // Stats row
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `:red_circle:  *${violations.length}*\nViolations` },
          { type: "mrkdwn", text: `:large_orange_circle:  *${warnings.length}*\nWarnings` },
          { type: "mrkdwn", text: `${result.score >= 80 ? ":large_purple_circle:" : result.score >= 60 ? ":large_orange_circle:" : ":red_circle:"}  *${result.score}*\nScore` },
        ],
      },
      { type: "divider" },
    ],
  };

  // Issues or clean message
  if (result.issues.length > 0) {
    attachment.blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: issueLines + moreText },
    });
  } else {
    attachment.blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "✅  *No issues found!* This PR looks clean." },
    });
  }

  // Action buttons
  attachment.blocks.push({ type: "divider" });
  attachment.blocks.push({
    type: "actions",
    elements: [
      {
        type: "button",
        text: { type: "plain_text", text: "🔧 Auto-Fix & Create PR", emoji: true },
        style: "primary",
        action_id: "auto_fix",
        value: `${result.prUrl}`,
      },
      {
        type: "button",
        text: { type: "plain_text", text: "📋 View Full Report", emoji: true },
        action_id: "view_report",
        value: `${result.prUrl}`,
      },
    ],
  });

  // Footer
  attachment.blocks.push({
    type: "context",
    elements: [
      { type: "mrkdwn", text: `⚡ *CodeGuard AI*  ·  _${result.prTitle}_` },
    ],
  });

  await slack.chat.postMessage({
    channel,
    thread_ts: validThreadTs,
    reply_broadcast: false,
    unfurl_links: false,
    attachments: [attachment],
    text: `CodeGuard Analysis: PR #${result.prNumber} scored ${result.score}/100`,
  });
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
