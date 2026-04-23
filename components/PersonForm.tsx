"use client";

import { useEffect, useState } from "react";
import type { Person } from "@/lib/types";

type Props = {
  person?: Person | null;
  onSaved: (p: Person) => void;
  onCancel: () => void;
  onDeleted?: (id: string) => void;
};

const empty = {
  name: "",
  role: "",
  reliability: 3,
  workload: 3,
  communication_style: "",
  personality_notes: "",
};

export default function PersonForm({ person, onSaved, onCancel, onDeleted }: Props) {
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (person) {
      setForm({
        name: person.name,
        role: person.role,
        reliability: person.reliability,
        workload: person.workload,
        communication_style: person.communication_style,
        personality_notes: person.personality_notes,
      });
    } else {
      setForm(empty);
    }
  }, [person]);

  async function save() {
    setSaving(true);
    setError(null);
    try {
      const url = person ? `/api/people/${person.id}` : "/api/people";
      const method = person ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "failed to save");
      onSaved(data.person);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!person) return;
    if (!confirm(`Remove ${person.name} from your network?`)) return;
    const res = await fetch(`/api/people/${person.id}`, { method: "DELETE" });
    if (res.ok) onDeleted?.(person.id);
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Name</label>
        <input
          className="input mt-1"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="e.g., Priya Patel"
        />
      </div>
      <div>
        <label className="label">Role</label>
        <input
          className="input mt-1"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          placeholder="e.g., Backend engineer, Design lead"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Reliability: {form.reliability}/5</label>
          <input
            type="range"
            min={1}
            max={5}
            value={form.reliability}
            onChange={(e) =>
              setForm({ ...form, reliability: Number(e.target.value) })
            }
            className="w-full mt-1 accent-accent"
          />
        </div>
        <div>
          <label className="label">Workload: {form.workload}/5</label>
          <input
            type="range"
            min={1}
            max={5}
            value={form.workload}
            onChange={(e) =>
              setForm({ ...form, workload: Number(e.target.value) })
            }
            className="w-full mt-1 accent-accent"
          />
        </div>
      </div>
      <div>
        <label className="label">Communication style</label>
        <textarea
          className="textarea mt-1"
          rows={2}
          value={form.communication_style}
          onChange={(e) =>
            setForm({ ...form, communication_style: e.target.value })
          }
          placeholder="Terse, async-first. Prefers Slack over meetings."
        />
      </div>
      <div>
        <label className="label">Personality notes</label>
        <textarea
          className="textarea mt-1"
          rows={3}
          value={form.personality_notes}
          onChange={(e) =>
            setForm({ ...form, personality_notes: e.target.value })
          }
          placeholder="Detail-oriented. Gets anxious under ambiguity — give clear success criteria."
        />
      </div>

      {error ? <div className="text-sm text-reliability-low">{error}</div> : null}

      <div className="flex items-center justify-between pt-2">
        <div>
          {person && onDeleted ? (
            <button className="btn-ghost text-reliability-low" onClick={remove}>
              Delete
            </button>
          ) : null}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={save}
            disabled={saving || !form.name.trim()}
          >
            {saving ? "Saving…" : person ? "Save" : "Add person"}
          </button>
        </div>
      </div>
    </div>
  );
}
