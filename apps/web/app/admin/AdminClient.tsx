"use client";

import { useState, useEffect } from "react";

interface TeamMember {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: string;
}

interface TeamData {
  id: string;
  name: string;
  slug: string;
  plan: string;
  reviewsUsedThisMonth: number;
  createdAt: string;
  members: TeamMember[];
  subscription: {
    status: string;
    interval: string;
    currentPeriodEnd: string | null;
  } | null;
  _count: { reviews: number; repositories: number; customRules: number };
}

const PLANS = ["FREE", "PRO", "ENTERPRISE"] as const;

const planColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
  ENTERPRISE: "bg-purple-100 text-purple-700",
};

export default function AdminClient() {
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  async function fetchTeams() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/teams");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTeams(data.teams);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handlePlanChange(teamId: string, newPlan: string) {
    setUpdating(teamId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/teams", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, plan: newPlan }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessage({ type: "success", text: `${data.teamId}: ${data.oldPlan} → ${data.newPlan}` });
      // Refresh
      await fetchTeams();
    } catch (err: any) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 mt-1">Manage teams and plans</p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/admin/tickets"
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              🎫 Support Tickets
            </a>
            <a
              href="/dashboard"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ← Back to Dashboard
            </a>
          </div>
        </div>

        {message && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm font-medium ${
              message.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.type === "success" ? "✅" : "❌"} {message.text}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading teams...</div>
        ) : (
          <div className="space-y-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Team Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-900 truncate">
                        {team.name}
                      </h3>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          planColors[team.plan] || planColors.FREE
                        }`}
                      >
                        {team.plan}
                      </span>
                      {team.subscription && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-50 text-green-600 font-medium">
                          {team.subscription.status} · {team.subscription.interval}
                        </span>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 space-y-1">
                      <div>
                        <span className="font-medium text-gray-600">Slug:</span> {team.slug}
                      </div>
                      <div>
                        <span className="font-medium text-gray-600">ID:</span>{" "}
                        <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">
                          {team.id}
                        </code>
                      </div>
                      <div className="flex gap-4">
                        <span>
                          📊 {team._count.reviews} reviews
                        </span>
                        <span>
                          📁 {team._count.repositories} repos
                        </span>
                        <span>
                          📏 {team._count.customRules} custom rules
                        </span>
                        <span>
                          🔄 {team.reviewsUsedThisMonth} used this month
                        </span>
                      </div>
                    </div>

                    {/* Members */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {team.members.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-center gap-1.5 text-xs bg-gray-50 border border-gray-200 rounded-full px-2.5 py-1"
                        >
                          {m.image ? (
                            <img
                              src={m.image}
                              alt=""
                              className="w-4 h-4 rounded-full"
                            />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[8px] font-bold text-white">
                              {(m.name || "?")[0]}
                            </div>
                          )}
                          <span className="text-gray-700">{m.name || m.email}</span>
                          <span className="text-gray-400">({m.role})</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Plan Switch Buttons */}
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <span className="text-xs font-medium text-gray-500 text-center mb-1">
                      Switch Plan
                    </span>
                    {PLANS.map((p) => (
                      <button
                        key={p}
                        disabled={team.plan === p || updating === team.id}
                        onClick={() => handlePlanChange(team.id, p)}
                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                          team.plan === p
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : p === "ENTERPRISE"
                            ? "bg-purple-600 text-white hover:bg-purple-700"
                            : p === "PRO"
                            ? "bg-blue-600 text-white hover:bg-blue-700"
                            : "bg-gray-600 text-white hover:bg-gray-700"
                        } disabled:opacity-50`}
                      >
                        {updating === team.id ? "..." : p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {teams.length === 0 && (
              <div className="text-center py-12 text-gray-400">No teams found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
