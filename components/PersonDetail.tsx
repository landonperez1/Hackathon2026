"use client";

import { useMemo, useState } from "react";
import type { Interaction, Person, Relationship } from "@/lib/types";
import PersonForm from "./PersonForm";

type Props = {
  person: Person;
  people: Person[];
  interactions: Interaction[];
  relationships: Relationship[];
  onUpdated: (p: Person) => void;
  onDeleted: (id: string) => void;
  onRelationshipsChanged: (rels: Relationship[]) => void;
  onClose: () => void;
};

const reliabilityLabel = (r: number) =>
  r >= 4 ? "High" : r >= 3 ? "Medium" : "Low";

export default function PersonDetail({
  person,
  people,
  interactions,
  relationships,
  onUpdated,
  onDeleted,
  onRelationshipsChanged,
  onClose,
}: Props) {
  const [editing, setEditing] = useState(false);

  const personInteractions = useMemo(
    () =>
      interactions
        .filter((i) => i.person_id === person.id)
        .sort((a, b) => b.created_at - a.created_at),
    [interactions, person.id]
  );

  const connectedIds = useMemo(() => {
    const s = new Set<string>();
    for (const r of relationships) {
      if (r.person_a_id === person.id) s.add(r.person_b_id);
      if (r.person_b_id === person.id) s.add(r.person_a_id);
    }
    return s;
  }, [relationships, person.id]);

  async function toggleRelationship(otherId: string) {
    const isConnected = connectedIds.has(otherId);
    if (isConnected) {
      const res = await fetch("/api/relationships", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_a_id: person.id,
          person_b_id: otherId,
        }),
      });
      if (res.ok) {
        onRelationshipsChanged(
          relationships.filter(
            (r) =>
              !(
                (r.person_a_id === person.id && r.person_b_id === otherId) ||
                (r.person_a_id === otherId && r.person_b_id === person.id)
              )
          )
        );
      }
    } else {
      const res = await fetch("/api/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_a_id: person.id,
          person_b_id: otherId,
          strength: 2,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onRelationshipsChanged([...relationships, data.relationship]);
      }
    }
  }

  if (editing) {
    return (
      <div className="p-4">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
          Edit person
        </div>
        <PersonForm
          person={person}
          onSaved={(p) => {
            onUpdated(p);
            setEditing(false);
          }}
          onCancel={() => setEditing(false)}
          onDeleted={(id) => {
            onDeleted(id);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-muted">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="text-xl font-semibold text-slate-100">
              {person.name}
            </div>
            <div className="text-sm text-slate-400">
              {person.role || "No role set"}
            </div>
          </div>
          <div className="flex gap-1">
            <button className="btn-ghost text-xs" onClick={() => setEditing(true)}>
              Edit
            </button>
            <button className="btn-ghost text-xs" onClick={onClose}>
              ×
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3 text-sm">
          <div className="card p-2">
            <div className="label">Reliability</div>
            <div className="mt-1">
              {reliabilityLabel(person.reliability)} · {person.reliability}/5
            </div>
          </div>
          <div className="card p-2">
            <div className="label">Workload</div>
            <div className="mt-1">{person.workload}/5</div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {person.communication_style ? (
          <section>
            <div className="label mb-1">Communication style</div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">
              {person.communication_style}
            </div>
          </section>
        ) : null}

        {person.personality_notes ? (
          <section>
            <div className="label mb-1">Personality notes</div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">
              {person.personality_notes}
            </div>
          </section>
        ) : null}

        <section>
          <div className="label mb-2">Works with</div>
          <div className="flex flex-wrap gap-1">
            {people
              .filter((p) => p.id !== person.id)
              .map((p) => {
                const connected = connectedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleRelationship(p.id)}
                    className={`chip cursor-pointer transition-colors ${
                      connected
                        ? "bg-accent-muted border-accent text-white"
                        : "hover:bg-bg-elevated"
                    }`}
                  >
                    {connected ? "✓ " : "+ "}
                    {p.name}
                  </button>
                );
              })}
            {people.length <= 1 ? (
              <div className="text-xs text-slate-500">
                Add more people to map relationships.
              </div>
            ) : null}
          </div>
        </section>

        <section>
          <div className="label mb-2">
            Recent interactions ({personInteractions.length})
          </div>
          {personInteractions.length === 0 ? (
            <div className="text-sm text-slate-500">
              No interactions logged yet.
            </div>
          ) : (
            <div className="space-y-2">
              {personInteractions.slice(0, 10).map((i) => (
                <div key={i.id} className="card p-2 text-sm">
                  <div className="text-xs text-slate-500 mb-1">
                    {new Date(i.created_at).toLocaleString()}
                    {i.project_context ? ` · ${i.project_context}` : ""}
                  </div>
                  <div className="text-slate-200 whitespace-pre-wrap">
                    {i.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
