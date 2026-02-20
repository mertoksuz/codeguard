import { Worker } from "bullmq";
import IORedis from "ioredis";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { Octokit } from "@octokit/rest";
import { WebClient } from "@slack/web-api";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
const needsTls = redisUrl.startsWith("rediss://") || redisUrl.includes("upstash.io");
const connection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  tls: needsTls ? { rejectUnauthorized: false } : undefined,
});

const AI_PROVIDER = process.env.AI_PROVIDER || "openai";
const openai = AI_PROVIDER === "openai" ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
const anthropic = AI_PROVIDER === "claude" ? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY }) : null;

// Fallback Octokit for single-tenant / backwards compat
const fallbackOctokit = new Octokit({ auth: process.env.GITHUB_TOKEN || process.env.GITHUB_CLIENT_SECRET });
const fallbackSlack = new WebClient(process.env.SLACK_BOT_TOKEN);

/**
 * Get an authenticated Octokit instance for a team.
 * Looks up the team's GitHub token from the DB, falls back to env var.
 */
async function getOctokitForTeam(teamId?: string): Promise<Octokit> {
  if (teamId) {
    try {
      const install = await prisma.gitHubInstallation.findUnique({
        where: { teamId },
        select: { accessToken: true },
      });
      if (install?.accessToken) {
        return new Octokit({ auth: install.accessToken });
      }
    } catch (e: any) {
      console.warn(`  ⚠️  Could not fetch GitHub token for team ${teamId}: ${e.message}`);
    }
  }
  // Fallback to env var (backwards compat)
  return fallbackOctokit;
}

/**
 * Get a Slack WebClient for a team.
 * Looks up the team's bot token from the DB, falls back to env var.
 */
async function getSlackForTeam(teamId?: string): Promise<WebClient> {
  if (teamId) {
    try {
      const install = await prisma.slackInstallation.findUnique({
        where: { teamId },
        select: { botToken: true },
      });
      if (install?.botToken) {
        return new WebClient(install.botToken);
      }
    } catch (e: any) {
      console.warn(`  ⚠️  Could not fetch Slack token for team ${teamId}: ${e.message}`);
    }
  }
  return fallbackSlack;
}

const ALL_BUILTIN_RULES = ["SRP", "OCP", "LSP", "ISP", "DIP", "NAMING", "COMPLEXITY", "FILE_LENGTH", "IMPORTS"];

/**
 * Get the enabled rules for a team (built-in + custom).
 * Returns { builtinRules: string[], customPrompts: string[] }
 */
async function getTeamRules(teamId?: string): Promise<{ builtinRules: string[]; customPrompts: string[] }> {
  if (!teamId) return { builtinRules: ALL_BUILTIN_RULES, customPrompts: [] };

  try {
    // Get the team's plan to determine allowed rules
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { plan: true },
    });
    const planLimits = PLAN_LIMITS[team?.plan || "FREE"] || PLAN_LIMITS.FREE;
    const allowedBuiltinRules = planLimits.builtinRules;

    const [ruleConfigs, customRules] = await Promise.all([
      prisma.ruleConfig.findMany({ where: { teamId } }),
      prisma.customRule.findMany({ where: { teamId, enabled: true } }),
    ]);

    // Determine enabled built-in rules (only from allowed set, unless explicitly disabled)
    const disabledSet = new Set(ruleConfigs.filter((c) => !c.enabled).map((c) => c.ruleId));
    const builtinRules = allowedBuiltinRules.filter((r) => !disabledSet.has(r));

    // Custom rule prompts
    const customPrompts = customRules.map((r) => `[${r.name}] (severity: ${r.severity}): ${r.prompt}`);

    return { builtinRules, customPrompts };
  } catch (e: any) {
    console.warn(`  ⚠️  Could not fetch rules for team ${teamId}: ${e.message}`);
    return { builtinRules: ALL_BUILTIN_RULES, customPrompts: [] };
  }
}

// ─── Fetch PR diff from GitHub ─────────────────────
async function getPRDiff(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<{ diff: string; title: string; url: string; headSha: string }> {
  const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  const { data: diff } = await octokit.pulls.get({
    owner, repo, pull_number: prNumber,
    mediaType: { format: "diff" },
  });
  return {
    diff: diff as unknown as string,
    title: pr.title,
    url: pr.html_url,
    headSha: pr.head.sha,
  };
}

// ─── Smart diff preprocessing (token optimization) ─
const SKIP_EXTENSIONS = new Set([
  ".lock", ".svg", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".woff", ".woff2",
  ".ttf", ".eot", ".mp4", ".mp3", ".pdf", ".zip", ".tar", ".gz", ".map",
  ".min.js", ".min.css", ".d.ts", ".snap",
]);
const SKIP_FILES = new Set([
  "package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb",
  ".gitignore", ".env.example", ".prettierrc", ".eslintignore",
]);

function preprocessDiff(rawDiff: string, maxChars: number = 10000): string {
  const files = rawDiff.split(/^diff --git /m).filter(Boolean);
  const processedHunks: string[] = [];
  let totalLen = 0;

  for (const file of files) {
    // Extract filename from "a/path b/path"
    const headerMatch = file.match(/^a\/(.+?) b\/(.+)/m);
    const filename = headerMatch?.[2] || "";

    // Skip binary files
    if (file.includes("Binary files") || file.includes("GIT binary patch")) continue;

    // Skip non-code files by extension
    const ext = filename.includes(".") ? "." + filename.split(".").pop()!.toLowerCase() : "";
    if (SKIP_EXTENSIONS.has(ext)) continue;

    // Skip known noise files by name
    const basename = filename.split("/").pop() || "";
    if (SKIP_FILES.has(basename)) continue;

    // Extract only added lines with line context
    const lines = file.split("\n");
    const relevantLines: string[] = [`--- ${filename} ---`];
    let currentHunkHeader = "";

    for (const line of lines) {
      if (line.startsWith("@@")) {
        currentHunkHeader = line; // Track hunk position
        continue;
      }
      if (line.startsWith("+") && !line.startsWith("+++")) {
        // Include hunk header once per group for line-number context
        if (currentHunkHeader) {
          relevantLines.push(currentHunkHeader);
          currentHunkHeader = "";
        }
        relevantLines.push(line);
      }
    }

    // Only include file if it has actual additions
    if (relevantLines.length > 1) {
      const chunk = relevantLines.join("\n") + "\n";
      if (totalLen + chunk.length > maxChars) break;
      processedHunks.push(chunk);
      totalLen += chunk.length;
    }
  }

  const result = processedHunks.join("\n");
  return result || rawDiff.substring(0, maxChars); // Fallback to raw if parsing yields nothing
}

// ─── Analyze diff with AI (OpenAI or Claude) ──────
const ANALYSIS_SYSTEM_PROMPT = (rules: string[], customPrompts: string[]) => {
  let prompt = `You are a code reviewer. Analyze this PR diff for violations of: ${rules.join(", ")}.`;

  if (customPrompts.length > 0) {
    prompt += `\nCustom rules:\n${customPrompts.join("\n")}`;
  }

  prompt += `\nReturn JSON: {"issues":[{"ruleId":string,"ruleName":string,"severity":"error"|"warning"|"info","file":string,"line":number,"message":string,"suggestion":string}],"score":number}
score 0-100. JSON only.`;
  return prompt;
};

async function analyzeWithAI(diff: string, rules: string[], customPrompts: string[] = []) {
  // Smart preprocessing: strip noise, keep only added code
  const optimizedDiff = preprocessDiff(diff);
  const inputChars = optimizedDiff.length;
  console.log(`  📊 Token optimization: ${diff.length} → ${inputChars} chars (${Math.round((1 - inputChars / diff.length) * 100)}% reduction)`);

  let content = '{"issues":[],"score":100}';

  // Use cheaper model for analysis (configurable)
  const analysisModel = process.env.ANALYSIS_MODEL || (AI_PROVIDER === "claude" ? "claude-sonnet-4-20250514" : "gpt-4o-mini");

  if (AI_PROVIDER === "claude" && anthropic) {
    console.log(`  🤖 Using Claude (${analysisModel}) for analysis...`);
    const response = await anthropic.messages.create({
      model: analysisModel,
      max_tokens: 2000,
      system: ANALYSIS_SYSTEM_PROMPT(rules, customPrompts),
      messages: [{ role: "user", content: optimizedDiff }],
    });
    const block = response.content[0];
    content = block.type === "text" ? block.text : content;
  } else {
    console.log(`  🤖 Using OpenAI (${analysisModel}) for analysis...`);
    const oa = openai || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await oa.chat.completions.create({
      model: analysisModel,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT(rules, customPrompts) },
        { role: "user", content: optimizedDiff },
      ],
      temperature: 0.1,
      max_tokens: 2000,
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
  slack: WebClient,
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
    let line = `${color}  *${i.ruleName}* — ${i.message}`;
    if (i.suggestion) {
      line += `\n      💡 _${i.suggestion}_`;
    }
    return line;
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
        url: `${result.prUrl}`,
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

// ─── Plan limits ───────────────────────────────────
const PLAN_LIMITS: Record<string, { reviews: number; repos: number; autoFix: boolean; builtinRules: string[] }> = {
  FREE: {
    reviews: 50,
    repos: 1,
    autoFix: false,
    builtinRules: ["SRP", "OCP", "LSP", "ISP", "DIP"], // 5 SOLID rules only
  },
  PRO: {
    reviews: 500,
    repos: -1, // unlimited
    autoFix: true,
    builtinRules: ALL_BUILTIN_RULES, // all 9+
  },
  ENTERPRISE: {
    reviews: -1, // unlimited
    repos: -1,
    autoFix: true,
    builtinRules: ALL_BUILTIN_RULES,
  },
};

async function checkAndIncrementUsage(teamId?: string): Promise<{ allowed: boolean; reason?: string }> {
  if (!teamId) return { allowed: true };

  try {
    const team = await prisma.team.findUnique({
      where: { id: teamId },
      select: { plan: true, reviewsUsedThisMonth: true, reviewsResetAt: true },
    });

    if (!team) return { allowed: true };

    // Check if we need to reset the monthly counter
    const now = new Date();
    const resetAt = new Date(team.reviewsResetAt);
    const monthDiff = (now.getFullYear() - resetAt.getFullYear()) * 12 + (now.getMonth() - resetAt.getMonth());
    if (monthDiff >= 1) {
      await prisma.team.update({
        where: { id: teamId },
        data: { reviewsUsedThisMonth: 0, reviewsResetAt: now },
      });
      team.reviewsUsedThisMonth = 0;
    }

    const limit = PLAN_LIMITS[team.plan]?.reviews ?? 50;
    if (limit !== -1 && team.reviewsUsedThisMonth >= limit) {
      return {
        allowed: false,
        reason: `Review limit reached (${team.reviewsUsedThisMonth}/${limit}). Upgrade your plan at codeguard-api-one.vercel.app/dashboard/settings`,
      };
    }

    // Increment usage
    await prisma.team.update({
      where: { id: teamId },
      data: { reviewsUsedThisMonth: { increment: 1 } },
    });

    return { allowed: true };
  } catch (e: any) {
    console.warn(`  ⚠️  Usage check failed: ${e.message}`);
    return { allowed: true }; // fail open
  }
}

/**
 * Resolve teamId from repo owner via GitHubInstallation.
 * Fallback when teamId is not passed from the events route.
 */
async function resolveTeamIdFromRepo(repoFullName: string): Promise<string | undefined> {
  try {
    const owner = repoFullName.split("/")[0];
    if (!owner) return undefined;
    // Try exact match first, then case-insensitive
    const ghInstall = await prisma.gitHubInstallation.findFirst({
      where: { accountLogin: owner },
      select: { teamId: true },
    });
    return ghInstall?.teamId ?? undefined;
  } catch (e: any) {
    console.warn(`  ⚠️  Could not resolve teamId from repo: ${e.message}`);
    return undefined;
  }
}

// ─── Analysis Worker ───────────────────────────────
const analysisWorker = new Worker(
  "analysis",
  async (job) => {
    const { repositoryFullName, prNumber, slackChannel, slackThreadTs, teamId: rawTeamId } = job.data;

    // Resolve teamId: use provided teamId, or fallback to repo owner lookup
    let teamId = rawTeamId;
    if (!teamId) {
      teamId = await resolveTeamIdFromRepo(repositoryFullName);
      if (teamId) {
        console.log(`📊 Resolved teamId from repo owner: ${teamId}`);
      }
    }

    console.log(`📊 Analyzing ${repositoryFullName}#${prNumber}${teamId ? ` (team: ${teamId})` : " (no team)"}...`);

    // 0. Check plan limits
    const { allowed, reason } = await checkAndIncrementUsage(teamId);
    if (!allowed) {
      console.log(`  ⛔ ${reason}`);
      // Notify via Slack if channel available
      if (slackChannel) {
        const slackClient = await getSlackForTeam(teamId);
        await slackClient.chat.postMessage({
          channel: slackChannel,
          thread_ts: slackThreadTs,
          text: `⛔ *Review limit reached*\n${reason}`,
        });
      }
      return { score: 0, issueCount: 0, skipped: true, reason };
    }

    const [owner, repo] = repositoryFullName.split("/");
    const octokit = await getOctokitForTeam(teamId);
    const startTime = Date.now();

    // 1. Fetch PR diff
    const pr = await getPRDiff(octokit, owner, repo, prNumber);
    console.log(`  📄 Fetched diff for "${pr.title}" (${pr.diff.length} chars, sha: ${pr.headSha.slice(0, 7)})`);

    // 1b. Duplicate detection — skip if same PR+SHA already analyzed
    if (teamId) {
      try {
        const existing = await prisma.review.findFirst({
          where: { teamId, prNumber, branch: { contains: pr.headSha.slice(0, 7) }, status: "COMPLETED" },
          select: { id: true, score: true, totalIssues: true },
        });
        if (existing) {
          console.log(`  ⏭️  Already analyzed (review: ${existing.id}, score: ${existing.score}). Skipping duplicate.`);
          return { score: existing.score, issueCount: existing.totalIssues, skipped: true, reason: "duplicate" };
        }
      } catch (e: any) {
        console.warn(`  ⚠️  Dedup check failed: ${e.message}`);
      }
    }

    // 2. Get team rules
    const { builtinRules, customPrompts } = await getTeamRules(teamId);
    console.log(`  📏 Rules: ${builtinRules.length} built-in + ${customPrompts.length} custom`);

    // 3. Analyze with AI
    const { issues, score } = await analyzeWithAI(pr.diff, builtinRules, customPrompts);
    const analysisTime = Date.now() - startTime;
    console.log(`  🧠 AI found ${issues.length} issues, score: ${score}/100 (${analysisTime}ms)`);

    // 4. Persist review to DB (always try, even without teamId)
    try {
      if (teamId) {
        // Check repo limit before upserting
        const team = await prisma.team.findUnique({
          where: { id: teamId },
          select: { plan: true, _count: { select: { repositories: true } } },
        });
        const repoLimit = PLAN_LIMITS[team?.plan || "FREE"]?.repos ?? 1;
        const existingRepo = await prisma.repository.findUnique({
          where: { fullName_teamId: { fullName: repositoryFullName, teamId } },
        });

        // If this is a new repo and we're at the limit, warn but continue analysis
        if (!existingRepo && repoLimit !== -1 && (team?._count.repositories ?? 0) >= repoLimit) {
          console.warn(`  ⚠️  Repo limit reached (${team?._count.repositories}/${repoLimit}). Review will be analyzed but not persisted.`);
          if (slackChannel) {
            const slackClient = await getSlackForTeam(teamId);
            await slackClient.chat.postMessage({
              channel: slackChannel,
              thread_ts: slackThreadTs,
              text: `⚠️ *Repository limit reached* (${team?._count.repositories}/${repoLimit}). Upgrade your plan to track more repositories.`,
            });
          }
        } else {
          // Upsert repository
          const repository = await prisma.repository.upsert({
            where: { fullName_teamId: { fullName: repositoryFullName, teamId } },
            create: {
              name: repo,
              fullName: repositoryFullName,
              owner,
              url: `https://github.com/${repositoryFullName}`,
              teamId,
            },
            update: { updatedAt: new Date() },
          });

        const criticalCount = issues.filter((i: any) => i.severity === "error").length;
        const warningCount = issues.filter((i: any) => i.severity === "warning").length;
        const infoCount = issues.filter((i: any) => i.severity === "info").length;

        // Determine head branch from diff (include sha for dedup)
        const branch = `${pr.url.split("/").pop() || "unknown"}@${pr.headSha.slice(0, 7)}`;

        const review = await prisma.review.create({
          data: {
            prNumber,
            prTitle: pr.title,
            prUrl: pr.url,
            branch,
            status: "COMPLETED",
            score,
            totalIssues: issues.length,
            criticalCount,
            warningCount,
            infoCount,
            analysisTime,
            repositoryId: repository.id,
            teamId,
            slackTs: slackThreadTs || null,
            slackChannel: slackChannel || null,
            issues: {
              create: issues.map((i: any) => ({
                ruleId: i.ruleId || "UNKNOWN",
                ruleName: i.ruleName || "Unknown",
                severity: (i.severity || "warning").toUpperCase() === "ERROR"
                  ? "ERROR"
                  : (i.severity || "warning").toUpperCase() === "INFO"
                  ? "INFO"
                  : "WARNING",
                file: i.file || "unknown",
                line: i.line || 0,
                message: i.message || "",
                suggestion: i.suggestion || null,
              })),
            },
          },
        });
        console.log(`  💾 Review saved to DB (id: ${review.id})`);
        } // end else (repo limit OK)
      } else {
        console.warn(`  ⚠️  No teamId — review not saved to DB. Analysis still sent to Slack.`);
      }
    } catch (e: any) {
      console.warn(`  ⚠️  Could not save review to DB: ${e.message}`);
    }

    // 5. Send Slack notification
    if (slackChannel) {
      const slackClient = await getSlackForTeam(teamId);
      await sendSlackResult(slackClient, slackChannel, slackThreadTs, {
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

// ─── Generate fix with AI ──────────────────────────
const FIX_SYSTEM_PROMPT = `You are a code fixer. Given a file and issues, return ONLY: {"fixedContent":"<entire fixed file>"}
Apply all fixes. Keep original logic. No comments about fixes.`;

async function generateFixWithAI(fileContent: string, issues: any[]): Promise<string> {
  const issueList = issues.map((i: any) =>
    `- L${i.line}: [${i.severity}] ${i.ruleName}: ${i.message}${i.suggestion ? ` → ${i.suggestion}` : ""}`
  ).join("\n");

  const userPrompt = `File:\n${"```"}\n${fileContent}\n${"```"}\n\nFix:\n${issueList}`;

  let content = "";

  // Use the stronger model for fixes (quality matters more)
  const fixModel = process.env.FIX_MODEL || (AI_PROVIDER === "claude" ? (process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514") : (process.env.OPENAI_MODEL || "gpt-4o"));

  if (AI_PROVIDER === "claude" && anthropic) {
    const response = await anthropic.messages.create({
      model: fixModel,
      max_tokens: 8000,
      system: FIX_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = response.content[0];
    content = block.type === "text" ? block.text : "";
  } else {
    const oa = openai || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await oa.chat.completions.create({
      model: fixModel,
      messages: [
        { role: "system", content: FIX_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.1,
      max_tokens: 8000,
      response_format: { type: "json_object" },
    });
    content = response.choices[0]?.message?.content || "";
  }

  try {
    const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(cleaned);
    return parsed.fixedContent || fileContent;
  } catch {
    return content || fileContent;
  }
}

// ─── Get list of files changed in a PR ─────────────
async function getPRFiles(octokit: Octokit, owner: string, repo: string, prNumber: number) {
  const { data: files } = await octokit.pulls.listFiles({ owner, repo, pull_number: prNumber });
  return files.filter(f => f.status !== "removed");
}

// ─── Get file content from the PR's head branch ────
async function getFileContent(octokit: Octokit, owner: string, repo: string, ref: string, path: string): Promise<string> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
    if ("content" in data && data.encoding === "base64") {
      return Buffer.from(data.content, "base64").toString("utf-8");
    }
  } catch (e: any) {
    console.log(`  ⚠️  Could not fetch ${path}: ${e.message}`);
  }
  return "";
}

// ─── Create a fix branch, commit fixed files, open PR ──
async function createFixPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  prNumber: number,
  baseBranch: string,
  fixes: { path: string; content: string }[]
): Promise<{ prUrl: string; prNumber: number }> {
  const fixBranch = `codeguard/auto-fix-pr-${prNumber}`;

  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: `heads/${baseBranch}` });
  const baseSha = refData.object.sha;

  try {
    await octokit.git.createRef({ owner, repo, ref: `refs/heads/${fixBranch}`, sha: baseSha });
  } catch (e: any) {
    if (e.status === 422) {
      await octokit.git.updateRef({ owner, repo, ref: `heads/${fixBranch}`, sha: baseSha, force: true });
    } else {
      throw e;
    }
  }

  for (const fix of fixes) {
    let fileSha: string | undefined;
    try {
      const { data: existing } = await octokit.repos.getContent({ owner, repo, path: fix.path, ref: fixBranch });
      if ("sha" in existing) fileSha = existing.sha;
    } catch { /* file may not exist */ }

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: fix.path,
      message: `fix: auto-fix code quality issues in ${fix.path}`,
      content: Buffer.from(fix.content).toString("base64"),
      branch: fixBranch,
      ...(fileSha ? { sha: fileSha } : {}),
    });
  }

  const fileList = fixes.map(f => "- `" + f.path + "`").join("\n");
  const { data: newPR } = await octokit.pulls.create({
    owner,
    repo,
    title: `🔧 CodeGuard Auto-Fix for PR #${prNumber}`,
    body: `This PR was automatically generated by **CodeGuard AI** to fix code quality issues found in PR #${prNumber}.\n\n### Fixed files:\n${fileList}\n\n---\n_Powered by CodeGuard AI_`,
    head: fixBranch,
    base: baseBranch,
  });

  return { prUrl: newPR.html_url, prNumber: newPR.number };
}

// ─── Send fix result to Slack ──────────────────────
async function sendFixSlackNotification(
  slack: WebClient,
  channel: string,
  threadTs: string | undefined,
  result: { originalPrNumber: number; fixPrUrl: string; fixPrNumber: number; filesFixed: number }
) {
  const validThreadTs = threadTs && /^\d+\.\d+$/.test(String(threadTs)) ? String(threadTs) : undefined;

  const attachment: any = {
    color: "#22c55e",
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `🔧  *Auto-Fix Complete — <${result.fixPrUrl}|PR #${result.fixPrNumber}>*`,
        },
      },
      {
        type: "section",
        fields: [
          { type: "mrkdwn", text: `:white_check_mark:  *${result.filesFixed}*\nFiles Fixed` },
          { type: "mrkdwn", text: `:link:  *PR #${result.originalPrNumber}*\nOriginal PR` },
        ],
      },
      { type: "divider" },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "A new pull request with AI-generated fixes has been created. Review and merge it to apply the fixes.",
        },
      },
      {
        type: "actions",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "📋 View Fix PR", emoji: true },
            style: "primary",
            url: result.fixPrUrl,
            action_id: "view_fix_pr",
          },
        ],
      },
      {
        type: "context",
        elements: [
          { type: "mrkdwn", text: `⚡ *CodeGuard AI*  ·  _Auto-fix for PR #${result.originalPrNumber}_` },
        ],
      },
    ],
  };

  await slack.chat.postMessage({
    channel,
    thread_ts: validThreadTs,
    reply_broadcast: false,
    unfurl_links: false,
    attachments: [attachment],
    text: `CodeGuard Auto-Fix: Created PR #${result.fixPrNumber} with ${result.filesFixed} fixed files`,
  });
}

// ─── Fix Worker ────────────────────────────────────
const fixWorker = new Worker(
  "fix",
  async (job) => {
    const { repositoryFullName, prNumber, slackChannel, slackThreadTs, teamId: rawTeamId } = job.data;

    // Resolve teamId: use provided teamId, or fallback to repo owner lookup
    let teamId = rawTeamId;
    if (!teamId) {
      teamId = await resolveTeamIdFromRepo(repositoryFullName);
    }

    console.log(`🔧 Auto-fix started for ${repositoryFullName}#${prNumber}${teamId ? ` (team: ${teamId})` : ""}...`);

    // 0. Check if plan allows auto-fix (Pro+ only)
    if (teamId) {
      const team = await prisma.team.findUnique({
        where: { id: teamId },
        select: { plan: true },
      });
      const planLimits = PLAN_LIMITS[team?.plan || "FREE"] || PLAN_LIMITS.FREE;
      if (!planLimits.autoFix) {
        console.log(`  ⛔ Auto-fix not available on ${team?.plan || "FREE"} plan`);
        if (slackChannel) {
          const slackClient = await getSlackForTeam(teamId);
          const vts = slackThreadTs && /^\d+\.\d+$/.test(String(slackThreadTs)) ? String(slackThreadTs) : undefined;
          await slackClient.chat.postMessage({
            channel: slackChannel,
            thread_ts: vts,
            text: "⛔ *Auto-fix is available on Pro and Enterprise plans only.*\nUpgrade at codeguard-api-one.vercel.app/dashboard/settings",
          });
        }
        return { filesFixed: 0, skipped: true, reason: "Auto-fix requires Pro or Enterprise plan" };
      }
    }

    const [owner, repo] = repositoryFullName.split("/");
    const octokit = await getOctokitForTeam(teamId);
    const slackClient = await getSlackForTeam(teamId);

    // 1. Get PR info (head branch)
    const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
    const headBranch = pr.head.ref;
    const baseBranch = pr.base.ref;
    console.log(`  📄 PR: "${pr.title}" (head: ${headBranch}, base: ${baseBranch})`);

    // 2. Get the diff to analyze
    const prDiff = await getPRDiff(octokit, owner, repo, prNumber);
    console.log(`  📄 Diff: ${prDiff.diff.length} chars`);

    // 3. Reuse existing issues from DB (avoid duplicate AI call)
    let issues: any[] = [];
    if (teamId) {
      try {
        const existingReview = await prisma.review.findFirst({
          where: { teamId, prNumber, repository: { fullName: repositoryFullName }, status: "COMPLETED" },
          orderBy: { createdAt: "desc" },
          include: { issues: true },
        });
        if (existingReview && existingReview.issues.length > 0) {
          issues = existingReview.issues.map((i) => ({
            ruleId: i.ruleId,
            ruleName: i.ruleName,
            severity: i.severity.toLowerCase(),
            file: i.file,
            line: i.line,
            message: i.message,
            suggestion: i.suggestion,
          }));
          console.log(`  ♻️  Reusing ${issues.length} issues from existing review (saved 1 AI call)`);
        }
      } catch (e: any) {
        console.warn(`  ⚠️  Could not fetch existing issues: ${e.message}`);
      }
    }

    // Only call AI if no cached issues found
    if (issues.length === 0) {
      const { builtinRules, customPrompts } = await getTeamRules(teamId);
      const result = await analyzeWithAI(prDiff.diff, builtinRules, customPrompts);
      issues = result.issues;
    }
    console.log(`  🧠 ${issues.length} issues to fix`);

    if (issues.length === 0) {
      console.log("  ✅ No issues to fix!");
      if (slackChannel) {
        const vts = slackThreadTs && /^\d+\.\d+$/.test(String(slackThreadTs)) ? String(slackThreadTs) : undefined;
        await slackClient.chat.postMessage({
          channel: slackChannel,
          thread_ts: vts,
          text: "✅ No issues found to auto-fix — the code looks good!",
        });
      }
      return { filesFixed: 0 };
    }

    // 4. Group issues by file
    const issuesByFile: Record<string, any[]> = {};
    for (const issue of issues) {
      const file = issue.file || "unknown";
      if (!issuesByFile[file]) issuesByFile[file] = [];
      issuesByFile[file].push(issue);
    }

    // 5. Get changed files and generate fixes
    const changedFiles = await getPRFiles(octokit, owner, repo, prNumber);
    const fixes: { path: string; content: string }[] = [];

    for (const file of changedFiles) {
      const fileIssues = issuesByFile[file.filename];
      if (!fileIssues || fileIssues.length === 0) continue;

      console.log(`  🔧 Fixing ${file.filename} (${fileIssues.length} issues)...`);
      const content = await getFileContent(octokit, owner, repo, headBranch, file.filename);
      if (!content) continue;

      const fixedContent = await generateFixWithAI(content, fileIssues);
      if (fixedContent && fixedContent !== content) {
        fixes.push({ path: file.filename, content: fixedContent });
      }
    }

    if (fixes.length === 0) {
      console.log("  ⚠️  AI couldn't generate any fixes");
      if (slackChannel) {
        const vts = slackThreadTs && /^\d+\.\d+$/.test(String(slackThreadTs)) ? String(slackThreadTs) : undefined;
        await slackClient.chat.postMessage({
          channel: slackChannel,
          thread_ts: vts,
          text: "⚠️ Auto-fix analysis found issues but couldn't generate fixes. Manual review recommended.",
        });
      }
      return { filesFixed: 0 };
    }

    // 6. Create branch, commit fixes, open PR
    console.log(`  📝 Creating fix PR with ${fixes.length} fixed files...`);
    const fixPR = await createFixPR(octokit, owner, repo, prNumber, baseBranch, fixes);
    console.log(`  🎉 Fix PR created: ${fixPR.prUrl}`);

    // 7. Update review record in DB with fix info
    if (teamId) {
      try {
        await prisma.review.updateMany({
          where: { teamId, prNumber, repository: { fullName: repositoryFullName } },
          data: { status: "FIXED", fixPrUrl: fixPR.prUrl, fixPrNumber: fixPR.prNumber },
        });
        console.log(`  💾 Review updated with fix PR`);
      } catch (e: any) {
        console.warn(`  ⚠️  Could not update review in DB: ${e.message}`);
      }
    }

    // 8. Notify Slack
    if (slackChannel) {
      await sendFixSlackNotification(slackClient, slackChannel, slackThreadTs, {
        originalPrNumber: prNumber,
        fixPrUrl: fixPR.prUrl,
        fixPrNumber: fixPR.prNumber,
        filesFixed: fixes.length,
      });
      console.log("  💬 Slack notification sent");
    }

    console.log(`✅ Auto-fix complete for ${repositoryFullName}#${prNumber}`);
    return { filesFixed: fixes.length, fixPrUrl: fixPR.prUrl };
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
