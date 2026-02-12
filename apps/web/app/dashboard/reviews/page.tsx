export const dynamic = "force-dynamic";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { redirect } from "next/navigation";
import Link from "next/link";

const statusColor: Record<string, "brand" | "success" | "warning" | "info"> = {
  PENDING: "info",
  ANALYZING: "brand",
  COMPLETED: "warning",
  FIXING: "brand",
  FIXED: "success",
  FAILED: "info",
};

const severityColor: Record<string, string> = {
  ERROR: "text-red-600 bg-red-50",
  WARNING: "text-amber-600 bg-amber-50",
  INFO: "text-blue-600 bg-blue-50",
};

export default async function ReviewsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const teamId = (session.user as any).teamId;

  const reviews = teamId
    ? await prisma.review.findMany({
        where: { teamId },
        orderBy: { createdAt: "desc" },
        take: 50,
        include: {
          repository: { select: { fullName: true } },
          _count: { select: { issues: true } },
          issues: {
            take: 5,
            orderBy: { severity: "asc" },
            select: { id: true, ruleName: true, severity: true, message: true, file: true, line: true },
          },
        },
      })
    : [];

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900">Reviews</h1>
          <p className="text-surface-500 mt-1">All your PR analysis results</p>
        </div>
      </div>

      {reviews.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-surface-400">
            <div className="text-4xl mb-3">🔍</div>
            <p className="font-medium">No reviews yet</p>
            <p className="text-sm mt-1">
              Share a PR link in Slack or connect GitHub webhooks to get started
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <Link
                      href={`/dashboard/reviews/${r.id}`}
                      className="font-semibold text-surface-900 hover:text-brand-600 transition-colors"
                    >
                      {r.prTitle}
                    </Link>
                    <div className="text-xs text-surface-400 mt-0.5">
                      {r.repository.fullName} #{r.prNumber} · {r.branch} ·{" "}
                      {new Date(r.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.score > 0 && (
                      <span
                        className={`text-lg font-extrabold ${
                          r.score >= 80
                            ? "text-green-600"
                            : r.score >= 60
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {r.score}/100
                      </span>
                    )}
                    <Badge variant={statusColor[r.status] || "default"}>{r.status}</Badge>
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-4 text-xs text-surface-500 mb-3">
                  <span>🔴 {r.criticalCount} errors</span>
                  <span>🟠 {r.warningCount} warnings</span>
                  <span>🔵 {r.infoCount} info</span>
                  {r.analysisTime && <span>⏱ {(r.analysisTime / 1000).toFixed(1)}s</span>}
                </div>

                {/* Top issues preview */}
                {r.issues.length > 0 && (
                  <div className="bg-surface-50 rounded-xl p-3 space-y-2">
                    {r.issues.map((issue) => (
                      <div key={issue.id} className="flex items-start gap-2 text-xs">
                        <span
                          className={`px-1.5 py-0.5 rounded font-medium shrink-0 ${
                            severityColor[issue.severity] || ""
                          }`}
                        >
                          {issue.severity}
                        </span>
                        <span className="text-surface-600">
                          <strong>{issue.ruleName}</strong> — {issue.message}
                        </span>
                        <span className="text-surface-400 ml-auto shrink-0">
                          {issue.file}:{issue.line}
                        </span>
                      </div>
                    ))}
                    {r._count.issues > 5 && (
                      <Link
                        href={`/dashboard/reviews/${r.id}`}
                        className="text-xs text-brand-600 hover:text-brand-700 font-medium pt-1 inline-block"
                      >
                        +{r._count.issues - 5} more issues →
                      </Link>
                    )}
                  </div>
                )}

                {/* Fix PR link */}
                {r.fixPrUrl && (
                  <div className="mt-3 pt-3 border-t border-surface-100">
                    <Link
                      href={r.fixPrUrl}
                      target="_blank"
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                    >
                      🔧 Fix PR #{r.fixPrNumber} →
                    </Link>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
