import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";

export const maxDuration = 60;

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

export async function POST(req: NextRequest) {
  // Slack sends interaction payloads as application/x-www-form-urlencoded
  const formData = await req.formData();
  const payloadStr = formData.get("payload") as string;

  if (!payloadStr) {
    return NextResponse.json({ error: "No payload" }, { status: 400 });
  }

  const payload = JSON.parse(payloadStr);
  console.log("[Slack Interaction] Type:", payload.type, "Actions:", payload.actions?.map((a: any) => a.action_id));

  // Acknowledge immediately — Slack requires a response within 3s
  if (payload.type === "block_actions") {
    const action = payload.actions?.[0];
    if (!action) return NextResponse.json({ ok: true });

    const channel = payload.channel?.id;
    const threadTs = payload.message?.ts;
    const user = payload.user?.id;

    if (action.action_id === "auto_fix") {
      const prUrl = action.value; // e.g. "https://github.com/owner/repo/pull/5"
      console.log(`[Slack Interaction] Auto-Fix requested for ${prUrl} by <@${user}>`);

      // Parse owner/repo and PR number from the URL
      const match = prUrl.match(/github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/);
      if (match && API_URL) {
        const [, repoFullName, prNumber] = match;

        // Fire-and-forget to the API using waitUntil
        waitUntil(
          fetch(`${API_URL}/api/reviews/auto-fix`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repositoryFullName: repoFullName,
              prNumber: parseInt(prNumber, 10),
              slackChannel: channel,
              slackThreadTs: threadTs,
              requestedBy: user,
            }),
          })
            .then((res) => console.log(`[Slack Interaction] API auto-fix responded: ${res.status}`))
            .catch((err) => console.error(`[Slack Interaction] Failed to call API:`, err.message))
        );
      }
    } else if (action.action_id === "view_report") {
      const prUrl = action.value;
      console.log(`[Slack Interaction] View Report clicked for ${prUrl} by <@${user}>`);
      // For now, the button just opens the PR URL — no extra handling needed
    }
  }

  // Return 200 immediately so Slack doesn't show an error
  return new NextResponse(null, { status: 200 });
}
