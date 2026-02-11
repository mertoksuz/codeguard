import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

const integrations = [
  { name: "Slack", desc: "Receive analysis results and trigger reviews from Slack", icon: "💬", connected: false },
  { name: "GitHub", desc: "Auto-analyze PRs and create fix branches", icon: "🐙", connected: false },
  { name: "GitLab", desc: "Connect GitLab repositories for PR analysis", icon: "🦊", connected: false },
];

export default function IntegrationsPage() {
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
              <Button variant={int.connected ? "secondary" : "primary"} size="sm" className="w-full">
                {int.connected ? "Connected ✓" : "Connect"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
