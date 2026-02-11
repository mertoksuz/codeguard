import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class ISPRule implements IRule {
  readonly id = "ISP";
  readonly name = "Interface Segregation Principle";
  readonly category = "solid";
  readonly description = "Don't force clients to depend on unused interfaces";
  readonly defaultSeverity: Severity = "warning";
  readonly supportsAutoFix = true;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx)$/)) return violations;

    const interfacePattern = /interface\s+(\w+)(?:\s+extends\s+[\w,\s<>]+)?\s*{([^}]*)}/gs;
    for (const match of content.matchAll(interfacePattern)) {
      const name = match[1];
      const body = match[2];
      const lineNum = content.substring(0, match.index).split("\n").length;
      const members = body.split("\n").filter((l) => l.trim().length > 0 && !l.trim().startsWith("//")).filter((l) => l.includes(":") || l.includes("("));

      if (members.length > 7) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: lineNum,
          message: `Interface '${name}' has ${members.length} members — too broad.`,
          suggestion: `Split '${name}' into smaller, role-specific interfaces.`, autoFixable: true });
      }
    }

    return violations;
  }
}
