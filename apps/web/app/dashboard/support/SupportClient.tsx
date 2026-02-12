"use client";

import { useState, useEffect } from "react";

interface TicketSummary {
  id: string;
  subject: string;
  status: string;
  priority: string;
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
  messages: TicketMessage[];
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: "Open", color: "text-blue-700", bg: "bg-blue-50 border-blue-200" },
  AWAITING_REPLY: { label: "Awaiting Reply", color: "text-amber-700", bg: "bg-amber-50 border-amber-200" },
  RESPONDED: { label: "Responded", color: "text-green-700", bg: "bg-green-50 border-green-200" },
  CLOSED: { label: "Closed", color: "text-gray-500", bg: "bg-gray-50 border-gray-200" },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  LOW: { label: "Low", color: "text-gray-500" },
  NORMAL: { label: "Normal", color: "text-blue-600" },
  HIGH: { label: "High", color: "text-orange-600" },
  URGENT: { label: "Urgent", color: "text-red-600" },
};

export default function SupportClient() {
  const [tickets, setTickets] = useState<TicketSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "new" | "detail">("list");
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // New ticket form
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("NORMAL");
  const [submitting, setSubmitting] = useState(false);

  // Reply
  const [reply, setReply] = useState("");
  const [replying, setReplying] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  async function fetchTickets() {
    setLoading(true);
    try {
      const res = await fetch("/api/tickets");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTickets(data.tickets);
    } catch (err: any) {
      setToast({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setToast(null);
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setToast({ type: "success", text: "Ticket created successfully!" });
      setSubject("");
      setMessage("");
      setPriority("NORMAL");
      setView("list");
      fetchTickets();
    } catch (err: any) {
      setToast({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  }

  async function openTicket(id: string) {
    setDetailLoading(true);
    setView("detail");
    try {
      const res = await fetch(`/api/tickets/${id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSelectedTicket(data.ticket);
    } catch (err: any) {
      setToast({ type: "error", text: err.message });
      setView("list");
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !reply.trim()) return;
    setReplying(true);
    try {
      const res = await fetch(`/api/tickets/${selectedTicket.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setReply("");
      // Refresh ticket detail
      openTicket(selectedTicket.id);
      fetchTickets();
    } catch (err: any) {
      setToast({ type: "error", text: err.message });
    } finally {
      setReplying(false);
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

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900">Support</h1>
          <p className="text-surface-500 mt-1">Need help? Submit a ticket and we&apos;ll get back to you</p>
        </div>
        {view === "list" && (
          <button
            onClick={() => { setView("new"); setToast(null); }}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
          >
            + New Ticket
          </button>
        )}
        {view !== "list" && (
          <button
            onClick={() => { setView("list"); setSelectedTicket(null); setToast(null); }}
            className="text-sm text-surface-500 hover:text-surface-700"
          >
            ← Back to tickets
          </button>
        )}
      </div>

      {toast && (
        <div
          className={`mb-6 p-4 rounded-xl text-sm font-medium ${
            toast.type === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {toast.type === "success" ? "✅" : "❌"} {toast.text}
        </div>
      )}

      {/* ─── New Ticket Form ─── */}
      {view === "new" && (
        <div className="max-w-2xl">
          <div className="bg-white rounded-xl border border-surface-200 p-6">
            <h2 className="text-lg font-bold text-surface-900 mb-4">Create a Ticket</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Brief summary of your issue"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  <option value="LOW">Low</option>
                  <option value="NORMAL">Normal</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Message</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Describe your issue in detail..."
                  required
                  rows={6}
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Ticket"}
                </button>
                <button
                  type="button"
                  onClick={() => setView("list")}
                  className="px-5 py-2.5 bg-surface-100 text-surface-600 rounded-xl text-sm font-medium hover:bg-surface-200 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Ticket List ─── */}
      {view === "list" && (
        <>
          {loading ? (
            <div className="text-center py-12 text-surface-400">Loading tickets...</div>
          ) : tickets.length === 0 ? (
            <div className="bg-white rounded-xl border border-surface-200 p-12 text-center">
              <div className="text-4xl mb-3">🎫</div>
              <h3 className="text-lg font-semibold text-surface-700 mb-1">No tickets yet</h3>
              <p className="text-surface-400 text-sm mb-4">Create a ticket to get help from our team</p>
              <button
                onClick={() => setView("new")}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-semibold hover:bg-brand-700 transition-colors"
              >
                + New Ticket
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => {
                const sc = statusConfig[t.status] || statusConfig.OPEN;
                const pc = priorityConfig[t.priority] || priorityConfig.NORMAL;
                return (
                  <button
                    key={t.id}
                    onClick={() => openTicket(t.id)}
                    className="w-full text-left bg-white rounded-xl border border-surface-200 p-5 hover:border-brand-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-surface-900 truncate">{t.subject}</h3>
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sc.bg} ${sc.color}`}>
                            {sc.label}
                          </span>
                          {t.priority !== "NORMAL" && (
                            <span className={`text-[11px] font-semibold ${pc.color}`}>
                              {pc.label}
                            </span>
                          )}
                        </div>
                        {t.lastMessage && (
                          <p className="text-sm text-surface-500 truncate">
                            {t.lastMessage.isAdmin && (
                              <span className="text-brand-600 font-medium">Admin: </span>
                            )}
                            {t.lastMessage.body}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs text-surface-400">{timeAgo(t.updatedAt)}</div>
                        <div className="text-xs text-surface-400 mt-0.5">{t.messageCount} msg{t.messageCount !== 1 ? "s" : ""}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ─── Ticket Detail ─── */}
      {view === "detail" && (
        <>
          {detailLoading ? (
            <div className="text-center py-12 text-surface-400">Loading...</div>
          ) : selectedTicket ? (
            <div className="max-w-3xl">
              {/* Header */}
              <div className="bg-white rounded-xl border border-surface-200 p-5 mb-4">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-lg font-bold text-surface-900">{selectedTicket.subject}</h2>
                  {(() => {
                    const sc = statusConfig[selectedTicket.status] || statusConfig.OPEN;
                    return (
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.color}`}>
                        {sc.label}
                      </span>
                    );
                  })()}
                </div>
                <p className="text-xs text-surface-400">
                  Opened {new Date(selectedTicket.createdAt).toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              {/* Messages */}
              <div className="space-y-3 mb-4">
                {selectedTicket.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`rounded-xl p-4 ${
                      msg.isAdmin
                        ? "bg-brand-50 border border-brand-200 ml-6"
                        : "bg-white border border-surface-200 mr-6"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {msg.user.image ? (
                        <img src={msg.user.image} alt="" className="w-6 h-6 rounded-full" />
                      ) : (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${msg.isAdmin ? "bg-brand-500" : "bg-surface-400"}`}>
                          {(msg.user.name || "?")[0]}
                        </div>
                      )}
                      <span className="text-sm font-medium text-surface-800">
                        {msg.user.name || "User"}
                        {msg.isAdmin && <span className="ml-1 text-brand-600 text-xs font-semibold">Admin</span>}
                      </span>
                      <span className="text-xs text-surface-400">{timeAgo(msg.createdAt)}</span>
                    </div>
                    <p className="text-sm text-surface-700 whitespace-pre-wrap">{msg.body}</p>
                  </div>
                ))}
              </div>

              {/* Reply Form */}
              {selectedTicket.status !== "CLOSED" && (
                <form onSubmit={handleReply} className="bg-white rounded-xl border border-surface-200 p-4">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                    required
                    className="w-full px-3 py-2.5 rounded-lg border border-surface-200 bg-surface-50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none mb-3"
                  />
                  <button
                    type="submit"
                    disabled={replying || !reply.trim()}
                    className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-700 transition-colors disabled:opacity-50"
                  >
                    {replying ? "Sending..." : "Send Reply"}
                  </button>
                </form>
              )}
              {selectedTicket.status === "CLOSED" && (
                <div className="bg-surface-50 rounded-xl border border-surface-200 p-4 text-center text-sm text-surface-500">
                  This ticket is closed. Create a new ticket if you need further help.
                </div>
              )}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
