import { PrismaClient, Plan, UserRole, MemberRole, Severity } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create demo user
  const user = await prisma.user.upsert({
    where: { email: "demo@codeguard.ai" },
    update: {},
    create: {
      name: "Demo User",
      email: "demo@codeguard.ai",
      role: UserRole.ADMIN,
    },
  });
  console.log("  ✅ Demo user created:", user.email);

  // Create demo team
  const team = await prisma.team.upsert({
    where: { slug: "demo-team" },
    update: {},
    create: {
      name: "Demo Team",
      slug: "demo-team",
      plan: Plan.PRO,
      members: {
        create: {
          userId: user.id,
          role: MemberRole.OWNER,
        },
      },
    },
  });
  console.log("  ✅ Demo team created:", team.slug);

  // Create demo repository
  const repo = await prisma.repository.upsert({
    where: { fullName_teamId: { fullName: "demo-org/demo-repo", teamId: team.id } },
    update: {},
    create: {
      name: "demo-repo",
      fullName: "demo-org/demo-repo",
      owner: "demo-org",
      url: "https://github.com/demo-org/demo-repo",
      teamId: team.id,
    },
  });
  console.log("  ✅ Demo repository created:", repo.fullName);

  // Create default rule configs
  const defaultRules = [
    { ruleId: "SRP", enabled: true, severity: Severity.WARNING },
    { ruleId: "OCP", enabled: true, severity: Severity.WARNING },
    { ruleId: "LSP", enabled: true, severity: Severity.WARNING },
    { ruleId: "ISP", enabled: true, severity: Severity.WARNING },
    { ruleId: "DIP", enabled: true, severity: Severity.WARNING },
    { ruleId: "NAMING", enabled: true, severity: Severity.INFO },
    { ruleId: "COMPLEXITY", enabled: true, severity: Severity.WARNING },
    { ruleId: "FILE_LENGTH", enabled: true, severity: Severity.WARNING },
    { ruleId: "IMPORT_ORG", enabled: true, severity: Severity.INFO },
  ];

  for (const rule of defaultRules) {
    await prisma.ruleConfig.upsert({
      where: { ruleId_teamId: { ruleId: rule.ruleId, teamId: team.id } },
      update: {},
      create: { ...rule, teamId: team.id },
    });
  }
  console.log("  ✅ Default rule configs created:", defaultRules.length, "rules");

  // Create a sample review
  const review = await prisma.review.create({
    data: {
      prNumber: 42,
      prTitle: "feat: add user authentication",
      prUrl: "https://github.com/demo-org/demo-repo/pull/42",
      branch: "feature/auth",
      status: "COMPLETED",
      totalIssues: 3,
      criticalCount: 0,
      warningCount: 2,
      infoCount: 1,
      analysisTime: 2450,
      repositoryId: repo.id,
      authorId: user.id,
      issues: {
        create: [
          {
            ruleId: "SRP",
            ruleName: "Single Responsibility Principle",
            severity: Severity.WARNING,
            file: "src/auth/AuthService.ts",
            line: 15,
            message: "Class 'AuthService' has 12 methods — consider splitting responsibilities.",
            suggestion: "Extract email-related logic into a separate EmailService.",
          },
          {
            ruleId: "COMPLEXITY",
            ruleName: "Cyclomatic Complexity",
            severity: Severity.WARNING,
            file: "src/auth/AuthService.ts",
            line: 45,
            message: "Function 'validateUser' has complexity of ~14 (max: 10).",
            suggestion: "Extract sub-functions or use early returns to reduce complexity.",
          },
          {
            ruleId: "NAMING",
            ruleName: "Naming Conventions",
            severity: Severity.INFO,
            file: "src/auth/utils.ts",
            line: 8,
            message: "Boolean 'valid' should use a prefix like is/has/can/should.",
            suggestion: "Rename to 'isValid' for clarity.",
          },
        ],
      },
    },
  });
  console.log("  ✅ Sample review created: PR #" + review.prNumber);

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Seed failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
