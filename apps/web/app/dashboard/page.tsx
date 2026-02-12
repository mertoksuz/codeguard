export const dynamic = "force-dynamic";

import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { redirect } from "next/navigation";

const statusColor: Record<string, "brand" | "success" | "warning" | "info"> = {
  PENDING: "info",
  ANALYZING: "brand",
  COMPLETED: "warning",
  FIXING: "brand",
  FIXED: "success",
  FAILED: "info",
};

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const teamId = (session.user as any).teamId;

  // Fetch real stats
  const [totalReviews, totalIssues, fixedReviews, avgScoreResult, recentReviews] = await Promise.all([
    teamId ? prisma.review.count({ where: { teamId } }) : 0,
    teamId
      ? prisma.issue.count({
          where: { review: { teamId } },
        })
      : 0,
    teamId ? prisma.review.count({ where: { teamId, status: "FIXED" } }) : 0,
    teamId
      ? prisma.review.aggregate({
          where: { teamId, score: { gt: 0 } },
          _avg: { score: true },
        })
      : { _avg: { score: null } },
    teamId
      ? prisma.review.findMany({
          where: { teamId },
          orderBy: { createdAt: "desc" },
          take: 10,
          include: {
            repository: { select: { fullName: true } },
            _count: { select: { issues: true } },
          },
        })
      : [],
  ]);

  const avgScore = Math.round(avgScoreResult._avg?.score || 0);

  const stats = [
    { label: "Total Reviews", value: totalReviews.toString(), icon: "🔍" },
    { label: "Issues Found", value: totalIssues.toString(), icon: "⚠️" },
    { label: "PRs Fixed", value: fixedReviews.toString(), icon: "✅" },
    { label: "Avg. Score", value: avgScore > 0 ? avgScore.toString() : "—", icon: "📊" },
  ];

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
        {recentReviews.length === 0 ? (
          <div className="p-8 text-center text-surface-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm mt-1">Share a PR link in Slack to trigger your first analysis</p>
          </div>
        ) : (
          <div className="divide-y divide-surface-100">
            {recentReviews.map((r) => (
              <div key={r.id} className="px-6 py-4 flex items-center justify-between hover:bg-surface-50 transition-colors">
                <div className="flex items-center gap-4 min-w-0">
                  <div>
                    <div className="font-medium text-sm text-surface-900">{r.prTitle}</div>
                    <div className="text-xs text-surface-400 mt-0.5">
                      {r.repository.fullName} #{r.prNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  {r._count.issues > 0 && (
                    <span className="text-sm text-surface-500">{r._count.issues} issues</span>
                  )}
                  {r.score > 0 && (
                    <span
                      className={`text-sm font-bold ${
                        r.score >= 80 ? "text-green-600" : r.score >= 60 ? "text-amber-600" : "text-red-600"
                      }`}
                    >
                      {r.score}/100
                    </span>
                  )}
                  <Badge variant={statusColor[r.status] || "default"}>{r.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
