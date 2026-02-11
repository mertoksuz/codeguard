import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "";

export async function POST(req: NextRequest) {
  const body = await req.json();

  console.log("[Slack Event] Received:", body.type, body.event?.type || "");

  // Slack URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle events — respond to Slack IMMEDIATELY, then process
  if (body.type === "event_callback") {
    const event = body.event;

    console.log("[Slack Event] Event detail:", JSON.stringify({ type: event.type, subtype: event.subtype, bot_id: event.bot_id, text: event.text?.substring(0, 200) }));

    // Only process original messages — ignore message_changed, message_deleted, etc.
    // This prevents duplicate analysis when Slack unfurls a GitHub link.
    if (event.type === "message" && !event.bot_id && !event.subtype) {
      // Slack wraps URLs in <>, so match both formats
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

        // Fire-and-forget: don't await so we respond to Slack within 3s
        fetch(`${API_URL}/api/reviews/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            repositoryFullName: repo,
            prNumber: parseInt(prNumber, 10),
            slackChannel: String(event.channel),
            slackThreadTs: String(event.ts),
          }),
        })
          .then((res) => console.log(`[Slack Event] API responded: ${res.status}`))
          .catch((err) => console.error("[Slack Event] Failed to call API:", err.message));
      } else {
        console.log("[Slack Event] Message received but no PR link found in:", event.text?.substring(0, 100));
      }
    }
  }

  return NextResponse.json({ ok: true });
}
