"use client";

import { motion } from "framer-motion";

const features = [
  { icon: "🔍", title: "SOLID Analysis", desc: "Detects SRP, OCP, LSP, ISP, and DIP violations across your entire codebase with surgical precision." },
  { icon: "🤖", title: "AI-Powered Fixes", desc: "GPT-4o generates context-aware code fixes that respect your project's patterns and conventions." },
  { icon: "💬", title: "Slack Integration", desc: "Share a PR link in Slack, get instant analysis. Review results right where your team communicates." },
  { icon: "🔧", title: "Auto-Fix PRs", desc: "One click to generate a fix PR with all violations resolved, ready for review and merge." },
  { icon: "📊", title: "Quality Dashboard", desc: "Track code quality trends, team improvements, and violation patterns over time." },
  { icon: "⚙️", title: "Custom Rules", desc: "Configure rule severity, enable/disable checks, and create custom rules for your architecture." },
];

export function Features() {
  return (
    <section id="features" className="py-24 bg-surface-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-4xl font-extrabold tracking-tight">
            Everything you need for{" "}
            <span className="gradient-text">clean code</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            From detection to auto-fix, CodeGuard AI handles the complete code
            quality pipeline.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="group bg-white rounded-2xl p-6 border border-surface-100 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform">
                {f.icon}
              </div>
              <h3 className="text-lg font-bold text-surface-900 mb-2">{f.title}</h3>
              <p className="text-sm text-surface-500 leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
