import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature") || "";
  const body = await req.text();

  // In production: verify with Stripe SDK
  console.log("Stripe webhook received");

  try {
    const event = JSON.parse(body);

    switch (event.type) {
      case "checkout.session.completed":
        console.log("Checkout completed:", event.data.object.id);
        break;
      case "customer.subscription.updated":
        console.log("Subscription updated:", event.data.object.id);
        break;
      case "customer.subscription.deleted":
        console.log("Subscription deleted:", event.data.object.id);
        break;
      case "invoice.payment_failed":
        console.log("Payment failed:", event.data.object.id);
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    return NextResponse.json({ error: "Webhook error" }, { status: 400 });
  }
}
