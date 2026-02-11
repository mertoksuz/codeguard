import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class FileLengthRule implements IRule {
  readonly id = "FILE_LENGTH";
  readonly name = "File Length";
  readonly category = "clean-code";
  readonly description = "Keep files focused and within a reasonable length";
  readonly defaultSeverity: Severity = "warning";
  readonly supportsAutoFix = false;

  private readonly MAX_LINES = 300;
  private readonly MAX_FUNCTION_LINES = 50;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;

    const lines = content.split("\n");

    if (lines.length > this.MAX_LINES) {
      violations.push({ ruleId: this.id, ruleName: this.name, severity: this.defaultSeverity, file: filename, line: 1,
        message: `File has ${lines.length} lines (max: ${this.MAX_LINES}).`,
        suggestion: "Split the file into smaller, focused modules.", autoFixable: false });
    }

    // Check individual function lengths
    let funcStart = -1;
    let funcName = "";
    let braceDepth = 0;
    let inFunc = false;

    lines.forEach((line, idx) => {
      const funcMatch = line.match(/(?:function\s+(\w+)|(\w+)\s*(?:=|:)\s*(?:async\s*)?\()/);
      if (funcMatch && !inFunc) {
        funcName = funcMatch[1] || funcMatch[2] || "anonymous";
        funcStart = idx;
      }

      for (const ch of line) {
        if (ch === "{") { braceDepth++; if (!inFunc && funcStart >= 0) inFunc = true; }
        if (ch === "}") braceDepth--;
      }

      if (inFunc && braceDepth <= 0) {
        const funcLength = idx - funcStart + 1;
        if (funcLength > this.MAX_FUNCTION_LINES) {
          violations.push({ ruleId: this.id, ruleName: this.name, severity: "info", file: filename, line: funcStart + 1,
            message: `Function '${funcName}' is ${funcLength} lines long (max: ${this.MAX_FUNCTION_LINES}).`,
            suggestion: "Break down into smaller helper functions.", autoFixable: false });
        }
        inFunc = false;
        funcStart = -1;
        funcName = "";
      }
    });

    return violations;
  }
}
