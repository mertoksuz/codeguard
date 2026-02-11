import type { IRule, AnalysisContext, RuleResult, AnalysisSummary, RuleConfig } from "./types";

export class AnalysisEngine {
  private rules: Map<string, IRule> = new Map();
  private config: Map<string, RuleConfig> = new Map();

  registerRule(rule: IRule) {
    this.rules.set(rule.id, rule);
  }

  configureRule(config: RuleConfig) {
    this.config.set(config.ruleId, config);
  }

  async analyzeFile(context: AnalysisContext): Promise<RuleResult[]> {
    const results: RuleResult[] = [];

    for (const [id, rule] of this.rules) {
      const cfg = this.config.get(id);
      if (cfg && !cfg.enabled) continue;

      const start = Date.now();
      try {
        const violations = await rule.analyze(context);
        results.push({ ruleId: id, violations, executionTimeMs: Date.now() - start });
      } catch (err) {
        console.error(`Rule ${id} failed:`, err);
        results.push({ ruleId: id, violations: [], executionTimeMs: Date.now() - start });
      }
    }

    return results;
  }

  async analyzeFiles(files: AnalysisContext[]): Promise<AnalysisSummary> {
    const start = Date.now();
    const allResults: RuleResult[] = [];

    for (const file of files) {
      const fileResults = await this.analyzeFile(file);
      for (const result of fileResults) {
        const existing = allResults.find((r) => r.ruleId === result.ruleId);
        if (existing) {
          existing.violations.push(...result.violations);
          existing.executionTimeMs += result.executionTimeMs;
        } else {
          allResults.push({ ...result });
        }
      }
    }

    const allViolations = allResults.flatMap((r) => r.violations);

    return {
      totalFiles: files.length,
      totalViolations: allViolations.length,
      criticalCount: allViolations.filter((v) => v.severity === "error").length,
      warningCount: allViolations.filter((v) => v.severity === "warning").length,
      infoCount: allViolations.filter((v) => v.severity === "info").length,
      rules: allResults,
      executionTimeMs: Date.now() - start,
    };
  }
}
