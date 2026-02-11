export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const stats = [
  { label: "Total Reviews", value: "127", change: "+12%", icon: "🔍" },
  { label: "Issues Found", value: "843", change: "+8%", icon: "⚠️" },
  { label: "Issues Fixed", value: "721", change: "+15%", icon: "✅" },
  { label: "Avg. Score", value: "82", change: "+5pt", icon: "📊" },
];

const recentReviews = [
  { id: 1, repo: "acme/api", pr: "#142", title: "Add payment processing", status: "ANALYZED", issues: 3, score: 78 },
  { id: 2, repo: "acme/web", pr: "#89", title: "Refactor auth module", status: "FIXED", issues: 5, score: 92 },
  { id: 3, repo: "acme/api", pr: "#140", title: "User service updates", status: "ANALYZING", issues: 0, score: null },
  { id: 4, repo: "acme/mobile", pr: "#45", title: "Cart optimization", status: "ANALYZED", issues: 2, score: 85 },
];

const statusColor: Record<string, "brand" | "success" | "warning" | "info"> = {
  PENDING: "info",
  ANALYZING: "brand",
  ANALYZED: "warning",
  FIXED: "success",
};

export default function DashboardPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-surface-900">Dashboard</h1>
        <p className="text-surface-500 mt-1">Overview of your code quality metrics</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl">{s.icon}</div>
              <div>
                <div className="text-sm text-surface-500">{s.label}</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-extrabold text-surface-900">{s.value}</span>
                  <span className="text-xs font-medium text-green-600">{s.change}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Reviews */}
      <Card>
        <div className="p-6 pb-4 border-b border-surface-100">
          <h2 className="text-lg font-bold text-surface-900">Recent Reviews</h2>
        </div>
        <div className="divide-y divide-surface-100">
          {recentReviews.map((r) => (
            <div key={r.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div>
                  <div className="font-medium text-sm text-surface-900">{r.title}</div>
                  <div className="text-xs text-surface-400 mt-0.5">{r.repo} {r.pr}</div>
                </div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                {r.issues > 0 && <span className="text-sm text-surface-500">{r.issues} issues</span>}
                {r.score && (
                  <span className={`text-sm font-bold ${r.score >= 80 ? "text-green-600" : r.score >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {r.score}/100
                  </span>
                )}
                <Badge variant={statusColor[r.status] || "default"}>{r.status}</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
