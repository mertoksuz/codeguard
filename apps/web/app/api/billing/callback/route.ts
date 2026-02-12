import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@codeguard/db";
import { retrieveCheckoutResult, PLANS, type PlanKey } from "@/lib/iyzico";

export const dynamic = "force-dynamic";

/**
 * POST /api/billing/callback
 * iyzico redirects here after checkout is complete (server-to-server callback).
 * We verify the payment, activate the subscription, and redirect the user.
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get("token") as string;

    if (!token) {
      return redirectWithStatus("error", "No payment token received");
    }

    // Retrieve the checkout result from iyzico
    const result = await retrieveCheckoutResult(token);

    if (result.status !== "success") {
      return redirectWithStatus("error", "Payment was not successful");
    }

    // Parse team ID, plan, and interval from the conversation ID
    // conversationId format: "teamId__PLAN__INTERVAL__timestamp"
    const conversationId = result.conversationId || "";
    const parts = conversationId.split("__");

    let teamId = "";
    let plan: PlanKey = "PRO";
    let interval: "MONTHLY" | "YEARLY" = "MONTHLY";

    if (parts.length >= 4) {
      teamId = parts[0];
      plan = (parts[1] as PlanKey) || "PRO";
      interval = (parts[2] as "MONTHLY" | "YEARLY") || "MONTHLY";
    } else {
      // Fallback for legacy format "teamId-timestamp"
      teamId = conversationId.split("-").slice(0, -1).join("-") || "";
    }

    if (!teamId) {
      console.error("Could not extract teamId from conversationId:", conversationId);
      return redirectWithStatus("error", "Invalid session");
    }

    // Validate plan
    if (!PLANS[plan]) plan = "PRO";
    if (interval !== "YEARLY") interval = "MONTHLY";

    const priceNum = parseFloat(result.paidPrice || "0");

    const amountKurus = Math.round(priceNum * 100);

    // Calculate period dates
    const now = new Date();
    const periodEnd = new Date(now);
    if (interval === "YEARLY") {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    // Update team plan and create/update subscription
    await prisma.$transaction([
      prisma.team.update({
        where: { id: teamId },
        data: {
          plan,
          reviewsUsedThisMonth: 0, // reset on plan change
          reviewsResetAt: now,
        },
      }),
      prisma.subscription.upsert({
        where: { teamId },
        create: {
          teamId,
          plan,
          status: "ACTIVE",
          interval,
          amountTL: amountKurus,
          iyzicoSubscriptionRef: result.paymentId,
          iyzicoPaymentCardToken: result.cardToken || null,
          iyzicoCustomerEmail: null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
        update: {
          plan,
          status: "ACTIVE",
          interval,
          amountTL: amountKurus,
          iyzicoSubscriptionRef: result.paymentId,
          iyzicoPaymentCardToken: result.cardToken || null,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
        },
      }),
      prisma.payment.create({
        data: {
          teamId,
          iyzicoPaymentId: result.paymentId,
          amount: amountKurus,
          currency: "TRY",
          status: "SUCCESS",
          description: `CodeGuard ${PLANS[plan].name} — ${interval === "YEARLY" ? "Yıllık" : "Aylık"}`,
          cardLastFour: result.cardLastFour || null,
        },
      }),
    ]);

    console.log(`✅ Payment successful for team ${teamId}: ${plan} (${interval})`);

    return redirectWithStatus("success", `Upgraded to ${PLANS[plan].name}!`);
  } catch (err: any) {
    console.error("Billing callback error:", err);
    return redirectWithStatus("error", err.message || "Payment processing failed");
  }
}

function redirectWithStatus(status: string, message: string) {
  const baseUrl = process.env.NEXTAUTH_URL || "https://codeguard-api-one.vercel.app";
  const url = `${baseUrl}/dashboard/settings?billing=${status}&message=${encodeURIComponent(message)}`;
  return NextResponse.redirect(url, { status: 303 });
}
