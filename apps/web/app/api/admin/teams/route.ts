import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";

export const dynamic = "force-dynamic";

async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, email: true } });
  if (!user) return false;
  // Check DB role OR env var allowlist
  if (user.role === "ADMIN") return true;
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((e) => e.trim().toLowerCase());
  return adminEmails.includes((user.email || "").toLowerCase());
}

// ─── GET /api/admin/teams — list all teams ───
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teams = await prisma.team.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      subscription: true,
      _count: { select: { reviews: true, repositories: true, customRules: true } },
    },
  });

  return NextResponse.json({
    teams: teams.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      plan: t.plan,
      reviewsUsedThisMonth: t.reviewsUsedThisMonth,
      createdAt: t.createdAt,
      members: t.members.map((m) => ({
        id: m.user.id,
        name: m.user.name,
        email: m.user.email,
        image: m.user.image,
        role: m.role,
      })),
      subscription: t.subscription
        ? {
            status: t.subscription.status,
            interval: t.subscription.interval,
            currentPeriodEnd: t.subscription.currentPeriodEnd,
          }
        : null,
      _count: t._count,
    })),
  });
}

// ─── PATCH /api/admin/teams — update team plan ───
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = (session.user as any).id;
  if (!(await isAdmin(userId))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { teamId, plan } = body as { teamId: string; plan: string };

  if (!teamId || !["FREE", "PRO", "ENTERPRISE"].includes(plan)) {
    return NextResponse.json({ error: "Invalid teamId or plan" }, { status: 400 });
  }

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const oldPlan = team.plan;

  // Update team plan
  await prisma.team.update({
    where: { id: teamId },
    data: {
      plan: plan as any,
      reviewsUsedThisMonth: 0,
      reviewsResetAt: new Date(),
    },
  });

  // If upgrading, create/update subscription record
  if (plan !== "FREE") {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);

    await prisma.subscription.upsert({
      where: { teamId },
      create: {
        teamId,
        plan: plan as any,
        status: "ACTIVE",
        interval: "YEARLY",
        amountTL: 0, // admin override — no charge
        iyzicoSubscriptionRef: `admin-override-${Date.now()}`,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
      },
      update: {
        plan: plan as any,
        status: "ACTIVE",
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: false,
      },
    });
  } else {
    // Downgrading to FREE — remove subscription
    await prisma.subscription.deleteMany({ where: { teamId } });
  }

  console.log(`[ADMIN] Plan changed for team ${teamId}: ${oldPlan} → ${plan}`);

  return NextResponse.json({
    success: true,
    teamId,
    oldPlan,
    newPlan: plan,
  });
}
