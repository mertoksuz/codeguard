import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import {
  createCheckoutForm,
  retrieveCheckoutResult,
  PLANS,
  formatPriceTL,
  type PlanKey,
} from "@/lib/iyzico";

export const dynamic = "force-dynamic";

// ─── GET /api/billing — current plan info + payment history ───
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      subscription: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  const planKey = team.plan as PlanKey;
  const planDef = PLANS[planKey];

  return NextResponse.json({
    plan: team.plan,
    planName: planDef.name,
    reviewsUsed: team.reviewsUsedThisMonth,
    reviewsLimit: planDef.reviewsPerMonth,
    maxRepos: planDef.maxRepos,
    maxCustomRules: planDef.maxCustomRules,
    maxMembers: planDef.maxMembers,
    subscription: team.subscription
      ? {
          status: team.subscription.status,
          interval: team.subscription.interval,
          amountTL: team.subscription.amountTL,
          amountFormatted: formatPriceTL(team.subscription.amountTL),
          currentPeriodEnd: team.subscription.currentPeriodEnd,
          cancelAtPeriodEnd: team.subscription.cancelAtPeriodEnd,
        }
      : null,
    payments: team.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      amountFormatted: formatPriceTL(p.amount),
      currency: p.currency,
      status: p.status,
      description: p.description,
      cardLastFour: p.cardLastFour,
      createdAt: p.createdAt,
    })),
  });
}

// ─── POST /api/billing — actions: checkout, callback, cancel, reactivate ───
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const teamId = (session.user as any).teamId;
  const teamRole = (session.user as any).teamRole;
  if (!teamId) return NextResponse.json({ error: "No team" }, { status: 400 });

  // Only OWNER can manage billing
  if (teamRole !== "OWNER") {
    return NextResponse.json({ error: "Only team owners can manage billing" }, { status: 403 });
  }

  const body = await req.json();

  // ─── CHECKOUT: Create iyzico checkout form ───
  if (body.action === "checkout") {
    const { plan, interval } = body as { plan: "PRO" | "ENTERPRISE"; interval: "MONTHLY" | "YEARLY" };

    if (!plan || !["PRO", "ENTERPRISE"].includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    const team = await prisma.team.findUnique({ where: { id: teamId } });
    if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

    const origin = req.headers.get("origin") || process.env.NEXTAUTH_URL || "";
    const userIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "85.34.78.112";

    try {
      const result = await createCheckoutForm({
        teamId,
        teamName: team.name,
        userEmail: session.user.email || "",
        userName: session.user.name || "User",
        userIp,
        plan,
        interval: interval || "MONTHLY",
        callbackUrl: `${origin}/api/billing/callback`,
      });

      return NextResponse.json({
        checkoutFormContent: result.checkoutFormContent,
        token: result.token,
      });
    } catch (err: any) {
      console.error("iyzico checkout error:", err.message);
      return NextResponse.json({ error: err.message }, { status: 500 });
    }
  }

  // ─── CANCEL: Cancel subscription at period end ───
  if (body.action === "cancel") {
    const subscription = await prisma.subscription.findUnique({ where: { teamId } });
    if (!subscription) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    await prisma.subscription.update({
      where: { teamId },
      data: { cancelAtPeriodEnd: true },
    });

    return NextResponse.json({ success: true, message: "Subscription will cancel at period end" });
  }

  // ─── REACTIVATE: Remove cancel-at-period-end flag ───
  if (body.action === "reactivate") {
    const subscription = await prisma.subscription.findUnique({ where: { teamId } });
    if (!subscription) {
      return NextResponse.json({ error: "No active subscription" }, { status: 400 });
    }

    await prisma.subscription.update({
      where: { teamId },
      data: { cancelAtPeriodEnd: false },
    });

    return NextResponse.json({ success: true, message: "Subscription reactivated" });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
