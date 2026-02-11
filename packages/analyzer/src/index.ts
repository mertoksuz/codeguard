// SOLID Rules
export { SRPRule } from "./rules/srp.rule";
export { OCPRule } from "./rules/ocp.rule";
export { LSPRule } from "./rules/lsp.rule";
export { ISPRule } from "./rules/isp.rule";
export { DIPRule } from "./rules/dip.rule";

// Clean Code Rules
export { NamingRule } from "./rules/naming.rule";
export { ComplexityRule } from "./rules/complexity.rule";
export { FileLengthRule } from "./rules/file-length.rule";
export { ImportOrganizationRule } from "./rules/import-organization.rule";

// Engine & Types
export { AnalysisEngine } from "./engine";
export type {
  IRule,
  AnalysisContext,
  RuleViolation,
  RuleResult,
  AnalysisSummary,
  RuleConfig,
  Severity,
} from "./types";

// Factory
import { AnalysisEngine } from "./engine";
import { SRPRule } from "./rules/srp.rule";
import { OCPRule } from "./rules/ocp.rule";
import { LSPRule } from "./rules/lsp.rule";
import { ISPRule } from "./rules/isp.rule";
import { DIPRule } from "./rules/dip.rule";
import { NamingRule } from "./rules/naming.rule";
import { ComplexityRule } from "./rules/complexity.rule";
import { FileLengthRule } from "./rules/file-length.rule";
import { ImportOrganizationRule } from "./rules/import-organization.rule";

export function createDefaultEngine(): AnalysisEngine {
  const engine = new AnalysisEngine();

  // Register SOLID rules
  engine.registerRule(new SRPRule());
  engine.registerRule(new OCPRule());
  engine.registerRule(new LSPRule());
  engine.registerRule(new ISPRule());
  engine.registerRule(new DIPRule());

  // Register Clean Code rules
  engine.registerRule(new NamingRule());
  engine.registerRule(new ComplexityRule());
  engine.registerRule(new FileLengthRule());
  engine.registerRule(new ImportOrganizationRule());

  return engine;
}
