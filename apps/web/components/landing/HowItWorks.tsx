"use client";

import { motion } from "framer-motion";

const steps = [
  { num: "01", title: "Connect", desc: "Install the CodeGuard Slack app and connect your GitHub organization. Takes under 2 minutes.", color: "from-brand-700 to-brand-500" },
  { num: "02", title: "Share", desc: "Share a PR link in any Slack channel, or let CodeGuard auto-detect new PRs via webhooks.", color: "from-brand-500 to-brand-400" },
  { num: "03", title: "Analyze", desc: "AI scans every file in the PR against SOLID principles, clean code rules, and your custom config.", color: "from-brand-400 to-accent-500" },
  { num: "04", title: "Fix", desc: "Review the analysis, click Auto-Fix, and a clean PR with all fixes is created automatically.", color: "from-accent-500 to-accent-400" },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-4xl font-extrabold tracking-tight">
            How it <span className="gradient-text">works</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            From PR to fix in minutes, not hours.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="relative text-center"
            >
              {i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-10 left-[60%] w-[80%] h-px bg-gradient-to-r from-surface-200 to-transparent" />
              )}
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white font-extrabold text-2xl mx-auto mb-5 shadow-lg`}>
                {step.num}
              </div>
              <h3 className="text-xl font-bold text-surface-900 mb-2">{step.title}</h3>
              <p className="text-sm text-surface-500 leading-relaxed">{step.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
