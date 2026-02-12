"use client";

import { motion } from "framer-motion";

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-20"
        >
          <h2 className="text-4xl font-extrabold tracking-tight">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            From PR to fix in minutes, not hours.
          </p>
        </motion.div>

        <div className="space-y-28 lg:space-y-32">
          {/* ─── Step 1: Connect ─── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
          >
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-xs font-bold mb-4">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-700 to-brand-500 flex items-center justify-center text-white text-[10px] font-extrabold">1</span>
                CONNECT
              </div>
              <h3 className="text-3xl font-extrabold text-surface-900 mb-4">
                Link GitHub & Slack in under 2 minutes
              </h3>
              <p className="text-surface-500 leading-relaxed mb-6">
                Install the CodeGuard bot in your Slack workspace and connect your GitHub organization. One-click OAuth for both — no config files, no tokens to manage.
              </p>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-2 text-sm text-surface-600 bg-surface-50 px-3 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  GitHub OAuth
                </div>
                <div className="flex items-center gap-2 text-sm text-surface-600 bg-surface-50 px-3 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Slack App Install
                </div>
                <div className="flex items-center gap-2 text-sm text-surface-600 bg-surface-50 px-3 py-1.5 rounded-lg">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Auto Webhook Setup
                </div>
              </div>
            </div>

            {/* Visual: Integration Cards */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-accent-500/5 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-surface-100 shadow-xl p-6 space-y-4">
                {/* GitHub Card */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-surface-100 bg-surface-50/50">
                  <div className="w-12 h-12 rounded-xl bg-surface-900 flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-surface-900">GitHub</div>
                    <div className="text-xs text-surface-400">mertoksuz/codeguard</div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Connected
                  </div>
                </div>

                {/* Slack Card */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-surface-100 bg-surface-50/50">
                  <div className="w-12 h-12 rounded-xl bg-[#4A154B] flex items-center justify-center shrink-0">
                    <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M5.042 15.165a2.528 2.528 0 01-2.52 2.523A2.528 2.528 0 010 15.165a2.527 2.527 0 012.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 012.521-2.52 2.527 2.527 0 012.521 2.52v6.313A2.528 2.528 0 018.834 24a2.528 2.528 0 01-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 01-2.521-2.52A2.528 2.528 0 018.834 0a2.528 2.528 0 012.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 012.521 2.521 2.528 2.528 0 01-2.521 2.521H2.522A2.528 2.528 0 010 8.834a2.528 2.528 0 012.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 012.522-2.521A2.528 2.528 0 0124 8.834a2.528 2.528 0 01-2.522 2.521h-2.522V8.834zm-1.27 0a2.528 2.528 0 01-2.523 2.521 2.527 2.527 0 01-2.52-2.521V2.522A2.527 2.527 0 0115.163 0a2.528 2.528 0 012.523 2.522v6.312zM15.163 18.956a2.528 2.528 0 012.523 2.522A2.528 2.528 0 0115.163 24a2.527 2.527 0 01-2.52-2.522v-2.522h2.52zm0-1.27a2.527 2.527 0 01-2.52-2.523 2.527 2.527 0 012.52-2.52h6.315A2.528 2.528 0 0124 15.163a2.528 2.528 0 01-2.522 2.523h-6.315z" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-surface-900">Slack</div>
                    <div className="text-xs text-surface-400">#code-reviews channel</div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                    Connected
                  </div>
                </div>

                {/* Webhook Status */}
                <div className="flex items-center gap-4 p-4 rounded-xl border border-brand-100 bg-brand-50/30">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.813a4.5 4.5 0 00-6.364-6.364L4.5 8.25a4.5 4.5 0 006.364 6.364l4.5-4.5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-surface-900">Webhook Active</div>
                    <div className="text-xs text-surface-400">Auto-triggers on new PRs</div>
                  </div>
                  <div className="flex items-center gap-1.5 bg-brand-50 text-brand-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                    Live
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Connector ─── */}
          <div className="hidden lg:flex justify-center -my-20">
            <div className="w-px h-16 bg-gradient-to-b from-brand-200 to-brand-400" />
          </div>

          {/* ─── Step 2: Send ─── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
          >
            {/* Visual: Slack Message (LEFT on desktop) */}
            <div className="relative order-2 lg:order-1">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-500/5 to-accent-500/5 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-surface-100 shadow-xl overflow-hidden">
                {/* Slack Header */}
                <div className="bg-[#1A1D21] px-5 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-white/40 text-sm">#</span>
                    <span className="text-white/80 text-sm font-medium">code-reviews</span>
                  </div>
                </div>

                {/* Messages */}
                <div className="p-5 space-y-4 bg-white">
                  {/* User Message */}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-brand-100 flex items-center justify-center text-brand-600 font-bold text-sm shrink-0">M</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-surface-900">Mert</span>
                        <span className="text-[11px] text-surface-400">11:23 AM</span>
                      </div>
                      <p className="text-sm text-surface-600 mt-0.5">
                        <span className="text-brand-500 font-medium">@CodeGuard</span> review{" "}
                        <span className="text-brand-500 underline decoration-brand-300">github.com/acme/api/pull/142</span>
                      </p>
                    </div>
                  </div>

                  {/* Bot Typing */}
                  <div className="flex gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shrink-0">
                      <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                      </svg>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-surface-900">CodeGuard AI</span>
                        <span className="bg-brand-100 text-brand-700 text-[10px] px-1.5 py-0.5 rounded font-bold">APP</span>
                        <span className="text-[11px] text-surface-400">11:23 AM</span>
                      </div>
                      <div className="mt-1.5 bg-surface-50 border border-surface-200 rounded-xl px-4 py-3">
                        <div className="flex items-center gap-2 text-sm text-surface-500">
                          <svg className="w-4 h-4 animate-spin text-brand-500" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Analyzing PR #142 — scanning 12 files...
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Text (RIGHT on desktop) */}
            <div className="order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 bg-brand-50 text-brand-600 px-3 py-1 rounded-full text-xs font-bold mb-4">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-500 to-brand-400 flex items-center justify-center text-white text-[10px] font-extrabold">2</span>
                SEND
              </div>
              <h3 className="text-3xl font-extrabold text-surface-900 mb-4">
                Share a PR link in Slack
              </h3>
              <p className="text-surface-500 leading-relaxed mb-6">
                Just mention <strong className="text-surface-700">@CodeGuard</strong> with a PR link in any channel. The bot instantly picks it up, fetches the diff, and starts AI analysis. Or set up auto-detection — every new PR gets reviewed automatically.
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-surface-900">Slack Mention</div>
                    <div className="text-xs text-surface-500">@CodeGuard review [PR link]</div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-brand-50 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-surface-900">Auto-Detection</div>
                    <div className="text-xs text-surface-500">Webhook triggers on every new PR</div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ─── Connector ─── */}
          <div className="hidden lg:flex justify-center -my-20">
            <div className="w-px h-16 bg-gradient-to-b from-brand-300 to-accent-400" />
          </div>

          {/* ─── Step 3: Results ─── */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center"
          >
            {/* Text */}
            <div>
              <div className="inline-flex items-center gap-2 bg-accent-50 text-accent-600 px-3 py-1 rounded-full text-xs font-bold mb-4">
                <span className="w-5 h-5 rounded-full bg-gradient-to-br from-accent-500 to-accent-400 flex items-center justify-center text-white text-[10px] font-extrabold">3</span>
                RESULTS
              </div>
              <h3 className="text-3xl font-extrabold text-surface-900 mb-4">
                Get instant analysis & auto-fix PRs
              </h3>
              <p className="text-surface-500 leading-relaxed mb-6">
                View a detailed breakdown of every SOLID violation, code smell, and quality issue — grouped by file with severity, line numbers, and actionable suggestions. One click generates a fix PR.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="text-2xl font-extrabold text-surface-900">78</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">Quality Score</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="text-2xl font-extrabold text-red-500">3</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">Violations</div>
                </div>
                <div className="text-center p-3 rounded-xl bg-surface-50 border border-surface-100">
                  <div className="text-2xl font-extrabold text-green-500">1-click</div>
                  <div className="text-[11px] text-surface-400 mt-0.5">Auto-Fix</div>
                </div>
              </div>
            </div>

            {/* Visual: Analysis Dashboard */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-accent-500/5 to-brand-500/5 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-2xl border border-surface-100 shadow-xl overflow-hidden">
                {/* Browser Header */}
                <div className="bg-surface-900 px-5 py-3 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                    <div className="w-3 h-3 rounded-full bg-green-400/80" />
                  </div>
                  <span className="text-white/60 text-xs font-mono">codeguard-ai.vercel.app/dashboard/reviews/142</span>
                </div>

                {/* Analysis Content */}
                <div className="p-5 space-y-4">
                  {/* Score Row */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold text-surface-900">PR #142 — Refactor auth module</div>
                      <div className="text-xs text-surface-400 mt-0.5">12 files changed · 342 additions · 89 deletions</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-2xl font-extrabold text-brand-500">78</div>
                        <div className="text-[10px] text-surface-400">Score</div>
                      </div>
                      <div className="w-10 h-10 rounded-full border-[3px] border-brand-500 flex items-center justify-center">
                        <svg className="w-5 h-5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  {/* Issues */}
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                      <span className="shrink-0 w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">E</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-700">SRP Violation</span>
                          <span className="text-[10px] text-red-400">UserService.ts:24</span>
                        </div>
                        <p className="text-xs text-red-600/80 mt-0.5">Class has 12 methods with mixed authentication and profile concerns</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 border border-red-100">
                      <span className="shrink-0 w-5 h-5 rounded bg-red-500 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">E</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-red-700">DIP Violation</span>
                          <span className="text-[10px] text-red-400">OrderService.ts:67</span>
                        </div>
                        <p className="text-xs text-red-600/80 mt-0.5">Direct instantiation of PaymentGateway — use dependency injection</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100">
                      <span className="shrink-0 w-5 h-5 rounded bg-amber-500 text-white flex items-center justify-center text-[10px] font-bold mt-0.5">W</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-700">Complexity</span>
                          <span className="text-[10px] text-amber-400">processOrder.ts:12</span>
                        </div>
                        <p className="text-xs text-amber-600/80 mt-0.5">Function has 45 lines with 6 nesting levels — consider extracting</p>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button className="flex-1 flex items-center justify-center gap-2 text-xs font-semibold text-white bg-gradient-to-r from-brand-500 to-brand-600 rounded-lg py-2.5 shadow-lg shadow-brand-500/20">
                      <span>🔧</span>
                      Auto-Fix &amp; Create PR
                    </button>
                    <button className="flex-1 text-xs font-semibold text-surface-600 bg-white border border-surface-200 rounded-lg py-2.5">
                      📋 View Full Report
                    </button>
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
