import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { prisma } from "@codeguard/db";

export const maxDuration = 60; // seconds — allows waitUntil to keep running

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

/** Look up our internal teamId from the Slack workspace team_id */
async function resolveTeamId(slackTeamId?: string): Promise<string | undefined> {
  if (!slackTeamId) return undefined;
  try {
    const install = await prisma.slackInstallation.findUnique({
      where: { teamSlackId: slackTeamId },
      select: { teamId: true },
    });
    return install?.teamId ?? undefined;
  } catch {
    return undefined;
  }
}

/** Fallback: resolve teamId from the GitHub repo owner via GitHubInstallation */
async function resolveTeamIdFromRepo(repoFullName: string): Promise<string | undefined> {
  try {
    const owner = repoFullName.split("/")[0];
    if (!owner) return undefined;
    const ghInstall = await prisma.gitHubInstallation.findFirst({
      where: { accountLogin: { equals: owner, mode: "insensitive" } },
      select: { teamId: true },
    });
    return ghInstall?.teamId ?? undefined;
  } catch {
    return undefined;
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("[Slack Event] Received:", body.type, body.event?.type || "");

  // Slack URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle events — respond to Slack IMMEDIATELY, process in background
  if (body.type === "event_callback") {
    const event = body.event;

    console.log("[Slack Event] Event detail:", JSON.stringify({ type: event.type, subtype: event.subtype, bot_id: event.bot_id, text: event.text?.substring(0, 200) }));

    // Only process original messages — ignore message_changed, message_deleted, etc.
    if (event.type === "message" && !event.bot_id && !event.subtype) {
      const messageText = event.text || "";
      const prRegex = /github\.com\/([^/|>]+\/[^/|>]+)\/pull\/(\d+)/;
      const match = messageText.match(prRegex);

      if (match) {
        const [, repo, prNumber] = match;
        console.log(`[Slack Event] PR detected: ${repo}#${prNumber} in channel ${event.channel}`);

        if (!API_URL) {
          console.error("[Slack Event] ERROR: NEXT_PUBLIC_API_URL / API_URL is not set!");
          return NextResponse.json({ ok: true });
        }

        // Resolve the internal teamId from the Slack workspace
        let teamId = await resolveTeamId(body.team_id);

        // Fallback: resolve from the GitHub repo owner
        if (!teamId) {
          teamId = await resolveTeamIdFromRepo(repo);
          if (teamId) {
            console.log(`[Slack Event] Resolved teamId from repo owner: ${teamId}`);
          } else {
            console.warn(`[Slack Event] Could not resolve teamId for Slack team ${body.team_id} or repo ${repo}`);
          }
        }

        // Use waitUntil to keep function alive after responding to Slack
        waitUntil(
          fetch(`${API_URL}/api/reviews/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repositoryFullName: repo,
              prNumber: parseInt(prNumber, 10),
              slackChannel: String(event.channel),
              slackThreadTs: String(event.ts),
              teamId,
            }),
          })
            .then((res) => console.log(`[Slack Event] API responded: ${res.status}`))
            .catch((err) => console.error(`[Slack Event] Failed to call API:`, err.message))
        );
      } else {
        console.log("[Slack Event] Message received but no PR link found in:", event.text?.substring(0, 100));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
