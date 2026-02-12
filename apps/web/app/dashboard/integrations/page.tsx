export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { redirect } from "next/navigation";

export default async function IntegrationsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const teamId = (session.user as any).teamId;

  // Check what's connected
  const [githubInstall, slackInstall] = await Promise.all([
    teamId ? prisma.gitHubInstallation.findUnique({ where: { teamId } }) : null,
    teamId ? prisma.slackInstallation.findUnique({ where: { teamId } }) : null,
  ]);

  const integrations = [
    {
      name: "GitHub",
      desc: "Auto-analyze PRs and create fix branches",
      icon: "🐙",
      connected: !!githubInstall?.accessToken,
      detail: githubInstall ? `@${githubInstall.accountLogin}` : null,
    },
    {
      name: "Slack",
      desc: "Receive analysis results and trigger reviews from Slack",
      icon: "💬",
      connected: !!slackInstall?.botToken,
      detail: slackInstall?.channel ? `#${slackInstall.channel}` : null,
    },
    {
      name: "GitLab",
      desc: "Connect GitLab repositories for PR analysis",
      icon: "🦊",
      connected: false,
      detail: null,
      comingSoon: true,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-surface-900">Integrations</h1>
        <p className="text-surface-500 mt-1">Connect your tools for seamless workflow</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {integrations.map((int) => (
          <Card key={int.name}>
            <CardContent className="text-center">
              <div className="text-4xl mb-3">{int.icon}</div>
              <h3 className="text-lg font-bold text-surface-900">{int.name}</h3>
              <p className="text-sm text-surface-500 mt-1 mb-4">{int.desc}</p>

              {int.connected && int.detail && (
                <p className="text-xs text-brand-500 font-medium mb-3">{int.detail}</p>
              )}

              {int.comingSoon ? (
                <Button variant="secondary" size="sm" className="w-full" disabled>
                  Coming Soon
                </Button>
              ) : int.connected ? (
                <Button variant="secondary" size="sm" className="w-full">
                  Connected ✓
                </Button>
              ) : int.name === "GitHub" ? (
                <p className="text-xs text-surface-400">
                  Signs in with your GitHub account automatically
                </p>
              ) : (
                <Button variant="primary" size="sm" className="w-full">
                  Connect
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
