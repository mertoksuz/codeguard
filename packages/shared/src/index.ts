// ─── Review Types ──────────────────────────────────

export type ReviewStatus =
  | "PENDING"
  | "ANALYZING"
  | "COMPLETED"
  | "FIXING"
  | "FIXED"
  | "FAILED";

export type IssueSeverity = "ERROR" | "WARNING" | "INFO";

export interface AnalysisIssue {
  ruleId: string;
  ruleName: string;
  severity: IssueSeverity;
  file: string;
  line: number;
  message: string;
  suggestion?: string;
  autoFixable?: boolean;
  fixCode?: string;
}

export interface AnalysisResult {
  prNumber: number;
  prTitle: string;
  prUrl: string;
  branch: string;
  repository: string;
  status: ReviewStatus;
  issues: AnalysisIssue[];
  summary: AnalysisSummaryDTO;
  analysisTime: number; // ms
}

export interface AnalysisSummaryDTO {
  totalIssues: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  passedRules: string[];
  failedRules: string[];
}

// ─── API Request / Response Types ──────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AnalyzeRequest {
  prUrl: string;
  repositoryId: string;
  slackChannel?: string;
  slackTs?: string;
}

export interface FixRequest {
  reviewId: string;
  issueIds?: string[]; // Fix specific issues; empty = fix all
}

export interface RuleConfigUpdate {
  ruleId: string;
  enabled?: boolean;
  severity?: IssueSeverity;
}

// ─── Job Types ─────────────────────────────────────

export interface AnalysisJobPayload {
  reviewId: string;
  prNumber: number;
  prUrl: string;
  repositoryFullName: string;
  branch: string;
  teamId: string;
  slackChannel?: string;
  slackTs?: string;
}

export interface FixJobPayload {
  reviewId: string;
  repositoryFullName: string;
  branch: string;
  teamId: string;
  issueIds?: string[];
  slackChannel?: string;
  slackTs?: string;
}

// ─── Slack Types ───────────────────────────────────

export interface SlackPREvent {
  teamId: string;
  channelId: string;
  userId: string;
  messageTs: string;
  prUrl: string;
}

// ─── GitHub Types ──────────────────────────────────

export interface PRInfo {
  number: number;
  title: string;
  url: string;
  branch: string;
  baseBranch: string;
  owner: string;
  repo: string;
}

export interface PRFile {
  filename: string;
  status: "added" | "modified" | "removed" | "renamed";
  additions: number;
  deletions: number;
  patch?: string;
}

// ─── Dashboard Types ───────────────────────────────

export interface DashboardStats {
  totalReviews: number;
  totalIssuesFound: number;
  totalFixesApplied: number;
  avgAnalysisTime: number; // ms
  topViolations: { ruleId: string; ruleName: string; count: number }[];
}

export interface TeamUsage {
  reviewsThisMonth: number;
  reviewsLimit: number;
  fixesThisMonth: number;
  storageUsedMb: number;
}

// ─── Constants ─────────────────────────────────────

export const PLAN_LIMITS = {
  FREE: { reviewsPerMonth: 50, repos: 3, members: 5 },
  PRO: { reviewsPerMonth: 500, repos: 25, members: 25 },
  ENTERPRISE: { reviewsPerMonth: -1, repos: -1, members: -1 }, // unlimited
} as const;

export const QUEUE_NAMES = {
  ANALYSIS: "analysis-queue",
  FIX: "fix-queue",
} as const;

export const SEVERITY_ORDER: Record<IssueSeverity, number> = {
  ERROR: 0,
  WARNING: 1,
  INFO: 2,
};
