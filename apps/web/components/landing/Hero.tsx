"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function Hero() {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 dot-pattern opacity-50" />
      <div className="absolute top-20 -right-40 w-96 h-96 bg-brand-400/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 -left-40 w-96 h-96 bg-accent-400/20 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-4 py-1.5 rounded-full text-sm font-medium mb-6">
              <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
              AI-Powered Code Review
            </div>

            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold leading-[1.08] tracking-tight">
              Ship{" "}
              <span className="gradient-text">cleaner code</span>
              <br />
              with every PR
            </h1>

            <p className="mt-6 text-lg text-surface-500 max-w-lg leading-relaxed">
              CodeGuard AI automatically analyzes your pull requests, detects SOLID
              principle violations, and creates fix PRs — all from a simple Slack
              message.
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link
                href={isLoggedIn ? "/dashboard" : "/auth/register"}
                className="inline-flex items-center gap-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white font-semibold px-8 py-4 rounded-2xl text-lg shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 transition-all"
              >
                {isLoggedIn ? "Go to Dashboard" : "Start Free Trial"}
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 text-surface-600 font-medium px-8 py-4 rounded-2xl border border-surface-200 hover:border-brand-300 hover:text-brand-600 transition-all"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-10 flex items-center gap-6 text-sm text-surface-400">
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                Free 50 reviews/month
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                2-min setup
              </span>
            </div>
          </motion.div>

          {/* Right: Slack simulation */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:block"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-accent-500/10 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-3xl shadow-2xl border border-surface-100 overflow-hidden">
                {/* Slack header */}
                <div className="bg-surface-800 px-6 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-white/80 text-sm font-medium"># code-reviews</span>
                </div>

                {/* Messages */}
                <div className="p-6 space-y-5">
                  {/* User message */}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">M</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">Mert</span>
                        <span className="text-xs text-surface-400">11:23 AM</span>
                      </div>
                      <p className="text-sm text-surface-600 mt-1">
                        <span className="text-brand-500">@CodeGuard</span> review{" "}
                        <span className="text-brand-500 underline">github.com/acme/api/pull/142</span>
                      </p>
                    </div>
                  </div>

                  {/* Bot reply */}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">CodeGuard AI</span>
                        <span className="bg-brand-100 text-brand-700 text-[10px] px-1.5 py-0.5 rounded font-bold">APP</span>
                        <span className="text-xs text-surface-400">11:23 AM</span>
                      </div>
                      <div className="mt-2 bg-surface-50 border border-surface-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🔍</span>
                          <span className="font-semibold text-sm">Analysis Complete — PR #142</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3 text-center">
                          <div className="bg-white rounded-lg p-2 border border-surface-100">
                            <div className="text-xl font-bold text-red-500">3</div>
                            <div className="text-[11px] text-surface-400">Violations</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-surface-100">
                            <div className="text-xl font-bold text-amber-500">5</div>
                            <div className="text-[11px] text-surface-400">Warnings</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 border border-surface-100">
                            <div className="text-xl font-bold text-brand-500">78</div>
                            <div className="text-[11px] text-surface-400">Score</div>
                          </div>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-start gap-2 text-red-600">
                            <span className="mt-0.5">●</span>
                            <span><b>SRP Violation</b> — UserService.ts has 12 methods with mixed concerns</span>
                          </div>
                          <div className="flex items-start gap-2 text-red-600">
                            <span className="mt-0.5">●</span>
                            <span><b>DIP Violation</b> — Direct instantiation of PaymentGateway</span>
                          </div>
                          <div className="flex items-start gap-2 text-amber-600">
                            <span className="mt-0.5">●</span>
                            <span><b>Complexity</b> — processOrder() has 45 lines, 6 nesting levels</span>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button className="flex-1 text-xs font-semibold text-white bg-brand-500 rounded-lg py-2 hover:bg-brand-600 transition-colors">
                            🔧 Auto-Fix & Create PR
                          </button>
                          <button className="flex-1 text-xs font-semibold text-surface-600 bg-white border border-surface-200 rounded-lg py-2 hover:bg-surface-50 transition-colors">
                            📋 View Full Report
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
