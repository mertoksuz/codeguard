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
    const [ruleConfigs, customRules] = await Promise.all([
      prisma.ruleConfig.findMany({ where: { teamId } }),
      prisma.customRule.findMany({ where: { teamId, enabled: true } }),
    ]);

    // Determine enabled built-in rules (all enabled by default, unless explicitly disabled)
    const disabledSet = new Set(ruleConfigs.filter((c) => !c.enabled).map((c) => c.ruleId));
    const builtinRules = ALL_BUILTIN_RULES.filter((r) => !disabledSet.has(r));

    // Custom rule prompts
    const customPrompts = customRules.map((r) => `[${r.name}] (severity: ${r.severity}): ${r.prompt}`);

    return { builtinRules, customPrompts };
  } catch (e: any) {
    console.warn(`  ⚠️  Could not fetch rules for team ${teamId}: ${e.message}`);
    return { builtinRules: ALL_BUILTIN_RULES, customPrompts: [] };
  }
}

// ─── Fetch PR diff from GitHub ─────────────────────
async function getPRDiff(octokit: Octokit, owner: string, repo: string, prNumber: number): Promise<{ diff: string; title: string; url: string }> {
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
const ANALYSIS_SYSTEM_PROMPT = (rules: string[], customPrompts: string[]) => {
  let prompt = `You are an expert code reviewer. Analyze the following PR diff for violations of these SOLID and clean-code rules: ${rules.join(", ")}.`;

  if (customPrompts.length > 0) {
    prompt += `\n\nAlso check for violations of these custom rules:\n${customPrompts.join("\n")}`;
  }

  prompt += `\nReturn JSON: { "issues": [{ "ruleId": string, "ruleName": string, "severity": "error"|"warning"|"info", "file": string, "line": number, "message": string, "suggestion": string }], "score": number }
score is 0-100 (100 = perfect). Only return the JSON, no other text.`;
  return prompt;
};

async function analyzeWithAI(diff: string, rules: string[], customPrompts: string[] = []) {
  const truncatedDiff = diff.substring(0, 12000);
  let content = '{"issues":[],"score":100}';

  if (AI_PROVIDER === "claude" && anthropic) {
    console.log("  🤖 Using Claude for analysis...");
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: ANALYSIS_SYSTEM_PROMPT(rules, customPrompts),
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
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT(rules, customPrompts) },
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
const PLAN_REVIEW_LIMITS: Record<string, number> = {
  FREE: 50,
  PRO: 500,
  ENTERPRISE: -1, // unlimited
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

    const limit = PLAN_REVIEW_LIMITS[team.plan] ?? 50;
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

// ─── Analysis Worker ───────────────────────────────
const analysisWorker = new Worker(
  "analysis",
  async (job) => {
    const { repositoryFullName, prNumber, slackChannel, slackThreadTs, teamId } = job.data;
    console.log(`📊 Analyzing ${repositoryFullName}#${prNumber}${teamId ? ` (team: ${teamId})` : ""}...`);

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
    console.log(`  📄 Fetched diff for "${pr.title}" (${pr.diff.length} chars)`);

    // 2. Get team rules
    const { builtinRules, customPrompts } = await getTeamRules(teamId);
    console.log(`  📏 Rules: ${builtinRules.length} built-in + ${customPrompts.length} custom`);

    // 3. Analyze with AI
    const { issues, score } = await analyzeWithAI(pr.diff, builtinRules, customPrompts);
    const analysisTime = Date.now() - startTime;
    console.log(`  🧠 AI found ${issues.length} issues, score: ${score}/100 (${analysisTime}ms)`);

    // 4. Persist review to DB
    if (teamId) {
      try {
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

        // Determine head branch from diff (fallback)
        const branch = pr.url.split("/").pop() || "unknown";

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
      } catch (e: any) {
        console.warn(`  ⚠️  Could not save review to DB: ${e.message}`);
      }
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
const FIX_SYSTEM_PROMPT = `You are an expert code fixer. You will be given a file's content and a list of code quality issues found by a reviewer.
Return ONLY a JSON object: { "fixedContent": "<the entire fixed file content>" }
Apply all the suggested fixes. Keep the file's original purpose and logic intact. Only fix the issues listed. Do not add comments about what you fixed.`;

async function generateFixWithAI(fileContent: string, issues: any[]): Promise<string> {
  const issueList = issues.map((i: any) =>
    `- Line ${i.line}: [${i.severity}] ${i.ruleName}: ${i.message} (Suggestion: ${i.suggestion})`
  ).join("\n");

  const userPrompt = `File content:\n${"```"}\n${fileContent}\n${"```"}\n\nIssues to fix:\n${issueList}`;

  let content = "";

  if (AI_PROVIDER === "claude" && anthropic) {
    const response = await anthropic.messages.create({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-4-20250514",
      max_tokens: 8000,
      system: FIX_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userPrompt }],
    });
    const block = response.content[0];
    content = block.type === "text" ? block.text : "";
  } else {
    const oa = openai || new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await oa.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
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
    const { repositoryFullName, prNumber, slackChannel, slackThreadTs, teamId } = job.data;
    console.log(`🔧 Auto-fix started for ${repositoryFullName}#${prNumber}${teamId ? ` (team: ${teamId})` : ""}...`);

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

    // 3. Analyze with AI to find issues (using team rules)
    const { builtinRules, customPrompts } = await getTeamRules(teamId);
    const { issues } = await analyzeWithAI(prDiff.diff, builtinRules, customPrompts);
    console.log(`  🧠 Found ${issues.length} issues to fix`);

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
