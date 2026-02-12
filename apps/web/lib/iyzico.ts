/**
 * iyzico Payment Integration — using official iyzipay SDK
 * Docs: https://dev.iyzipay.com/en
 *
 * Uses iyzico's checkout form (3D Secure) for PCI compliance.
 * All amounts are in kuruş (TL cents): 1 TL = 100 kuruş
 */

// @ts-expect-error — iyzipay has no type declarations
import Iyzipay from "iyzipay";

// Lazy-init to avoid crashing during Next.js build (no env vars at build time)
let _iyzipay: any = null;
function getIyzipay() {
  if (!_iyzipay) {
    _iyzipay = new Iyzipay({
      apiKey: process.env.IYZICO_API_KEY || "",
      secretKey: process.env.IYZICO_SECRET_KEY || "",
      uri: process.env.IYZICO_BASE_URL || "https://sandbox-api.iyzipay.com",
    });
  }
  return _iyzipay;
}

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

// ─── Helper: promisify SDK callbacks ──────────────
function sdkCall<T = any>(
  fn: (params: any, cb: (err: any, result: T) => void) => void,
  params: any,
): Promise<T> {
  return new Promise((resolve, reject) => {
    fn(params, (err: any, result: T) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
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
  const priceStr = (priceTL / 100).toFixed(1); // "899.0" — iyzico format

  // Encode plan+interval in conversationId for callback to parse
  const conversationId = `${params.teamId}__${params.plan}__${params.interval}__${Date.now()}`;

  const request = {
    locale: Iyzipay.LOCALE.TR,
    conversationId,
    price: priceStr,
    paidPrice: priceStr,
    currency: Iyzipay.CURRENCY.TRY,
    basketId: `basket-${params.teamId}`,
    paymentGroup: Iyzipay.PAYMENT_GROUP.SUBSCRIPTION,
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
        itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
        price: priceStr,
      },
    ],
  };

  const iyz = getIyzipay();
  const result: any = await sdkCall(
    iyz.checkoutFormInitialize.create.bind(iyz.checkoutFormInitialize),
    request,
  );

  if (result.status === "failure") {
    console.error("iyzico error:", result.errorCode, result.errorMessage, result.errorGroup);
    throw new Error(result.errorMessage || "iyzico API error");
  }

  return {
    token: result.token,
    checkoutFormContent: result.checkoutFormContent,
    conversationId,
  };
}

// ─── Retrieve Checkout Result ─────────────────────
export async function retrieveCheckoutResult(token: string) {
  const iyz = getIyzipay();
  const result: any = await sdkCall(
    iyz.checkoutForm.retrieve.bind(iyz.checkoutForm),
    { locale: Iyzipay.LOCALE.TR, token },
  );

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
  const priceStr = (amountKurus / 100).toFixed(1);

  const iyz = getIyzipay();
  const result: any = await sdkCall(
    iyz.refund.create.bind(iyz.refund),
    {
      locale: Iyzipay.LOCALE.TR,
      paymentTransactionId,
      price: priceStr,
      currency: Iyzipay.CURRENCY.TRY,
    },
  );

  if (result.status === "failure") {
    throw new Error(result.errorMessage || "Refund failed");
  }

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
