import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class DIPRule implements IRule {
  readonly id = "DIP";
  readonly name = "Dependency Inversion Principle";
  readonly category = "solid";
  readonly description = "Depend on abstractions, not concretions";
  readonly defaultSeverity: Severity = "warning";
  readonly supportsAutoFix = true;

  private readonly servicePatterns = [
    /Service|Repository|Handler|Manager|Controller|Provider|Gateway|Adapter|Client/,
  ];

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;

    const lines = content.split("\n");

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Detect direct instantiation of service-like classes inside other classes/functions
      const newMatch = trimmed.match(/new\s+(\w+)\s*\(/);
      if (newMatch) {
        const className = newMatch[1];
        if (this.servicePatterns.some((p) => p.test(className))) {
          violations.push({ ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: idx + 1,
            message: `Direct instantiation of '${className}' creates tight coupling.`,
            suggestion: `Inject '${className}' through the constructor using an interface/abstraction.`, autoFixable: true });
        }
      }

      // Detect concrete types in constructor params (no interface prefix)
      const ctorParamMatch = trimmed.match(/constructor\s*\(([^)]+)\)/);
      if (ctorParamMatch) {
        const params = ctorParamMatch[1].split(",");
        params.forEach((param) => {
          const typeMatch = param.match(/:\s*(\w+)/);
          if (typeMatch) {
            const typeName = typeMatch[1];
            if (this.servicePatterns.some((p) => p.test(typeName)) && !typeName.startsWith("I") && !typeName.startsWith("Abstract")) {
              violations.push({ ruleId: this.id, ruleName: this.name, severity: "info", file: filename, line: idx + 1,
                message: `Constructor depends on concrete type '${typeName}'.`,
                suggestion: `Use an interface (e.g., 'I${typeName}') instead for loose coupling.`, autoFixable: true });
            }
          }
        });
      }
    });

    return violations;
  }
}
