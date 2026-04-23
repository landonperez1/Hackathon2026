"use client";

import { useEffect, useMemo, useState } from "react";
import NetworkGraph from "@/components/NetworkGraph";
import PeopleSidebar from "@/components/PeopleSidebar";
import PersonDetail from "@/components/PersonDetail";
import PersonForm from "@/components/PersonForm";
import InteractionLog from "@/components/InteractionLog";
import StrategyPanel from "@/components/StrategyPanel";
import type {
  Interaction,
  Person,
  Relationship,
  Strategy,
} from "@/lib/types";

type Tab = "strategy" | "interactions";

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("strategy");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function load() {
      const [pRes, iRes, rRes] = await Promise.all([
        fetch("/api/people").then((r) => r.json()),
        fetch("/api/interactions").then((r) => r.json()),
        fetch("/api/relationships").then((r) => r.json()),
      ]);
      setPeople(pRes.people ?? []);
      setInteractions(iRes.interactions ?? []);
      setRelationships(rRes.relationships ?? []);
      setBooting(false);
    }
    load();
  }, []);

  const selectedPerson = useMemo(
    () => people.find((p) => p.id === selectedId) ?? null,
    [people, selectedId]
  );

  async function generateStrategy(description: string) {
    setStrategyLoading(true);
    try {
      const res = await fetch("/api/strategies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_description: description }),
      });
      const data = await res.json();
      if (res.ok) {
        setStrategy(data.strategy);
      } else {
        alert(`Strategy generation failed: ${data.error}`);
      }
    } finally {
      setStrategyLoading(false);
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 px-6 border-b border-border flex items-center justify-between bg-bg-raised">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 rounded-md bg-accent" />
          <div>
            <div className="font-semibold text-slate-100 leading-tight">
              ProjectMind
            </div>
            <div className="text-xs text-slate-500 leading-tight">
              AI project management that learns your network
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-slate-400">
          <span className="chip">{people.length} people</span>
          <span className="chip">{interactions.length} interactions</span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-border bg-bg-raised flex-shrink-0">
          <PeopleSidebar
            people={people}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={() => {
              setAddingPerson(true);
              setSelectedId(null);
            }}
          />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative bg-bg">
            {booting ? (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                Loading your network…
              </div>
            ) : (
              <NetworkGraph
                people={people}
                relationships={relationships}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            )}
            <div className="absolute bottom-4 left-4 card p-3 text-xs text-slate-400 space-y-1">
              <div className="font-medium text-slate-200 mb-1">Legend</div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-reliability-high" />
                <span>High reliability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-reliability-mid" />
                <span>Medium reliability</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-reliability-low" />
                <span>Low reliability</span>
              </div>
              <div className="text-slate-500 pt-1">
                Node size = current workload
              </div>
            </div>
          </div>
        </main>

        <aside className="w-[420px] border-l border-border bg-bg-raised flex flex-col flex-shrink-0">
          {addingPerson ? (
            <div className="p-4 overflow-y-auto">
              <div className="text-xs text-slate-500 uppercase tracking-wider mb-3">
                Add person to network
              </div>
              <PersonForm
                onSaved={(p) => {
                  setPeople((prev) => [...prev, p]);
                  setAddingPerson(false);
                  setSelectedId(p.id);
                }}
                onCancel={() => setAddingPerson(false)}
              />
            </div>
          ) : selectedPerson ? (
            <PersonDetail
              person={selectedPerson}
              people={people}
              interactions={interactions}
              relationships={relationships}
              onUpdated={(p) =>
                setPeople((prev) => prev.map((x) => (x.id === p.id ? p : x)))
              }
              onDeleted={(id) => {
                setPeople((prev) => prev.filter((x) => x.id !== id));
                setRelationships((prev) =>
                  prev.filter(
                    (r) => r.person_a_id !== id && r.person_b_id !== id
                  )
                );
                setSelectedId(null);
              }}
              onRelationshipsChanged={setRelationships}
              onClose={() => setSelectedId(null)}
            />
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b border-border-muted">
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === "strategy"
                      ? "text-slate-100 border-b-2 border-accent"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  onClick={() => setTab("strategy")}
                >
                  Strategy
                </button>
                <button
                  className={`flex-1 py-3 text-sm font-medium transition-colors ${
                    tab === "interactions"
                      ? "text-slate-100 border-b-2 border-accent"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                  onClick={() => setTab("interactions")}
                >
                  Interactions
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {tab === "strategy" ? (
                  <StrategyPanel
                    strategy={strategy}
                    loading={strategyLoading}
                    onGenerate={generateStrategy}
                    onRated={(s) => setStrategy(s)}
                  />
                ) : (
                  <InteractionLog
                    interactions={interactions}
                    people={people}
                    onCreated={(i) =>
                      setInteractions((prev) => [i, ...prev])
                    }
                    onDeleted={(id) =>
                      setInteractions((prev) =>
                        prev.filter((x) => x.id !== id)
                      )
                    }
                  />
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
