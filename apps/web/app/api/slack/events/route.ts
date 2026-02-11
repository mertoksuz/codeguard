import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Slack URL verification challenge
  if (body.type === "url_verification") {
    return NextResponse.json({ challenge: body.challenge });
  }

  // Handle events
  if (body.type === "event_callback") {
    const event = body.event;

    if (event.type === "message" && !event.bot_id) {
      const prRegex = /github\.com\/([^/]+\/[^/]+)\/pull\/(\d+)/;
      const match = event.text?.match(prRegex);

      if (match) {
        const [, repo, prNumber] = match;
        console.log(`PR detected: ${repo}#${prNumber} in channel ${event.channel}`);

        // Call the API to queue analysis
        try {
          await fetch(`${API_URL}/api/reviews/analyze`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              repositoryFullName: repo,
              prNumber: parseInt(prNumber, 10),
              slackChannel: event.channel,
              slackThreadTs: event.ts,
            }),
          });
        } catch (err) {
          console.error("Failed to queue analysis:", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}
