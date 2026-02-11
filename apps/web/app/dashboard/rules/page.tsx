"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";

const solidRules = [
  { id: "SRP", name: "Single Responsibility", desc: "Each class/module should have one reason to change", severity: "error" },
  { id: "OCP", name: "Open/Closed", desc: "Open for extension, closed for modification", severity: "warning" },
  { id: "LSP", name: "Liskov Substitution", desc: "Subtypes must be substitutable for base types", severity: "error" },
  { id: "ISP", name: "Interface Segregation", desc: "Don't force clients to depend on unused interfaces", severity: "warning" },
  { id: "DIP", name: "Dependency Inversion", desc: "Depend on abstractions, not concretions", severity: "error" },
];

const cleanCodeRules = [
  { id: "NAMING", name: "Naming Conventions", desc: "Clear, descriptive, consistent naming", severity: "warning" },
  { id: "COMPLEXITY", name: "Code Complexity", desc: "Avoid deep nesting, long functions", severity: "warning" },
  { id: "FILE_LENGTH", name: "File Length", desc: "Keep files focused and reasonably sized", severity: "warning" },
  { id: "IMPORTS", name: "Import Organization", desc: "Clean, organized, shallow imports", severity: "info" },
];

export default function RulesPage() {
  const [enabled, setEnabled] = useState<Record<string, boolean>>(
    Object.fromEntries([...solidRules, ...cleanCodeRules].map((r) => [r.id, true]))
  );

  const toggle = (id: string) => setEnabled((prev) => ({ ...prev, [id]: !prev[id] }));

  const RuleRow = ({ rule }: { rule: typeof solidRules[0] }) => (
    <div className="flex items-center justify-between py-4 px-6 hover:bg-surface-50 transition-colors">
      <div className="flex items-center gap-4">
        <button onClick={() => toggle(rule.id)} className={`w-10 h-6 rounded-full transition-colors ${enabled[rule.id] ? "bg-brand-500" : "bg-surface-300"} relative`}>
          <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-all ${enabled[rule.id] ? "left-5" : "left-1"}`} />
        </button>
        <div>
          <div className="font-medium text-sm text-surface-900">{rule.name} <span className="text-surface-400 font-mono text-xs ml-1">({rule.id})</span></div>
          <div className="text-xs text-surface-400 mt-0.5">{rule.desc}</div>
        </div>
      </div>
      <select defaultValue={rule.severity} className="text-xs border border-surface-200 rounded-lg px-2 py-1 bg-white text-surface-600">
        <option value="error">Error</option>
        <option value="warning">Warning</option>
        <option value="info">Info</option>
      </select>
    </div>
  );

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-surface-900">Rules</h1>
        <p className="text-surface-500 mt-1">Configure which rules to enforce</p>
      </div>

      <div className="space-y-6">
        <Card>
          <div className="p-6 pb-4 border-b border-surface-100">
            <h2 className="text-lg font-bold text-surface-900">SOLID Principles</h2>
          </div>
          <div className="divide-y divide-surface-100">
            {solidRules.map((r) => <RuleRow key={r.id} rule={r} />)}
          </div>
        </Card>

        <Card>
          <div className="p-6 pb-4 border-b border-surface-100">
            <h2 className="text-lg font-bold text-surface-900">Clean Code</h2>
          </div>
          <div className="divide-y divide-surface-100">
            {cleanCodeRules.map((r) => <RuleRow key={r.id} rule={r} />)}
          </div>
        </Card>
      </div>
    </div>
  );
}
