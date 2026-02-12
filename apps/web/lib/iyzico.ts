/**
 * iyzico Payment Integration
 * Docs: https://dev.iyzipay.com/en
 *
 * Uses iyzico's checkout form (iyzico 3D Secure) for PCI compliance.
 * All amounts are in kuruş (TL cents): 1 TL = 100 kuruş
 */

import crypto from "crypto";

const API_KEY = process.env.IYZICO_API_KEY || "";
const SECRET_KEY = process.env.IYZICO_SECRET_KEY || "";
const BASE_URL = process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

// ─── Plan Definitions ─────────────────────────────
export const PLANS = {
  FREE: {
    name: "Free",
    monthlyPriceTL: 0,
    yearlyPriceTL: 0,
    reviewsPerMonth: 50,
    maxRepos: 1,
    maxCustomRules: 0,
    maxMembers: 1,
    features: [
      "50 reviews/month",
      "5 SOLID rules",
      "Slack integration",
      "Basic dashboard",
      "1 repository",
    ],
  },
  PRO: {
    name: "Pro",
    monthlyPriceTL: 89900, // 899.00 TL in kuruş
    yearlyPriceTL: 71900,  // 719.00 TL/mo billed yearly
    reviewsPerMonth: 500,
    maxRepos: -1, // unlimited
    maxCustomRules: 20,
    maxMembers: 10,
    features: [
      "500 reviews/month",
      "All 9+ rules",
      "Auto-fix PRs",
      "Advanced dashboard",
      "Unlimited repos",
      "Custom rule config",
      "Priority support",
    ],
  },
  ENTERPRISE: {
    name: "Enterprise",
    monthlyPriceTL: 349900, // 3,499.00 TL in kuruş
    yearlyPriceTL: 279900,  // 2,799.00 TL/mo billed yearly
    reviewsPerMonth: -1, // unlimited
    maxRepos: -1,
    maxCustomRules: -1,
    maxMembers: -1,
    features: [
      "Unlimited reviews",
      "Custom rules engine",
      "SSO & SAML",
      "Dedicated support",
      "SLA guarantee",
      "On-prem option",
      "API access",
      "Team analytics",
    ],
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// ─── iyzico Authentication ────────────────────────
function generateAuthHeader(uri: string, body: string): Record<string, string> {
  const randomStr = Math.random().toString(36).substring(2, 14);
  const hashStr = API_KEY + randomStr + SECRET_KEY + body;
  const pkiHash = crypto.createHash("sha1").update(hashStr).digest("base64");
  const authorizationStr = `IYZWS ${API_KEY}:${pkiHash}`;

  return {
    "Content-Type": "application/json",
    Authorization: authorizationStr,
    "x-iyzi-rnd": randomStr,
  };
}

async function iyzicoRequest<T = any>(
  endpoint: string,
  body: Record<string, any>
): Promise<T> {
  const bodyStr = JSON.stringify(body);
  const headers = generateAuthHeader(endpoint, bodyStr);

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: bodyStr,
  });

  const data = await res.json();

  if (data.status === "failure") {
    console.error("iyzico error:", data.errorCode, data.errorMessage);
    throw new Error(data.errorMessage || "iyzico API error");
  }

  return data;
}

// ─── Checkout Form (3D Secure) ────────────────────
export interface CheckoutFormParams {
  teamId: string;
  teamName: string;
  userEmail: string;
  userName: string;
  plan: "PRO" | "ENTERPRISE";
  interval: "MONTHLY" | "YEARLY";
  callbackUrl: string;
}

export async function createCheckoutForm(params: CheckoutFormParams) {
  const planDef = PLANS[params.plan];
  const priceTL = params.interval === "YEARLY" ? planDef.yearlyPriceTL : planDef.monthlyPriceTL;
  const priceStr = (priceTL / 100).toFixed(2); // "899.00"

  const conversationId = `${params.teamId}__${params.plan}__${params.interval}__${Date.now()}`;

  const body = {
    locale: "tr",
    conversationId,
    price: priceStr,
    paidPrice: priceStr,
    currency: "TRY",
    basketId: `basket-${params.teamId}`,
    paymentGroup: "SUBSCRIPTION",
    callbackUrl: params.callbackUrl,
    enabledInstallments: [1], // single payment
    buyer: {
      id: params.teamId,
      name: params.userName.split(" ")[0] || "User",
      surname: params.userName.split(" ").slice(1).join(" ") || "User",
      email: params.userEmail,
      identityNumber: "11111111111", // Required by iyzico, dummy for now
      registrationAddress: "Istanbul, Turkey",
      ip: "85.34.78.112",
      city: "Istanbul",
      country: "Turkey",
    },
    shippingAddress: {
      contactName: params.userName,
      city: "Istanbul",
      country: "Turkey",
      address: "Istanbul, Turkey",
    },
    billingAddress: {
      contactName: params.userName,
      city: "Istanbul",
      country: "Turkey",
      address: "Istanbul, Turkey",
    },
    basketItems: [
      {
        id: `plan-${params.plan.toLowerCase()}-${params.interval.toLowerCase()}`,
        name: `CodeGuard ${planDef.name} (${params.interval === "YEARLY" ? "Yıllık" : "Aylık"})`,
        category1: "SaaS Subscription",
        itemType: "VIRTUAL",
        price: priceStr,
      },
    ],
  };

  const result = await iyzicoRequest("/payment/iyzipos/checkoutform/initialize", body);

  return {
    token: result.token,
    checkoutFormContent: result.checkoutFormContent, // HTML snippet to render
    conversationId,
  };
}

// ─── Retrieve Checkout Result ─────────────────────
export async function retrieveCheckoutResult(token: string) {
  const result = await iyzicoRequest("/payment/iyzipos/checkoutform/auth/ecom/detail", {
    locale: "tr",
    token,
  });

  return {
    status: result.status, // "success" | "failure"
    paymentId: result.paymentId,
    paymentStatus: result.paymentStatus,
    price: result.price,
    paidPrice: result.paidPrice,
    cardLastFour: result.lastFourDigits || result.binNumber?.slice(-4),
    conversationId: result.conversationId,
    basketId: result.basketId,
    fraudStatus: result.fraudStatus,
    token: result.token,
    cardToken: result.cardToken,
  };
}

// ─── Refund ───────────────────────────────────────
export async function createRefund(paymentId: string, amountKurus: number) {
  const priceStr = (amountKurus / 100).toFixed(2);

  const result = await iyzicoRequest("/payment/refund", {
    locale: "tr",
    paymentTransactionId: paymentId,
    price: priceStr,
    currency: "TRY",
  });

  return result;
}

// ─── Helper: format price ─────────────────────────
export function formatPriceTL(kurus: number): string {
  return `₺${(kurus / 100).toLocaleString("tr-TR", { minimumFractionDigits: 2 })}`;
}

// ─── Helper: get plan limits ──────────────────────
export function getPlanLimits(plan: PlanKey) {
  return PLANS[plan];
}

// ─── Helper: check if team is within limits ───────
export function isWithinReviewLimit(plan: PlanKey, reviewsUsed: number): boolean {
  const limits = PLANS[plan];
  if (limits.reviewsPerMonth === -1) return true; // unlimited
  return reviewsUsed < limits.reviewsPerMonth;
}
