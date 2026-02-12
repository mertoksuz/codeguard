export const dynamic = "force-dynamic";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { redirect, notFound } from "next/navigation";
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

const severityIcon: Record<string, string> = {
  ERROR: "🔴",
  WARNING: "🟠",
  INFO: "🔵",
};

export default async function ReviewDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const teamId = (session.user as any).teamId;
  if (!teamId) redirect("/dashboard");

  const review = await prisma.review.findFirst({
    where: { id: params.id, teamId },
    include: {
      repository: { select: { fullName: true } },
      issues: {
        orderBy: [{ severity: "asc" }, { file: "asc" }, { line: "asc" }],
      },
    },
  });

  if (!review) notFound();

  // Group issues by file
  const issuesByFile = review.issues.reduce<Record<string, typeof review.issues>>(
    (acc, issue) => {
      const key = issue.file || "unknown";
      if (!acc[key]) acc[key] = [];
      acc[key].push(issue);
      return acc;
    },
    {}
  );

  const fileNames = Object.keys(issuesByFile).sort();

  return (
    <div>
      {/* Back link + header */}
      <div className="mb-6">
        <Link
          href="/dashboard/reviews"
          className="text-sm text-surface-400 hover:text-surface-600 transition-colors"
        >
          ← Back to Reviews
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-surface-900">
              {review.prTitle}
            </h1>
            <div className="text-sm text-surface-400 mt-1">
              {review.repository.fullName} #{review.prNumber} · {review.branch} ·{" "}
              {new Date(review.createdAt).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div className="flex items-center gap-3">
            {review.score > 0 && (
              <span
                className={`text-2xl font-extrabold ${
                  review.score >= 80
                    ? "text-green-600"
                    : review.score >= 60
                    ? "text-amber-600"
                    : "text-red-600"
                }`}
              >
                {review.score}/100
              </span>
            )}
            <Badge variant={statusColor[review.status] || "info"}>
              {review.status}
            </Badge>
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 text-sm text-surface-500 mt-4">
          <span>🔴 {review.criticalCount} errors</span>
          <span>🟠 {review.warningCount} warnings</span>
          <span>🔵 {review.infoCount} info</span>
          <span>📝 {review.totalIssues} total issues</span>
          {review.analysisTime && (
            <span>⏱ {(review.analysisTime / 1000).toFixed(1)}s</span>
          )}
        </div>

        {/* Links */}
        <div className="flex gap-4 mt-4">
          <Link
            href={review.prUrl}
            target="_blank"
            className="text-sm text-brand-600 hover:text-brand-700 font-medium"
          >
            View PR on GitHub →
          </Link>
          {review.fixPrUrl && (
            <Link
              href={review.fixPrUrl}
              target="_blank"
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              🔧 Fix PR #{review.fixPrNumber} →
            </Link>
          )}
        </div>
      </div>

      {/* Issues grouped by file */}
      {review.issues.length === 0 ? (
        <Card>
          <div className="p-8 text-center text-surface-400">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-medium">No issues found</p>
            <p className="text-sm mt-1">This PR looks clean!</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          {fileNames.map((file) => (
            <Card key={file}>
              <div className="p-4">
                {/* File header */}
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-100">
                  <span className="text-sm">📄</span>
                  <span className="font-mono text-sm font-semibold text-surface-700">
                    {file}
                  </span>
                  <span className="text-xs text-surface-400">
                    ({issuesByFile[file].length} issue
                    {issuesByFile[file].length !== 1 ? "s" : ""})
                  </span>
                </div>

                {/* Issues list */}
                <div className="space-y-3">
                  {issuesByFile[file].map((issue) => (
                    <div
                      key={issue.id}
                      className="bg-surface-50 rounded-lg p-3"
                    >
                      <div className="flex items-start gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${
                            severityColor[issue.severity] || ""
                          }`}
                        >
                          {severityIcon[issue.severity] || "⚪"}{" "}
                          {issue.severity}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-surface-800">
                              {issue.ruleName}
                            </span>
                            <span className="text-xs text-surface-400 font-mono">
                              {issue.ruleId}
                            </span>
                            <span className="text-xs text-surface-400 ml-auto shrink-0">
                              Line {issue.line}
                            </span>
                          </div>
                          <p className="text-sm text-surface-600 mt-1">
                            {issue.message}
                          </p>
                          {issue.suggestion && (
                            <div className="mt-2 text-xs bg-brand-50 text-brand-700 rounded p-2">
                              💡 <strong>Suggestion:</strong>{" "}
                              {issue.suggestion}
                            </div>
                          )}
                          {issue.fixApplied && (
                            <div className="mt-1 text-xs text-green-600 font-medium">
                              ✅ Fix applied
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
