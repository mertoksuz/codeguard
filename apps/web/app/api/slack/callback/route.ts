import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@codeguard/db";

export const dynamic = "force-dynamic";

/**
 * GET /api/slack/callback
 * Slack redirects here after the user authorises the app.
 * We exchange the `code` for a bot token and persist it in SlackInstallation.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state"); // our internal teamId
  const error = searchParams.get("error");

  const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

  if (error) {
    console.error("[Slack Callback] OAuth error:", error);
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=slack_denied`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=missing_params`);
  }

  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error("[Slack Callback] SLACK_CLIENT_ID or SLACK_CLIENT_SECRET not set");
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=config`);
  }

  const redirectUri = `${baseUrl}/api/slack/callback`;

  try {
    // Exchange the authorization code for a token
    const tokenRes = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await tokenRes.json();
    console.log("[Slack Callback] Token response:", JSON.stringify({ ok: data.ok, team: data.team?.name, error: data.error }));

    if (!data.ok) {
      console.error("[Slack Callback] Slack API error:", data.error);
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=slack_api`);
    }

    // Extract the relevant data from Slack's response
    const botToken = data.access_token; // xoxb-...
    const botUserId = data.bot_user_id;
    const teamSlackId = data.team?.id;
    const teamSlackName = data.team?.name;
    const appId = data.app_id;
    const scope = data.scope;
    const installedBy = data.authed_user?.id;
    const incomingWebhook = data.incoming_webhook?.url || null;
    const defaultChannel = data.incoming_webhook?.channel_id || null;

    if (!botToken || !teamSlackId || !botUserId) {
      console.error("[Slack Callback] Missing required fields in response");
      return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=incomplete`);
    }

    // Upsert the Slack installation for this team
    await prisma.slackInstallation.upsert({
      where: { teamId: state },
      create: {
        teamId: state,
        teamSlackId,
        teamSlackName: teamSlackName || null,
        botToken,
        botUserId,
        appId: appId || null,
        channel: defaultChannel,
        scope: scope || null,
        installedBy: installedBy || null,
        incomingWebhook: incomingWebhook,
      },
      update: {
        teamSlackId,
        teamSlackName: teamSlackName || null,
        botToken,
        botUserId,
        appId: appId || null,
        channel: defaultChannel,
        scope: scope || null,
        installedBy: installedBy || null,
        incomingWebhook: incomingWebhook,
        updatedAt: new Date(),
      },
    });

    console.log(`[Slack Callback] ✅ Slack installed for team ${state} (workspace: ${teamSlackName})`);
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?success=slack`);
  } catch (err: any) {
    console.error("[Slack Callback] Error:", err.message);
    return NextResponse.redirect(`${baseUrl}/dashboard/integrations?error=server`);
  }
}
