export const dynamic = "force-dynamic";

import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@codeguard/db";
import { redirect } from "next/navigation";
import { PLANS, type PlanKey, formatPriceTL } from "@/lib/iyzico";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const teamId = (session.user as any).teamId;
  const teamRole = (session.user as any).teamRole;

  if (!teamId) redirect("/auth/login");

  const team = await prisma.team.findUnique({
    where: { id: teamId },
    include: {
      subscription: true,
      payments: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      _count: {
        select: { reviews: true, members: true, repositories: true, customRules: true },
      },
    },
  });

  if (!team) redirect("/auth/login");

  const planKey = team.plan as PlanKey;
  const planDef = PLANS[planKey];

  const billingData = {
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
          currentPeriodEnd: team.subscription.currentPeriodEnd?.toISOString() || null,
          cancelAtPeriodEnd: team.subscription.cancelAtPeriodEnd,
        }
      : null,
    payments: team.payments.map((p) => ({
      id: p.id,
      amount: p.amount,
      amountFormatted: formatPriceTL(p.amount),
      status: p.status,
      description: p.description,
      cardLastFour: p.cardLastFour,
      createdAt: p.createdAt.toISOString(),
    })),
    usage: {
      reviews: team._count.reviews,
      members: team._count.members,
      repos: team._count.repositories,
      customRules: team._count.customRules,
    },
  };

  return (
    <SettingsClient
      billing={billingData}
      user={{
        name: session.user.name || "",
        email: session.user.email || "",
        image: (session.user as any).image || "",
      }}
      isOwner={teamRole === "OWNER"}
    />
  );
}
