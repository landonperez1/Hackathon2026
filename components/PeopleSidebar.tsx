"use client";

import type { Person } from "@/lib/types";

type Props = {
  people: Person[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
};

const reliabilityDot = (r: number) =>
  r >= 4
    ? "bg-reliability-high"
    : r >= 3
    ? "bg-reliability-mid"
    : "bg-reliability-low";

export default function PeopleSidebar({
  people,
  selectedId,
  onSelect,
  onAdd,
}: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-muted flex items-center justify-between">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-wider">
            Network
          </div>
          <div className="text-lg font-semibold">
            {people.length} {people.length === 1 ? "person" : "people"}
          </div>
        </div>
        <button className="btn-primary text-xs" onClick={onAdd}>
          + Add
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {people.length === 0 ? (
          <div className="p-4 text-sm text-slate-500">
            No one here yet. Add teammates to start mapping your network.
          </div>
        ) : (
          people.map((p) => (
            <button
              key={p.id}
              onClick={() => onSelect(p.id)}
              className={`w-full text-left px-4 py-3 border-b border-border-muted hover:bg-bg-hover transition-colors ${
                selectedId === p.id ? "bg-bg-hover" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${reliabilityDot(p.reliability)}`}
                />
                <span className="font-medium text-slate-100 text-sm">
                  {p.name}
                </span>
              </div>
              <div className="text-xs text-slate-500 ml-4 mt-0.5">
                {p.role || "no role"} · workload {p.workload}/5
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
