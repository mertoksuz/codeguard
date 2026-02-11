import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class OCPRule implements IRule {
  readonly id = "OCP";
  readonly name = "Open/Closed Principle";
  readonly category = "solid";
  readonly description = "Open for extension, closed for modification";
  readonly defaultSeverity: Severity = "warning";
  readonly supportsAutoFix = true;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;
    const lines = content.split("\n");

    // Long switch statements (>5 cases)
    let switchStart = -1, caseCount = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.match(/^switch\s*\(/)) { switchStart = i + 1; caseCount = 0; }
      if (switchStart > 0 && line.match(/^case\s+/)) caseCount++;
      if (switchStart > 0 && line === "}") {
        if (caseCount > 5) {
          violations.push({ ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: switchStart,
            message: `Switch with ${caseCount} cases. Consider Strategy or Factory pattern.`,
            suggestion: "Replace with a handler map or polymorphism.", autoFixable: true });
        }
        switchStart = -1;
      }
    }

    // Multiple instanceof checks
    const instanceofMatches = content.match(/instanceof\s+\w+/g);
    if (instanceofMatches && instanceofMatches.length >= 3) {
      const lineNum = content.substring(0, content.indexOf("instanceof")).split("\n").length;
      violations.push({ ruleId: this.id, ruleName: this.name, severity: "warning", file: filename, line: lineNum,
        message: `${instanceofMatches.length} instanceof checks — fragile and violates OCP.`,
        suggestion: "Use polymorphism or Visitor pattern.", autoFixable: true });
    }

    return violations;
  }
}
