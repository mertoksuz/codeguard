"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface BillingData {
  plan: string;
  planName: string;
  reviewsUsed: number;
  reviewsLimit: number;
  maxRepos: number;
  maxCustomRules: number;
  maxMembers: number;
  subscription: {
    status: string;
    interval: string;
    amountTL: number;
    amountFormatted: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  payments: {
    id: string;
    amount: number;
    amountFormatted: string;
    status: string;
    description: string | null;
    cardLastFour: string | null;
    createdAt: string;
  }[];
  usage: {
    reviews: number;
    members: number;
    repos: number;
    customRules: number;
  };
}

interface SettingsClientProps {
  billing: BillingData;
  user: { name: string; email: string; image: string };
  isOwner: boolean;
}

const PLAN_PRICES = {
  PRO: { monthly: "₺899", yearly: "₺719/ay" },
  ENTERPRISE: { monthly: "₺3.499", yearly: "₺2.799/ay" },
};

export function SettingsClient({ billing, user, isOwner }: SettingsClientProps) {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [checkoutHtml, setCheckoutHtml] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Show billing callback result
  useEffect(() => {
    const billingStatus = searchParams.get("billing");
    const billingMessage = searchParams.get("message");
    if (billingStatus && billingMessage) {
      setMessage({
        type: billingStatus === "success" ? "success" : "error",
        text: billingMessage,
      });
      // Clean URL
      window.history.replaceState({}, "", "/dashboard/settings");
    }
  }, [searchParams]);

  async function handleUpgrade(plan: "PRO" | "ENTERPRISE", interval: "MONTHLY" | "YEARLY") {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "checkout", plan, interval }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else if (data.checkoutFormContent) {
        setCheckoutHtml(data.checkoutFormContent);
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription? You'll keep access until the end of the billing period.")) return;
    setLoading(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "Subscription will cancel at the end of the billing period." });
        window.location.reload();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleReactivate() {
    setLoading(true);
    try {
      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reactivate" }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ type: "error", text: data.error });
      } else {
        setMessage({ type: "success", text: "Subscription reactivated!" });
        window.location.reload();
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  const reviewPercent = billing.reviewsLimit === -1
    ? 0
    : Math.min(100, Math.round((billing.reviewsUsed / billing.reviewsLimit) * 100));

  const isFree = billing.plan === "FREE";
  const isPro = billing.plan === "PRO";
  const isEnterprise = billing.plan === "ENTERPRISE";

  // If iyzico checkout form is loaded, show it
  if (checkoutHtml) {
    return (
      <div>
        <div className="mb-6">
          <button
            onClick={() => setCheckoutHtml(null)}
            className="text-sm text-surface-500 hover:text-surface-700 flex items-center gap-1"
          >
            ← Back to settings
          </button>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Complete Payment</CardTitle>
            <CardDescription>Enter your card details below to complete the upgrade</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              dangerouslySetInnerHTML={{ __html: checkoutHtml }}
              className="iyzico-checkout"
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-surface-900">Settings</h1>
        <p className="text-surface-500 mt-1">Manage your account, billing, and team settings</p>
      </div>

      {/* Status Messages */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            message.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      <div className="space-y-6 max-w-3xl">
        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Current Plan</CardTitle>
                <CardDescription>Your team&apos;s subscription and usage</CardDescription>
              </div>
              <Badge variant={isEnterprise ? "brand" : isPro ? "success" : "info"}>
                {billing.planName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Usage Bar */}
            <div className="p-4 bg-surface-50 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-surface-600">Reviews this month</span>
                <span className="font-semibold text-surface-900">
                  {billing.reviewsUsed} / {billing.reviewsLimit === -1 ? "∞" : billing.reviewsLimit}
                </span>
              </div>
              {billing.reviewsLimit !== -1 && (
                <div className="w-full bg-surface-200 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full transition-all ${
                      reviewPercent >= 90 ? "bg-red-500" : reviewPercent >= 70 ? "bg-yellow-500" : "bg-brand-500"
                    }`}
                    style={{ width: `${reviewPercent}%` }}
                  />
                </div>
              )}

              <div className="grid grid-cols-3 gap-4 pt-2">
                <div className="text-center">
                  <div className="text-lg font-bold text-surface-900">{billing.usage.repos}</div>
                  <div className="text-xs text-surface-500">
                    Repos {billing.maxRepos !== -1 && `/ ${billing.maxRepos}`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-surface-900">{billing.usage.members}</div>
                  <div className="text-xs text-surface-500">
                    Members {billing.maxMembers !== -1 && `/ ${billing.maxMembers}`}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-surface-900">{billing.usage.customRules}</div>
                  <div className="text-xs text-surface-500">
                    Custom Rules {billing.maxCustomRules !== -1 && `/ ${billing.maxCustomRules}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Active Subscription Details */}
            {billing.subscription && (
              <div className="p-4 bg-surface-50 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-surface-900">
                    {billing.subscription.amountFormatted} / {billing.subscription.interval === "YEARLY" ? "yıl" : "ay"}
                  </div>
                  {billing.subscription.currentPeriodEnd && (
                    <div className="text-xs text-surface-500 mt-0.5">
                      {billing.subscription.cancelAtPeriodEnd
                        ? `Cancels on ${new Date(billing.subscription.currentPeriodEnd).toLocaleDateString("tr-TR")}`
                        : `Next billing: ${new Date(billing.subscription.currentPeriodEnd).toLocaleDateString("tr-TR")}`}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      billing.subscription.status === "ACTIVE"
                        ? "success"
                        : billing.subscription.status === "PAST_DUE"
                        ? "warning"
                        : "info"
                    }
                  >
                    {billing.subscription.cancelAtPeriodEnd ? "Canceling" : billing.subscription.status}
                  </Badge>
                  {isOwner && billing.subscription.cancelAtPeriodEnd ? (
                    <Button size="sm" variant="outline" onClick={handleReactivate} disabled={loading}>
                      Reactivate
                    </Button>
                  ) : isOwner && !isFree ? (
                    <Button size="sm" variant="ghost" onClick={handleCancel} disabled={loading}>
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upgrade Options (only show if not on Enterprise) */}
        {!isEnterprise && isOwner && (
          <Card>
            <CardHeader>
              <CardTitle>{isFree ? "Upgrade Your Plan" : "Change Plan"}</CardTitle>
              <CardDescription>
                {isFree
                  ? "Unlock more reviews, custom rules, and advanced features"
                  : "Switch to a different plan"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {/* Pro Plan */}
                {!isPro && (
                  <div className="border border-surface-200 rounded-xl p-5 space-y-3 hover:border-brand-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-surface-900">Pro</h3>
                      <Badge variant="brand">Popular</Badge>
                    </div>
                    <p className="text-sm text-surface-500">500 reviews/mo, unlimited repos, auto-fix PRs</p>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-extrabold text-surface-900">₺899</span>
                      <span className="text-sm text-surface-500">/ay</span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpgrade("PRO", "MONTHLY")}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? "..." : "Aylık"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpgrade("PRO", "YEARLY")}
                        disabled={loading}
                        className="flex-1"
                      >
                        {loading ? "..." : "Yıllık ₺719/ay"}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Enterprise Plan */}
                <div className="border border-surface-200 rounded-xl p-5 space-y-3 hover:border-brand-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-surface-900">Enterprise</h3>
                    <Badge variant="info">Custom</Badge>
                  </div>
                  <p className="text-sm text-surface-500">Unlimited everything, SSO, SLA, dedicated support</p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold text-surface-900">₺3.499</span>
                    <span className="text-sm text-surface-500">/ay</span>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpgrade("ENTERPRISE", "MONTHLY")}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? "..." : "Aylık"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpgrade("ENTERPRISE", "YEARLY")}
                      disabled={loading}
                      className="flex-1"
                    >
                      {loading ? "..." : "Yıllık ₺2.799/ay"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        {billing.payments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
              <CardDescription>Recent transactions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {billing.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between p-3 bg-surface-50 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-2 h-2 rounded-full ${
                          payment.status === "SUCCESS"
                            ? "bg-green-500"
                            : payment.status === "FAILED"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <div>
                        <div className="text-sm font-medium text-surface-900">
                          {payment.description || "Payment"}
                        </div>
                        <div className="text-xs text-surface-500">
                          {new Date(payment.createdAt).toLocaleDateString("tr-TR", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                          {payment.cardLastFour && ` • •••• ${payment.cardLastFour}`}
                        </div>
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-surface-900">
                      {payment.amountFormatted}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Name</label>
              <input
                type="text"
                defaultValue={user.name}
                className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                readOnly
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1.5">Email</label>
              <input
                type="email"
                defaultValue={user.email}
                className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                readOnly
              />
            </div>
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="danger" size="sm" disabled>
              Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
