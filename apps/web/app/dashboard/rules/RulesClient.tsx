"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

interface BuiltinRule {
  id: string;
  name: string;
  desc: string;
  group: string;
  enabled: boolean;
  severity: string;
  locked: boolean;
}

interface CustomRule {
  id: string;
  name: string;
  slug: string;
  description: string;
  prompt: string;
  severity: string;
  enabled: boolean;
}

async function apiCall(body: any) {
  const res = await fetch("/api/rules", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function RulesClient({
  builtinRules: initialBuiltins,
  customRules: initialCustoms,
}: {
  builtinRules: BuiltinRule[];
  customRules: CustomRule[];
}) {
  const [builtins, setBuiltins] = useState(initialBuiltins);
  const [customs, setCustoms] = useState(initialCustoms);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // New custom rule form
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPrompt, setNewPrompt] = useState("");
  const [newSeverity, setNewSeverity] = useState("WARNING");
  const [formSaving, setFormSaving] = useState(false);

  const toggleBuiltin = async (ruleId: string) => {
    const rule = builtins.find((r) => r.id === ruleId);
    if (!rule || rule.locked) return;
    const newEnabled = !rule.enabled;
    setBuiltins((prev) => prev.map((r) => (r.id === ruleId ? { ...r, enabled: newEnabled } : r)));
    setSaving(ruleId);
    await apiCall({ action: "toggle", ruleId, enabled: newEnabled, severity: rule.severity });
    setSaving(null);
  };

  const changeSeverity = async (ruleId: string, severity: string) => {
    const rule = builtins.find((r) => r.id === ruleId);
    if (!rule) return;
    setBuiltins((prev) => prev.map((r) => (r.id === ruleId ? { ...r, severity } : r)));
    await apiCall({ action: "toggle", ruleId, enabled: rule.enabled, severity });
  };

  const toggleCustom = async (id: string) => {
    const rule = customs.find((r) => r.id === id);
    if (!rule) return;
    const newEnabled = !rule.enabled;
    setCustoms((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: newEnabled } : r)));
    await apiCall({ action: "updateCustom", id, enabled: newEnabled });
  };

  const deleteCustom = async (id: string) => {
    if (!confirm("Delete this custom rule?")) return;
    setCustoms((prev) => prev.filter((r) => r.id !== id));
    await apiCall({ action: "deleteCustom", id });
  };

  const createCustomRule = async () => {
    if (!newName.trim() || !newPrompt.trim()) return;
    setFormSaving(true);
    const result = await apiCall({
      action: "createCustom",
      name: newName.trim(),
      description: newDesc.trim(),
      prompt: newPrompt.trim(),
      severity: newSeverity,
    });
    if (result.id) {
      setCustoms((prev) => [
        {
          id: result.id,
          name: result.name,
          slug: result.slug,
          description: result.description || "",
          prompt: result.prompt,
          severity: result.severity,
          enabled: result.enabled,
        },
        ...prev,
      ]);
      setNewName("");
      setNewDesc("");
      setNewPrompt("");
      setNewSeverity("WARNING");
      setShowForm(false);
    }
    setFormSaving(false);
  };

  const groups = Array.from(new Set(builtins.map((r) => r.group)));

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-surface-900">Rules</h1>
          <p className="text-surface-500 mt-1">Configure which rules to enforce during analysis</p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "+ Custom Rule"}
        </Button>
      </div>

      {/* Custom Rule Form */}
      {showForm && (
        <Card className="mb-6">
          <CardContent>
            <h3 className="font-bold text-surface-900 mb-4">Create Custom Rule</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Rule Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. PSR-12 Compliance, React Hooks Best Practices"
                  className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Short description of what this rule checks"
                  className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">
                  AI Prompt <span className="text-surface-400 font-normal">— Tell the AI what to look for</span>
                </label>
                <textarea
                  value={newPrompt}
                  onChange={(e) => setNewPrompt(e.target.value)}
                  rows={4}
                  placeholder={`e.g. "Check if the code follows PSR-12 coding standards for PHP. Look for proper spacing, bracket placement, line length limits (120 chars), and namespace declarations."\n\nor\n\n"Verify React components follow hooks rules: no hooks in conditionals, no hooks in loops, custom hooks start with 'use'."`}
                  className="w-full rounded-xl border border-surface-200 px-4 py-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none resize-none"
                />
              </div>
              <div className="flex items-center gap-4">
                <div>
                  <label className="block text-sm font-medium text-surface-700 mb-1">Severity</label>
                  <select
                    value={newSeverity}
                    onChange={(e) => setNewSeverity(e.target.value)}
                    className="rounded-xl border border-surface-200 px-3 py-2 text-sm bg-white"
                  >
                    <option value="ERROR">Error</option>
                    <option value="WARNING">Warning</option>
                    <option value="INFO">Info</option>
                  </select>
                </div>
                <div className="flex-1" />
                <Button
                  variant="primary"
                  size="sm"
                  onClick={createCustomRule}
                  disabled={formSaving || !newName.trim() || !newPrompt.trim()}
                  className="mt-5"
                >
                  {formSaving ? "Creating..." : "Create Rule"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-6">
        {/* Custom Rules */}
        {customs.length > 0 && (
          <Card>
            <div className="p-6 pb-4 border-b border-surface-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-surface-900">🎯 Custom Rules</h2>
              <span className="text-xs text-surface-400">{customs.length} rules</span>
            </div>
            <div className="divide-y divide-surface-100">
              {customs.map((rule) => (
                <div key={rule.id} className="py-4 px-6 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleCustom(rule.id)}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          rule.enabled ? "bg-brand-500" : "bg-surface-300"
                        } relative`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                            rule.enabled ? "left-5" : "left-1"
                          }`}
                        />
                      </button>
                      <div>
                        <div className="font-medium text-sm text-surface-900">{rule.name}</div>
                        {rule.description && (
                          <div className="text-xs text-surface-400 mt-0.5">{rule.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-surface-400 bg-surface-100 px-2 py-1 rounded-lg">
                        {rule.severity}
                      </span>
                      <button
                        onClick={() => deleteCustom(rule.id)}
                        className="text-xs text-red-500 hover:text-red-700 px-2 py-1"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 ml-14 text-xs text-surface-400 bg-surface-50 rounded-lg p-2 font-mono">
                    {rule.prompt.length > 200 ? rule.prompt.substring(0, 200) + "..." : rule.prompt}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Built-in Rules by group */}
        {groups.map((group) => (
          <Card key={group}>
            <div className="p-6 pb-4 border-b border-surface-100">
              <h2 className="text-lg font-bold text-surface-900">{group}</h2>
            </div>
            <div className="divide-y divide-surface-100">
              {builtins
                .filter((r) => r.group === group)
                .map((rule) => (
                  <div
                    key={rule.id}
                    className={`flex items-center justify-between py-4 px-6 hover:bg-surface-50 transition-colors ${rule.locked ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => toggleBuiltin(rule.id)}
                        disabled={rule.locked}
                        className={`w-10 h-6 rounded-full transition-colors ${
                          rule.enabled ? "bg-brand-500" : "bg-surface-300"
                        } relative ${rule.locked ? "cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${
                            rule.enabled ? "left-5" : "left-1"
                          }`}
                        />
                      </button>
                      <div>
                        <div className="font-medium text-sm text-surface-900">
                          {rule.name}{" "}
                          <span className="text-surface-400 font-mono text-xs ml-1">({rule.id})</span>
                          {rule.locked && (
                            <span className="ml-2 text-xs font-medium text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Pro+</span>
                          )}
                        </div>
                        <div className="text-xs text-surface-400 mt-0.5">
                          {rule.desc}
                          {rule.locked && " — Upgrade to Pro to enable this rule"}
                        </div>
                      </div>
                    </div>
                    <select
                      value={rule.severity}
                      onChange={(e) => changeSeverity(rule.id, e.target.value)}
                      disabled={rule.locked}
                      className={`text-xs border border-surface-200 rounded-lg px-2 py-1 bg-white text-surface-600 ${rule.locked ? "cursor-not-allowed" : ""}`}
                    >
                      <option value="ERROR">Error</option>
                      <option value="WARNING">Warning</option>
                      <option value="INFO">Info</option>
                    </select>
                  </div>
                ))}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
