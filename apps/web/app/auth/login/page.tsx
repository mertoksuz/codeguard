"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  const handleGitHubLogin = () => {
    setLoading(true);
    signIn("github", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="min-h-screen flex">
      {/* Left: Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <Link href="/" className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span className="text-xl font-bold">Code<span className="gradient-text">Guard</span></span>
          </Link>

          <h1 className="text-3xl font-extrabold text-surface-900">Welcome back</h1>
          <p className="mt-2 text-surface-500">Log in to your CodeGuard AI account</p>

          <div className="mt-8">
            <button
              onClick={handleGitHubLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-surface-900 text-white rounded-xl py-3.5 text-sm font-semibold hover:bg-surface-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" fill="currentColor"/></svg>
              )}
              {loading ? "Redirecting..." : "Continue with GitHub"}
            </button>
          </div>

          <p className="mt-8 text-center text-sm text-surface-500">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="text-brand-500 font-semibold hover:text-brand-600">Sign up free</Link>
          </p>
        </div>
      </div>

      {/* Right: Visual */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-brand-500 to-brand-700 items-center justify-center p-12">
        <div className="max-w-md text-white text-center">
          <div className="text-6xl mb-6">🛡️</div>
          <h2 className="text-3xl font-extrabold">Code Quality, Automated</h2>
          <p className="mt-4 text-brand-100 leading-relaxed">
            SOLID principle enforcement, AI-powered fixes, and Slack-native workflow — all in one platform.
          </p>
        </div>
      </div>
    </div>
  );
}
