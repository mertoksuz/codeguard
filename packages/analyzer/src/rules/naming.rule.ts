import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class NamingRule implements IRule {
  readonly id = "NAMING";
  readonly name = "Naming Conventions";
  readonly category = "clean-code";
  readonly description = "Enforce clear and consistent naming conventions";
  readonly defaultSeverity: Severity = "info";
  readonly supportsAutoFix = true;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;

    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Single-letter variables (except common loop vars / destructuring)
      const varMatch = trimmed.match(/(?:const|let|var)\s+([a-zA-Z])\s*[=:]/);
      if (varMatch && !["i", "j", "k", "x", "y", "z", "_"].includes(varMatch[1])) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: idx + 1,
          message: `Single-letter variable '${varMatch[1]}' — use a descriptive name.`,
          suggestion: "Use a meaningful name that explains the variable's purpose.", autoFixable: false });
      }

      // Boolean vars should start with is/has/can/should/was
      const boolMatch = trimmed.match(/(?:const|let|var)\s+(\w+)\s*(?::\s*boolean\s*)?=\s*(true|false)/);
      if (boolMatch) {
        const name = boolMatch[1];
        if (!/^(is|has|can|should|was|will|did|allow|enable|disable)/.test(name)) {
          violations.push({ ruleId: this.id, ruleName: this.name, severity: "info", file: filename, line: idx + 1,
            message: `Boolean '${name}' should use a prefix like is/has/can/should.`,
            suggestion: `Rename to 'is${name.charAt(0).toUpperCase() + name.slice(1)}' or similar.`, autoFixable: true });
        }
      }

      // Functions/methods with too short names (<3 chars, excluding get/set/add)
      const funcMatch = trimmed.match(/(?:function|async\s+function)\s+(\w+)/);
      if (funcMatch && funcMatch[1].length < 3 && !["fn", "cb"].includes(funcMatch[1])) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: "info", file: filename, line: idx + 1,
          message: `Function '${funcMatch[1]}' has a very short name.`,
          suggestion: "Use a descriptive verb-noun name for functions.", autoFixable: false });
      }
    });

    return violations;
  }
}
