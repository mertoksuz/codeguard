"use client";

import { useState, useEffect } from "react";

interface TicketUser {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
}

interface TicketTeam {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  priority: string;
  user: TicketUser;
  team: TicketTeam;
  messageCount: number;
  lastMessage: { body: string; isAdmin: boolean; createdAt: string } | null;
  createdAt: string;
  updatedAt: string;
}

interface TicketMessage {
  id: string;
  body: string;
  isAdmin: boolean;
  createdAt: string;
  user: { id: string; name: string | null; image: string | null };
}

interface TicketDetail {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  userId: string;
  teamId: string;
  messages: TicketMessage[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Open", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  AWAITING_REPLY: { label: "Awaiting Reply", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  RESPONDED: { label: "Responded", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  CLOSED: { label: "Closed", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

const priorityColors: Record<string, string> = {
  LOW: "text-gray-500",
  NORMAL: "text-blue-600",
  HIGH: "text-orange-600",
  URGENT: "text-red-600 font-bold",
};

const planColors: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-700",
  PRO: "bg-blue-100 text-blue-700",
  ENTERPRISE: "bg-purple-100 text-purple-700",
};

const STATUS_OPTIONS = ["OPEN", "AWAITING_REPLY", "RESPONDED", "CLOSED"];

export default function AdminTicketsClient() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Reply
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchTickets();
  }, [filterStatus]);

  async function fetchTickets() {
    setLoading(true);
    try {
      const params = filterStatus !== "ALL" ? `?status=${filterStatus}` : "";
      const res = await fetch(`/api/admin/tickets${params}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTickets(data.tickets);
    } catch (err: any) {
      setToast({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function openTicket(id: string) {
    setSelectedId(id);
    setDetailLoading(true);
    setReply("");
    try {
      // Use user-level API as admin to fetch detail — or we can just use the ticket from list
      // Actually, admin needs full message thread. Let's fetch via a separate call.
      const res = await fetch(`/api/tickets/${id}`);
      // This won't work for admin since it filters by userId. We need to call differently.
      // Let's create a workaround: fetch messages from admin context
      if (!res.ok) {
        // Fallback: use admin endpoint + ticket ID in body
        // For now, just show what we have
        throw new Error("Use admin detail fetch");
      }
      const data = await res.json();
      setDetail(data.ticket);
    } catch {
      // Fetch messages directly
      try {
        const res = await fetch(`/api/admin/tickets/detail?ticketId=${id}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setDetail(data.ticket);
      } catch (err: any) {
        setToast({ type: "error", text: err.message });
        setSelectedId(null);
      }
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || !reply.trim()) return;
    setReplying(true);
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId: selectedId, action: "reply", message: reply }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReply("");
      setToast({ type: "success", text: "Reply sent!" });
      openTicket(selectedId);
      fetchTickets();
    } catch (err: any) {
      setToast({ type: "error", text: err.message });
    } finally {
      setReplying(false);
    }
  }

  async function handleStatusChange(ticketId: string, status: string) {
    try {
      const res = await fetch("/api/admin/tickets", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticketId, action: "status", status }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setToast({ type: "success", text: `Status → ${status}` });
      fetchTickets();
      if (detail && detail.id === ticketId) {
        setDetail({ ...detail, status });
      }
    } catch (err: any) {
      setToast({ type: "error", text: err.message });
    }
  }

  function timeAgo(date: string) {
    const now = Date.now();
    const d = new Date(date).getTime();
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  const openCount = tickets.filter((t) => t.status === "OPEN").length;
  const awaitingCount = tickets.filter((t) => t.status === "AWAITING_REPLY").length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900">Support Tickets</h1>
            <p className="text-gray-500 mt-1">
              {openCount} open · {awaitingCount} awaiting reply · {tickets.length} total
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin" className="text-sm text-blue-600 hover:text-blue-800 font-medium">
              ← Admin Panel
            </a>
          </div>
        </div>

        {toast && (
          <div
            className={`mb-4 p-3 rounded-xl text-sm font-medium ${
              toast.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {toast.type === "success" ? "✅" : "❌"} {toast.text}
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex gap-1 mb-6 bg-white rounded-xl border border-gray-200 p-1 w-fit">
          {["ALL", ...STATUS_OPTIONS].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filterStatus === s
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
              }`}
            >
              {s === "ALL" ? "All" : (statusConfig[s]?.label || s)}
            </button>
          ))}
        </div>

        <div className="flex gap-6">
          {/* Ticket List */}
          <div className={`${selectedId ? "w-1/2" : "w-full"} space-y-2 transition-all`}>
            {loading ? (
              <div className="text-center py-12 text-gray-400">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                No tickets found
              </div>
            ) : (
              tickets.map((t) => {
                const sc = statusConfig[t.status] || statusConfig.OPEN;
                const isSelected = selectedId === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t.id)}
                    className={`w-full text-left rounded-xl border p-4 transition-all ${
                      isSelected
                        ? "border-blue-400 bg-blue-50 ring-1 ring-blue-400"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-gray-900 text-sm truncate">{t.subject}</span>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                          {t.priority !== "NORMAL" && (
                            <span className={`text-[10px] font-semibold ${priorityColors[t.priority]}`}>
                              ● {t.priority}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          {t.user.image && (
                            <img src={t.user.image} alt="" className="w-4 h-4 rounded-full" />
                          )}
                          <span>{t.user.name || t.user.email}</span>
                          <span>·</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${planColors[t.team.plan] || ""}`}>
                            {t.team.plan}
                          </span>
                          <span>{t.team.name}</span>
                        </div>
                        {t.lastMessage && (
                          <p className="text-xs text-gray-400 mt-1 truncate">
                            {t.lastMessage.isAdmin ? "You: " : ""}{t.lastMessage.body}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-[11px] text-gray-400">{timeAgo(t.updatedAt)}</div>
                        <div className="text-[11px] text-gray-400">{t.messageCount} msg</div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Detail Panel */}
          {selectedId && (
            <div className="w-1/2 sticky top-8 self-start">
              {detailLoading ? (
                <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
                  Loading...
                </div>
              ) : detail ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  {/* Detail Header */}
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-gray-900">{detail.subject}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(detail.createdAt).toLocaleDateString("tr-TR", {
                            day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </p>
                      </div>
                      <button
                        onClick={() => { setSelectedId(null); setDetail(null); }}
                        className="text-gray-400 hover:text-gray-600 text-lg"
                      >
                        ×
                      </button>
                    </div>
                    {/* Status Actions */}
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {STATUS_OPTIONS.map((s) => {
                        const sc = statusConfig[s];
                        return (
                          <button
                            key={s}
                            onClick={() => handleStatusChange(detail.id, s)}
                            disabled={detail.status === s}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all ${
                              detail.status === s
                                ? `${sc.bg} ${sc.color} ring-1 ring-current`
                                : "border-gray-200 text-gray-500 hover:border-gray-300"
                            }`}
                          >
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {detail.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`rounded-lg p-3 ${
                          msg.isAdmin
                            ? "bg-blue-50 border border-blue-100 ml-4"
                            : "bg-gray-50 border border-gray-100 mr-4"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 mb-1">
                          {msg.user.image ? (
                            <img src={msg.user.image} alt="" className="w-5 h-5 rounded-full" />
                          ) : (
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${msg.isAdmin ? "bg-blue-500" : "bg-gray-400"}`}>
                              {(msg.user.name || "?")[0]}
                            </div>
                          )}
                          <span className="text-xs font-medium text-gray-700">
                            {msg.user.name || "User"}
                            {msg.isAdmin && <span className="ml-1 text-blue-600 text-[10px]">Admin</span>}
                          </span>
                          <span className="text-[10px] text-gray-400">{timeAgo(msg.createdAt)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.body}</p>
                      </div>
                    ))}
                  </div>

                  {/* Admin Reply */}
                  {detail.status !== "CLOSED" && (
                    <form onSubmit={handleReply} className="p-4 border-t border-gray-100">
                      <textarea
                        value={reply}
                        onChange={(e) => setReply(e.target.value)}
                        placeholder="Write a reply as admin..."
                        rows={3}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none mb-2"
                      />
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={replying || !reply.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                          {replying ? "Sending..." : "Reply as Admin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(detail.id, "CLOSED")}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
                        >
                          Close Ticket
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
