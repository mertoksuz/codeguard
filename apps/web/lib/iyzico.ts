/**
 * iyzico Payment Integration — serverless-compatible (no fs dependency)
 * Docs: https://dev.iyzipay.com/en
 *
 * Uses iyzico V2 auth (HMAC-SHA256) and checkout form for PCI compliance.
 * All amounts are in kuruş (TL cents): 1 TL = 100 kuruş
 */

import crypto from "crypto";

const API_KEY = () => process.env.IYZICO_API_KEY || "";
const SECRET_KEY = () => process.env.IYZICO_SECRET_KEY || "";
const BASE_URL = () => process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com";

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

// ─── iyzico V2 Auth (HMAC-SHA256) ─────────────────
// Extracted from official iyzipay SDK utils.js — works without fs
function generateRandomString(): string {
  return process.hrtime.bigint().toString() + Math.random().toString(8).slice(2);
}

function formatPrice(price: number | string): string {
  const p = parseFloat(String(price));
  if (!isFinite(p)) return String(price);
  const result = p.toString();
  return result.includes(".") ? result : result + ".0";
}

function generateAuthHeaderV2(uri: string, body: Record<string, any>): Record<string, string> {
  const apiKey = API_KEY();
  const secretKey = SECRET_KEY();
  const randomString = generateRandomString();

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(randomString + uri + JSON.stringify(body))
    .digest("hex");

  const authorizationParams = [
    `apiKey:${apiKey}`,
    `randomKey:${randomString}`,
    `signature:${signature}`,
  ];
  const authValue = Buffer.from(authorizationParams.join("&")).toString("base64");

  return {
    "Content-Type": "application/json",
    Authorization: `IYZWSv2 ${authValue}`,
    "x-iyzi-rnd": randomString,
    "x-iyzi-client-version": "iyzipay-node-2.0.65",
  };
}

async function iyzicoRequest<T = any>(endpoint: string, body: Record<string, any>): Promise<T> {
  const apiKey = API_KEY();
  const secretKey = SECRET_KEY();
  const baseUrl = BASE_URL();

  // Debug: log credential presence (not values) to help diagnose auth issues
  console.log("[iyzico] request to:", baseUrl + endpoint);
  console.log("[iyzico] API_KEY set:", !!apiKey, "length:", apiKey.length);
  console.log("[iyzico] SECRET_KEY set:", !!secretKey, "length:", secretKey.length);
  console.log("[iyzico] BASE_URL:", baseUrl);

  if (!apiKey || !secretKey) {
    throw new Error("iyzico API credentials not configured (IYZICO_API_KEY / IYZICO_SECRET_KEY)");
  }

  const headers = generateAuthHeaderV2(endpoint, body);

  const res = await fetch(`${baseUrl}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (data.status === "failure") {
    console.error("iyzico error:", JSON.stringify({
      errorCode: data.errorCode,
      errorMessage: data.errorMessage,
      errorGroup: data.errorGroup,
      conversationId: data.conversationId,
    }));
    throw new Error(data.errorMessage || "iyzico API error");
  }

  return data as T;
}

// ─── Checkout Form (3D Secure) ────────────────────
export interface CheckoutFormParams {
  teamId: string;
  teamName: string;
  userEmail: string;
  userName: string;
  userIp?: string;
  plan: "PRO" | "ENTERPRISE";
  interval: "MONTHLY" | "YEARLY";
  callbackUrl: string;
}

export async function createCheckoutForm(params: CheckoutFormParams) {
  const planDef = PLANS[params.plan];
  const priceTL = params.interval === "YEARLY" ? planDef.yearlyPriceTL : planDef.monthlyPriceTL;
  const priceStr = formatPrice(priceTL / 100); // "899.0"

  // Encode plan+interval in conversationId for callback to parse
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
    enabledInstallments: [1, 2, 3, 6, 9],
    buyer: {
      id: params.teamId,
      name: params.userName.split(" ")[0] || "User",
      surname: params.userName.split(" ").slice(1).join(" ") || "User",
      gsmNumber: "+905000000000",
      email: params.userEmail,
      identityNumber: "11111111111",
      lastLoginDate: new Date().toISOString().replace("T", " ").substring(0, 19),
      registrationDate: "2020-01-01 12:00:00",
      registrationAddress: "Istanbul, Turkey",
      ip: params.userIp || "85.34.78.112",
      city: "Istanbul",
      country: "Turkey",
      zipCode: "34000",
    },
    shippingAddress: {
      contactName: params.userName || "User",
      city: "Istanbul",
      country: "Turkey",
      address: "Istanbul, Turkey",
      zipCode: "34000",
    },
    billingAddress: {
      contactName: params.userName || "User",
      city: "Istanbul",
      country: "Turkey",
      address: "Istanbul, Turkey",
      zipCode: "34000",
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

  const result = await iyzicoRequest("/payment/iyzipos/checkoutform/initialize/auth/ecom", body);

  return {
    token: result.token,
    checkoutFormContent: result.checkoutFormContent,
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
    status: result.status,
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
export async function createRefund(paymentTransactionId: string, amountKurus: number) {
  const priceStr = formatPrice(amountKurus / 100);

  const result = await iyzicoRequest("/payment/refund", {
    locale: "tr",
    paymentTransactionId,
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
  if (limits.reviewsPerMonth === -1) return true;
  return reviewsUsed < limits.reviewsPerMonth;
}
