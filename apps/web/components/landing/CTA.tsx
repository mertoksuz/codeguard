"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useSession } from "next-auth/react";

export function CTA() {
  const { status } = useSession();
  const isLoggedIn = status === "authenticated";
  return (
    <section className="py-24 bg-gradient-to-br from-surface-900 via-surface-800 to-surface-900 relative overflow-hidden">
      <div className="absolute inset-0 dot-pattern opacity-10" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="relative max-w-3xl mx-auto text-center px-4"
      >
        <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          Ready to ship{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-400 to-accent-400">
            cleaner code
          </span>
          ?
        </h2>
        <p className="mt-6 text-lg text-surface-300 max-w-xl mx-auto">
          Join thousands of teams who use CodeGuard AI to maintain code quality,
          enforce best practices, and ship faster.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href={isLoggedIn ? "/dashboard" : "/auth/register"}
            className="inline-flex items-center gap-2 bg-white text-surface-900 font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-surface-100 transition-all shadow-xl"
          >
            {isLoggedIn ? "Go to Dashboard" : "Start Free Trial"}
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 text-white font-medium px-8 py-4 rounded-2xl border border-white/20 hover:bg-white/10 transition-all"
          >
            View Pricing
          </a>
        </div>
      </motion.div>
    </section>
  );
}
