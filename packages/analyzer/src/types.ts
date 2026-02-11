export type Severity = "error" | "warning" | "info";
export type RuleCategory = "solid" | "clean-code" | "architecture" | "custom";

export interface IRule {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly description: string;
  readonly defaultSeverity: Severity;
  readonly supportsAutoFix: boolean;
  analyze(context: AnalysisContext): Promise<RuleViolation[]>;
}

export interface AnalysisContext {
  filename: string;
  content: string;
  language: string;
  diff?: string;
}

export interface RuleViolation {
  ruleId: string;
  ruleName: string;
  severity: Severity;
  file: string;
  line: number;
  message: string;
  suggestion?: string;
  autoFixable: boolean;
}

export interface RuleResult {
  ruleId: string;
  violations: RuleViolation[];
  executionTimeMs: number;
}

export interface AnalysisSummary {
  totalFiles: number;
  totalViolations: number;
  criticalCount: number;
  warningCount: number;
  infoCount: number;
  rules: RuleResult[];
  executionTimeMs: number;
}

export interface RuleConfig {
  ruleId: string;
  enabled: boolean;
  severity?: Severity;
  options?: Record<string, unknown>;
}
