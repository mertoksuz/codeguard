import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@codeguard/db";
import { PLANS, type PlanKey } from "@/lib/iyzico";

export const dynamic = "force-dynamic";

/**
 * POST /api/iyzico/webhook
 * iyzico sends notification webhooks for subscription events.
 * This handles renewal payments, failed payments, and cancellations.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    console.log("iyzico webhook received:", body.iyziEventType || body.eventType || "unknown");

    const eventType = body.iyziEventType || body.eventType;
    const paymentId = body.paymentId || body.iyziPaymentId;
    const subscriptionRef = body.iyzicoSubscriptionReferenceCode || body.subscriptionReferenceCode;
    const status = body.status;

    // ─── Subscription Renewal (successful payment) ───
    if (eventType === "SUBSCRIPTION_ORDER_SUCCESS" || eventType === "subscription.renewed") {
      if (!subscriptionRef) {
        console.warn("No subscription reference in renewal webhook");
        return NextResponse.json({ received: true });
      }

      const subscription = await prisma.subscription.findUnique({
        where: { iyzicoSubscriptionRef: subscriptionRef },
        include: { team: true },
      });

      if (!subscription) {
        console.warn(`Subscription not found for ref: ${subscriptionRef}`);
        return NextResponse.json({ received: true });
      }

      // Extend the period
      const now = new Date();
      const newPeriodEnd = new Date(now);
      if (subscription.interval === "YEARLY") {
        newPeriodEnd.setFullYear(newPeriodEnd.getFullYear() + 1);
      } else {
        newPeriodEnd.setMonth(newPeriodEnd.getMonth() + 1);
      }

      await prisma.$transaction([
        prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: "ACTIVE",
            currentPeriodStart: now,
            currentPeriodEnd: newPeriodEnd,
          },
        }),
        // Reset monthly usage on renewal
        prisma.team.update({
          where: { id: subscription.teamId },
          data: {
            reviewsUsedThisMonth: 0,
            reviewsResetAt: now,
          },
        }),
        prisma.payment.create({
          data: {
            teamId: subscription.teamId,
            iyzicoPaymentId: paymentId || `renewal-${Date.now()}`,
            amount: subscription.amountTL,
            currency: "TRY",
            status: "SUCCESS",
            description: `Renewal — CodeGuard ${PLANS[subscription.plan as PlanKey]?.name || subscription.plan}`,
          },
        }),
      ]);

      console.log(`✅ Subscription renewed for team ${subscription.teamId}`);
    }

    // ─── Payment Failed ───
    if (eventType === "SUBSCRIPTION_ORDER_FAILURE" || eventType === "subscription.payment_failed") {
      if (subscriptionRef) {
        const subscription = await prisma.subscription.findUnique({
          where: { iyzicoSubscriptionRef: subscriptionRef },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: "PAST_DUE" },
          });

          console.log(`⚠️ Payment failed for team ${subscription.teamId}`);
        }
      }
    }

    // ─── Subscription Canceled ───
    if (eventType === "SUBSCRIPTION_CANCEL" || eventType === "subscription.canceled") {
      if (subscriptionRef) {
        const subscription = await prisma.subscription.findUnique({
          where: { iyzicoSubscriptionRef: subscriptionRef },
          include: { team: true },
        });

        if (subscription) {
          await prisma.$transaction([
            prisma.subscription.update({
              where: { id: subscription.id },
              data: { status: "CANCELED" },
            }),
            prisma.team.update({
              where: { id: subscription.teamId },
              data: { plan: "FREE" },
            }),
          ]);

          console.log(`🚫 Subscription canceled for team ${subscription.teamId}, downgraded to FREE`);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("iyzico webhook error:", err);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
