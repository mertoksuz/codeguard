import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CodeGuard AI — Automated Code Review & SOLID Principle Enforcement",
  description:
    "AI-powered Slack bot that analyzes your PRs, detects SOLID principle violations, and auto-fixes code. Ship better code, faster.",
  keywords: [
    "code review",
    "SOLID principles",
    "AI",
    "Slack bot",
    "pull request",
    "automation",
  ],
  openGraph: {
    title: "CodeGuard AI",
    description: "AI-powered code review that enforces SOLID principles",
    type: "website",
    url: "https://codeguard.ai",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
