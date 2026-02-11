import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const signature = req.headers.get("x-hub-signature-256") || "";
  const body = await req.text();

  // Verify signature
  const secret = process.env.GITHUB_WEBHOOK_SECRET || "";
  const expected = "sha256=" + crypto.createHmac("sha256", secret).update(body).digest("hex");

  if (signature !== expected) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = req.headers.get("x-github-event");
  const payload = JSON.parse(body);

  if (event === "pull_request" && ["opened", "synchronize"].includes(payload.action)) {
    console.log(`PR ${payload.action}: ${payload.repository.full_name}#${payload.pull_request.number}`);
    // Queue analysis job
  }

  return NextResponse.json({ ok: true });
}
