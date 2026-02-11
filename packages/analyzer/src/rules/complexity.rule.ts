import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class ComplexityRule implements IRule {
  readonly id = "COMPLEXITY";
  readonly name = "Cyclomatic Complexity";
  readonly category = "clean-code";
  readonly description = "Keep functions simple with low cyclomatic complexity";
  readonly defaultSeverity: Severity = "warning";
  readonly supportsAutoFix = true;

  private readonly MAX_COMPLEXITY = 10;
  private readonly MAX_NESTING = 4;
  private readonly MAX_PARAMS = 4;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;

    const funcPattern = /(?:function\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:async\s*)?\([^)]*\)\s*(?:=>|{)|(\w+)\s*\([^)]*\)\s*{)/g;
    const lines = content.split("\n");

    for (const match of content.matchAll(funcPattern)) {
      const name = match[1] || match[2] || match[3] || "anonymous";
      const startIdx = content.substring(0, match.index).split("\n").length;

      // Count complexity indicators in function body (simple heuristic)
      let braceDepth = 0;
      let maxNesting = 0;
      let complexity = 1;
      let inFunc = false;
      let funcEnd = startIdx;

      for (let i = startIdx - 1; i < lines.length; i++) {
        const line = lines[i];
        if (!inFunc && line.includes("{")) inFunc = true;
        if (!inFunc) continue;

        for (const ch of line) {
          if (ch === "{") { braceDepth++; maxNesting = Math.max(maxNesting, braceDepth); }
          if (ch === "}") braceDepth--;
        }

        // Count branching keywords
        const branchKeywords = line.match(/\b(if|else if|for|while|switch|case|catch|\?\?|&&|\|\||\?)\b/g);
        if (branchKeywords) complexity += branchKeywords.length;

        if (braceDepth <= 0 && inFunc) { funcEnd = i + 1; break; }
      }

      if (complexity > this.MAX_COMPLEXITY) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: startIdx,
          message: `Function '${name}' has complexity of ~${complexity} (max: ${this.MAX_COMPLEXITY}).`,
          suggestion: "Extract sub-functions or use early returns to reduce complexity.", autoFixable: true });
      }

      if (maxNesting > this.MAX_NESTING) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: "warning", file: filename, line: startIdx,
          message: `Function '${name}' has nesting depth of ${maxNesting} (max: ${this.MAX_NESTING}).`,
          suggestion: "Flatten nesting with guard clauses or extract inner logic.", autoFixable: true });
      }
    }

    // Check function parameter count
    const paramPattern = /(?:function\s+\w+|\w+\s*(?:=|:)\s*(?:async\s*)?)\(([^)]*)\)/g;
    for (const match of content.matchAll(paramPattern)) {
      const params = match[1].split(",").filter((p) => p.trim().length > 0);
      if (params.length > this.MAX_PARAMS) {
        const lineNum = content.substring(0, match.index).split("\n").length;
        violations.push({ ruleId: this.id, ruleName: this.name, severity: "info", file: filename, line: lineNum,
          message: `Function has ${params.length} parameters (max: ${this.MAX_PARAMS}).`,
          suggestion: "Use an options/config object to group related parameters.", autoFixable: true });
      }
    }

    return violations;
  }
}
