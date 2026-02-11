"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

interface SidebarUser {
  id?: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  teamId?: string;
  teamSlug?: string;
  teamPlan?: string;
  teamRole?: string;
}

const navItems = [
  { label: "Overview", href: "/dashboard", icon: "📊" },
  { label: "Reviews", href: "/dashboard/reviews", icon: "🔍" },
  { label: "Rules", href: "/dashboard/rules", icon: "📏" },
  { label: "Integrations", href: "/dashboard/integrations", icon: "🔗" },
  { label: "Settings", href: "/dashboard/settings", icon: "⚙️" },
];

const planLimits: Record<string, number> = {
  free: 50,
  pro: 500,
  enterprise: 9999,
};

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();

  const displayName = user.name || user.email?.split("@")[0] || "User";
  const initials = displayName.charAt(0).toUpperCase();
  const plan = user.teamPlan || "free";
  const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1) + " Plan";

  return (
    <aside className="w-64 bg-surface-900 text-white flex flex-col min-h-screen">
      <div className="p-5 border-b border-surface-700">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span className="text-lg font-bold">CodeGuard</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                isActive ? "bg-brand-500/20 text-brand-400" : "text-surface-400 hover:text-white hover:bg-surface-800"
              )}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-surface-700">
        <div className="flex items-center gap-3 px-2 mb-3">
          {user.image ? (
            <Image
              src={user.image}
              alt={displayName}
              width={32}
              height={32}
              className="w-8 h-8 rounded-full"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-500 flex items-center justify-center text-white font-bold text-xs">
              {initials}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{displayName}</div>
            <div className="text-xs text-surface-400 truncate">{planLabel}</div>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-surface-400 hover:text-white hover:bg-surface-800 transition-all"
        >
          <span className="text-lg">🚪</span>
          Sign Out
        </button>
      </div>
    </aside>
  );
}
