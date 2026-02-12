import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { PLANS, type PlanKey } from "@/lib/iyzico";

export const dynamic = "force-dynamic";

// GET /api/rules — fetch rule configs + custom rules for the team
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const [ruleConfigs, customRules] = await Promise.all([
    prisma.ruleConfig.findMany({ where: { teamId } }),
    prisma.customRule.findMany({ where: { teamId }, orderBy: { createdAt: "desc" } }),
  ]);

  return NextResponse.json({ ruleConfigs, customRules });
}

// POST /api/rules — save a built-in rule toggle or create/update a custom rule
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const body = await req.json();

  // Toggle built-in rule
  if (body.action === "toggle") {
    const { ruleId, enabled, severity } = body;
    const config = await prisma.ruleConfig.upsert({
      where: { ruleId_teamId: { ruleId, teamId } },
      create: { ruleId, teamId, enabled, severity: severity || "WARNING" },
      update: { enabled, ...(severity ? { severity } : {}) },
    });
    return NextResponse.json(config);
  }

  // Create custom rule
  if (body.action === "createCustom") {
    const { name, prompt, severity, description } = body;
    if (!name || !prompt) {
      return NextResponse.json({ error: "Name and prompt are required" }, { status: 400 });
    }

    // Check plan limit for custom rules
    const team = await prisma.team.findUnique({ where: { id: teamId }, select: { plan: true } });
    const planKey = (team?.plan || "FREE") as PlanKey;
    const maxCustomRules = PLANS[planKey].maxCustomRules;
    if (maxCustomRules !== -1) {
      const currentCount = await prisma.customRule.count({ where: { teamId } });
      if (currentCount >= maxCustomRules) {
        return NextResponse.json(
          { error: `Custom rule limit reached (${currentCount}/${maxCustomRules}). Upgrade your plan to add more.` },
          { status: 403 }
        );
      }
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 48);

    const rule = await prisma.customRule.upsert({
      where: { slug_teamId: { slug, teamId } },
      create: { name, slug, prompt, severity: severity || "WARNING", description, teamId },
      update: { name, prompt, severity: severity || "WARNING", description },
    });
    return NextResponse.json(rule);
  }

  // Update custom rule
  if (body.action === "updateCustom") {
    const { id, name, prompt, severity, description, enabled } = body;
    const rule = await prisma.customRule.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(prompt !== undefined ? { prompt } : {}),
        ...(severity !== undefined ? { severity } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(enabled !== undefined ? { enabled } : {}),
      },
    });
    return NextResponse.json(rule);
  }

  // Delete custom rule
  if (body.action === "deleteCustom") {
    const { id } = body;
    await prisma.customRule.delete({ where: { id } });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
