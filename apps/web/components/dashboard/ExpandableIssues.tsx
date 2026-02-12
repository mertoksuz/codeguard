"use client";

import { useState } from "react";
import Link from "next/link";

const severityColor: Record<string, string> = {
  ERROR: "text-red-600 bg-red-50",
  WARNING: "text-amber-600 bg-amber-50",
  INFO: "text-blue-600 bg-blue-50",
};

type Issue = {
  id: string;
  ruleName: string;
  severity: string;
  message: string;
  file: string;
  line: number;
};

export function ExpandableIssues({
  issues,
  totalCount,
  reviewId,
}: {
  issues: Issue[];
  totalCount: number;
  reviewId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const visibleIssues = expanded ? issues : issues.slice(0, 5);
  const hiddenCount = totalCount - 5;

  return (
    <div className="bg-surface-50 rounded-xl p-3 space-y-2">
      {visibleIssues.map((issue) => (
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

      {hiddenCount > 0 && (
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                expanded ? "rotate-180" : ""
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
            {expanded ? "Show less" : `+${hiddenCount} more issues`}
          </button>
          <span className="text-surface-300">·</span>
          <Link
            href={`/dashboard/reviews/${reviewId}`}
            className="text-xs text-surface-400 hover:text-brand-600 font-medium transition-colors"
          >
            View full report →
          </Link>
        </div>
      )}
    </div>
  );
}
