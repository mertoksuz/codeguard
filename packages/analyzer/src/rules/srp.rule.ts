import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class SRPRule implements IRule {
  readonly id = "SRP";
  readonly name = "Single Responsibility Principle";
  readonly category = "solid";
  readonly description = "A class should have only one reason to change";
  readonly defaultSeverity: Severity = "error";
  readonly supportsAutoFix = true;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;

    const classPattern = /class\s+(\w+)/g;
    for (const match of content.matchAll(classPattern)) {
      const className = match[1];
      const classStart = match.index!;
      const lineNum = content.substring(0, classStart).split("\n").length;

      // Count methods
      const classBody = this.extractClassBody(content, classStart);
      const methods = classBody.match(/(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*[\w<>\[\]|&]+)?\s*{/g) || [];

      if (methods.length > 10) {
        violations.push({
          ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: lineNum,
          message: `Class '${className}' has ${methods.length} methods — likely too many responsibilities.`,
          suggestion: `Split '${className}' into smaller, focused classes.`, autoFixable: true,
        });
      }

      // Detect mixed concerns
      const concerns = new Set<string>();
      const keywords: Record<string, string[]> = {
        database: ["query", "insert", "update", "delete", "findOne", "findMany", "prisma", "sql", "repository"],
        http: ["request", "response", "fetch", "axios", "get", "post", "put", "endpoint"],
        email: ["sendEmail", "mailer", "smtp", "template"],
        auth: ["authenticate", "authorize", "token", "password", "session"],
      };

      for (const [concern, kws] of Object.entries(keywords)) {
        if (kws.some((kw) => classBody.toLowerCase().includes(kw.toLowerCase()))) {
          concerns.add(concern);
        }
      }

      if (concerns.size >= 3) {
        violations.push({
          ruleId: this.id, ruleName: this.name, severity: "warning", file: filename, line: lineNum,
          message: `Class '${className}' mixes concerns: ${[...concerns].join(", ")}.`,
          suggestion: `Separate into dedicated classes for each concern.`, autoFixable: true,
        });
      }
    }

    return violations;
  }

  private extractClassBody(content: string, start: number): string {
    let braces = 0; let inClass = false;
    for (let i = start; i < content.length; i++) {
      if (content[i] === "{") { braces++; inClass = true; }
      else if (content[i] === "}") { braces--; if (inClass && braces === 0) return content.substring(start, i + 1); }
    }
    return content.substring(start);
  }
}
