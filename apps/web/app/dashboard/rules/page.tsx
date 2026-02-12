export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { redirect } from "next/navigation";
import RulesClient from "./RulesClient";

// Built-in rules that every team gets
const BUILTIN_RULES = [
  { id: "SRP", name: "Single Responsibility", desc: "Each class/module should have one reason to change", group: "SOLID" },
  { id: "OCP", name: "Open/Closed", desc: "Open for extension, closed for modification", group: "SOLID" },
  { id: "LSP", name: "Liskov Substitution", desc: "Subtypes must be substitutable for base types", group: "SOLID" },
  { id: "ISP", name: "Interface Segregation", desc: "Don't force clients to depend on unused interfaces", group: "SOLID" },
  { id: "DIP", name: "Dependency Inversion", desc: "Depend on abstractions, not concretions", group: "SOLID" },
  { id: "NAMING", name: "Naming Conventions", desc: "Clear, descriptive, consistent naming", group: "Clean Code" },
  { id: "COMPLEXITY", name: "Code Complexity", desc: "Avoid deep nesting, long functions", group: "Clean Code" },
  { id: "FILE_LENGTH", name: "File Length", desc: "Keep files focused and reasonably sized", group: "Clean Code" },
  { id: "IMPORTS", name: "Import Organization", desc: "Clean, organized, shallow imports", group: "Clean Code" },
];

export default async function RulesPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const teamId = (session.user as any).teamId;

  const [ruleConfigs, customRules] = await Promise.all([
    teamId ? prisma.ruleConfig.findMany({ where: { teamId } }) : [],
    teamId ? prisma.customRule.findMany({ where: { teamId }, orderBy: { createdAt: "desc" } }) : [],
  ]);

  // Merge built-in rules with team config
  const configMap = Object.fromEntries(ruleConfigs.map((c) => [c.ruleId, c]));
  const builtinWithConfig = BUILTIN_RULES.map((r) => ({
    ...r,
    enabled: configMap[r.id]?.enabled ?? true,
    severity: configMap[r.id]?.severity || "WARNING",
  }));

  return (
    <RulesClient
      builtinRules={builtinWithConfig}
      customRules={customRules.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description || "",
        prompt: c.prompt,
        severity: c.severity,
        enabled: c.enabled,
      }))}
    />
  );
}
