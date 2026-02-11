import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class LSPRule implements IRule {
  readonly id = "LSP";
  readonly name = "Liskov Substitution Principle";
  readonly category = "solid";
  readonly description = "Subtypes must be substitutable for their base types";
  readonly defaultSeverity: Severity = "error";
  readonly supportsAutoFix = false;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;
    const lines = content.split("\n");

    const throwPatterns = [
      /throw\s+new\s+Error\(\s*["'`].*not\s+(implemented|supported)/i,
      /throw\s+new\s+(?:NotImplemented|UnsupportedOperation)Error/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      for (const pattern of throwPatterns) {
        if (pattern.test(lines[i])) {
          violations.push({ ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: i + 1,
            message: `"Not implemented" throw detected — violates LSP.`,
            suggestion: "Implement the method fully or split the interface.", autoFixable: false });
          break;
        }
      }

      // Empty override
      if (lines[i].trim().match(/override\s+\w+\s*\([^)]*\)\s*{\s*}\s*$/)) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: "warning", file: filename, line: i + 1,
          message: `Empty override — subtype doesn't support this behavior.`,
          suggestion: "Consider splitting the interface or using composition.", autoFixable: false });
      }
    }

    return violations;
  }
}
