import type { IRule, AnalysisContext, RuleViolation, Severity } from "../types";

export class ImportOrganizationRule implements IRule {
  readonly id = "IMPORT_ORG";
  readonly name = "Import Organization";
  readonly category = "clean-code";
  readonly description = "Keep imports organized and grouped";
  readonly defaultSeverity: Severity = "info";
  readonly supportsAutoFix = true;

  async analyze(context: AnalysisContext): Promise<RuleViolation[]> {
    const violations: RuleViolation[] = [];
    const { content, filename } = context;
    if (!filename.match(/\.(ts|tsx|js|jsx)$/)) return violations;

    const lines = content.split("\n");
    const importLines: { line: number; text: string; source: string }[] = [];

    lines.forEach((line, idx) => {
      const importMatch = line.match(/^import\s+.*from\s+['"]([^'"]+)['"]/);
      if (importMatch) {
        importLines.push({ line: idx + 1, text: line.trim(), source: importMatch[1] });
      }
    });

    if (importLines.length === 0) return violations;

    // Check for duplicate import sources
    const sourceMap = new Map<string, number[]>();
    importLines.forEach((imp) => {
      const existing = sourceMap.get(imp.source) || [];
      existing.push(imp.line);
      sourceMap.set(imp.source, existing);
    });

    sourceMap.forEach((lineNums, source) => {
      if (lineNums.length > 1) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: "warning", file: filename, line: lineNums[1],
          message: `Duplicate import from '${source}' (also at line ${lineNums[0]}).`,
          suggestion: "Merge into a single import statement.", autoFixable: true });
      }
    });

    // Check grouping: node_modules → absolute → relative
    let lastGroup = 0; // 0: none, 1: external, 2: absolute, 3: relative
    let hadBlankBetweenGroups = true;

    for (let i = 0; i < importLines.length; i++) {
      const imp = importLines[i];
      let group: number;
      if (imp.source.startsWith(".")) group = 3;
      else if (imp.source.startsWith("@/") || imp.source.startsWith("~/")) group = 2;
      else group = 1;

      if (group < lastGroup) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: "info", file: filename, line: imp.line,
          message: "Import order: external packages → aliases → relative imports.",
          suggestion: "Reorder imports: 1) external packages, 2) alias paths (@/), 3) relative paths (./)", autoFixable: true });
        break;
      }
      lastGroup = group;
    }

    // Wildcard imports
    importLines.forEach((imp) => {
      if (imp.text.includes("* as")) {
        violations.push({ ruleId: this.id, ruleName: this.name, severity: "info", file: filename, line: imp.line,
          message: `Wildcard import from '${imp.source}' — prefer named imports.`,
          suggestion: "Use named imports for better tree-shaking and clarity.", autoFixable: true });
      }
    });

    return violations;
  }
}
