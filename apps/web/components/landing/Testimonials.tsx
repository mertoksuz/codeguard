"use client";

import { motion } from "framer-motion";

const testimonials = [
  { name: "Sarah Chen", role: "Engineering Lead at Acme", text: "CodeGuard caught SOLID violations that slipped through our manual reviews. Our codebase quality improved dramatically in just 2 weeks.", avatar: "SC" },
  { name: "Alex Rivera", role: "CTO at StartupXYZ", text: "The auto-fix feature is magic. What used to take hours of refactoring now happens with a single click. Our team ships 40% faster.", avatar: "AR" },
  { name: "James Park", role: "Senior Developer at TechCo", text: "Finally, a tool that doesn't just point out problems but actually fixes them. The Slack integration makes it seamless with our workflow.", avatar: "JP" },
  { name: "Maya Johnson", role: "VP Engineering at DataFlow", text: "We onboarded 50 developers and saw an immediate drop in PR review time. The SOLID analysis is impressively accurate.", avatar: "MJ" },
  { name: "Tom Wilson", role: "Tech Lead at CloudScale", text: "The quality score tracking helped us set and achieve concrete code quality goals across the entire engineering org.", avatar: "TW" },
  { name: "Lisa Zhang", role: "Principal Engineer at FinTech", text: "Enterprise-grade analysis with a consumer-grade UX. Rare to see both in the same tool. Highly recommended.", avatar: "LZ" },
];

export function Testimonials() {
  return (
    <section id="testimonials" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center max-w-2xl mx-auto mb-16"
        >
          <h2 className="text-4xl font-extrabold tracking-tight">
            Loved by <span className="gradient-text">developers</span>
          </h2>
          <p className="mt-4 text-lg text-surface-500">
            Teams worldwide trust CodeGuard AI to maintain code quality.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="bg-surface-50 rounded-2xl p-6 border border-surface-100"
            >
              <div className="flex items-center gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <svg key={j} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-surface-600 leading-relaxed mb-4">&ldquo;{t.text}&rdquo;</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-white font-bold text-xs">
                  {t.avatar}
                </div>
                <div>
                  <div className="text-sm font-semibold text-surface-900">{t.name}</div>
                  <div className="text-xs text-surface-400">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
