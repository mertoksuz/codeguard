import { NextRequest, NextResponse } from "next/server";

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
        // Queue analysis job
      }
    }
  }

  return NextResponse.json({ ok: true });
}
