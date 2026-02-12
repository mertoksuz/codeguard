"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

const plans = [
  {
    name: "Free",
    desc: "Perfect for trying out CodeGuard AI",
    monthlyPrice: "₺0",
    yearlyPrice: "₺0",
    monthlyRaw: 0,
    yearlyRaw: 0,
    features: ["50 reviews/month", "5 SOLID rules", "Slack integration", "Basic dashboard", "1 repository"],
    cta: "Start Free",
    ctaHref: "/auth/register",
    popular: false,
  },
  {
    name: "Pro",
    desc: "For growing teams shipping quality code",
    monthlyPrice: "₺899",
    yearlyPrice: "₺719",
    monthlyRaw: 899,
    yearlyRaw: 719,
    features: ["500 reviews/month", "All 9+ rules", "Auto-fix PRs", "Advanced dashboard", "Unlimited repos", "Custom rule config", "Priority support"],
    cta: "Start Pro Trial",
    ctaHref: "/dashboard/settings",
    popular: true,
  },
  {
    name: "Enterprise",
    desc: "For large organizations with custom needs",
    monthlyPrice: "₺3.499",
    yearlyPrice: "₺2.799",
    monthlyRaw: 3499,
    yearlyRaw: 2799,
    features: ["Unlimited reviews", "Custom rules engine", "SSO & SAML", "Dedicated support", "SLA guarantee", "On-prem option", "API access", "Team analytics"],
    cta: "Contact Sales",
    ctaHref: "/dashboard/settings",
    popular: false,
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(true);

  return (
    <section id="pricing" className="py-24 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <h2 className="text-4xl font-extrabold tracking-tight">
            Simple, transparent <span className="gradient-text">pricing</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            Start free, scale as your team grows.
          </p>

          {/* Toggle */}
          <div className="mt-8 inline-flex items-center gap-3 bg-white rounded-xl p-1.5 border border-surface-200">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${!annual ? "bg-brand-500 text-white shadow-md" : "text-surface-500 hover:text-surface-700"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${annual ? "bg-brand-500 text-white shadow-md" : "text-surface-500 hover:text-surface-700"}`}
            >
              Annual <span className="text-xs opacity-80">(-20%)</span>
            </button>
          </div>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl p-8 ${plan.popular ? "bg-surface-900 text-white ring-2 ring-brand-500 shadow-2xl scale-105" : "bg-white border border-surface-200"}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-gradient-to-r from-brand-500 to-accent-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                  Most Popular
                </div>
              )}
              <h3 className={`text-xl font-bold ${plan.popular ? "text-white" : "text-surface-900"}`}>{plan.name}</h3>
              <p className={`text-sm mt-1 ${plan.popular ? "text-surface-300" : "text-surface-500"}`}>{plan.desc}</p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className={`text-5xl font-extrabold ${plan.popular ? "text-white" : "text-surface-900"}`}>
                  {annual ? plan.yearlyPrice : plan.monthlyPrice}
                </span>
                {plan.monthlyRaw > 0 && (
                  <span className={`text-sm ${plan.popular ? "text-surface-400" : "text-surface-500"}`}>/ay</span>
                )}
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm">
                    <svg className={`w-4 h-4 shrink-0 ${plan.popular ? "text-brand-400" : "text-green-500"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className={plan.popular ? "text-surface-200" : "text-surface-600"}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                href={plan.ctaHref}
                className={`mt-8 block text-center py-3 rounded-xl font-semibold text-sm transition-all ${plan.popular ? "bg-white text-surface-900 hover:bg-surface-100" : "bg-brand-500 text-white hover:bg-brand-600"}`}
              >
                {plan.cta}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
