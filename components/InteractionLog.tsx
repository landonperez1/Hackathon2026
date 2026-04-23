"use client";

import { useState } from "react";
import type { Interaction, Person } from "@/lib/types";

type Props = {
  interactions: Interaction[];
  people: Person[];
  defaultPersonId?: string | null;
  onCreated: (i: Interaction) => void;
  onDeleted: (id: string) => void;
};

export default function InteractionLog({
  interactions,
  people,
  defaultPersonId,
  onCreated,
  onDeleted,
}: Props) {
  const [personId, setPersonId] = useState<string>(defaultPersonId ?? "");
  const [content, setContent] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId || null,
          content,
          project_context: projectContext,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(data.interaction);
        setContent("");
        setProjectContext("");
      }
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    const res = await fetch(`/api/interactions/${id}`, { method: "DELETE" });
    if (res.ok) onDeleted(id);
  }

  const personName = (id: string | null) =>
    id ? people.find((p) => p.id === id)?.name ?? "Unknown" : "General";

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-muted space-y-2">
        <div className="flex gap-2">
          <select
            className="input flex-1"
            value={personId}
            onChange={(e) => setPersonId(e.target.value)}
          >
            <option value="">General / team note</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="input w-40"
            placeholder="Project (optional)"
            value={projectContext}
            onChange={(e) => setProjectContext(e.target.value)}
          />
        </div>
        <textarea
          className="textarea"
          rows={3}
          placeholder="What happened? e.g., 'Priya pushed back on the Q3 scope — worried about tech-debt backlog. Agreed to sync Thursday.'"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end">
          <button
            className="btn-primary"
            onClick={submit}
            disabled={saving || !content.trim()}
          >
            {saving ? "Logging…" : "Log interaction"}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {interactions.length === 0 ? (
          <div className="text-sm text-slate-500 text-center py-8">
            No interactions yet. Log a conversation or meeting to give the AI
            context.
          </div>
        ) : (
          interactions.map((i) => (
            <div key={i.id} className="card p-3 text-sm">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <span className="chip">{personName(i.person_id)}</span>
                  {i.project_context ? (
                    <span className="chip">{i.project_context}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  {new Date(i.created_at).toLocaleString()}
                  <button
                    onClick={() => remove(i.id)}
                    className="text-slate-600 hover:text-reliability-low"
                    title="Delete"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="text-slate-200 whitespace-pre-wrap">
                {i.content}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
