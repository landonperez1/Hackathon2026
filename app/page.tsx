"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import NetworkGraph from "@/components/NetworkGraph";
import PeopleSidebar from "@/components/PeopleSidebar";
import PersonDetail from "@/components/PersonDetail";
import PersonForm from "@/components/PersonForm";
import InteractionLog from "@/components/InteractionLog";
import StrategyPanel from "@/components/StrategyPanel";
import type {
  Interaction,
  InteractionMention,
  MentionType,
  Person,
  Project,
  ProjectFile,
  Relationship,
  Strategy,
} from "@/lib/types";

type Tab = "strategy" | "interactions";
type NodeKind = "person" | "project" | "file";
type SelectedRef = { kind: NodeKind; id: string };

export default function Home() {
  const [people, setPeople] = useState<Person[]>([]);
  const [interactions, setInteractions] = useState<Interaction[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [mentions, setMentions] = useState<InteractionMention[]>([]);
  const [selected, setSelected] = useState<SelectedRef | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [strategy, setStrategy] = useState<Strategy | null>(null);
  const [strategyLoading, setStrategyLoading] = useState(false);
  const [tab, setTab] = useState<Tab>("strategy");
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    async function load() {
      const [pRes, iRes, rRes, prjRes] = await Promise.all([
        fetch("/api/people").then((r) => r.json()),
        fetch("/api/interactions?include=mentions").then((r) => r.json()),
        fetch("/api/relationships").then((r) => r.json()),
        fetch("/api/projects").then((r) => r.json()),
      ]);
      setPeople(pRes.people ?? []);
      setInteractions(iRes.interactions ?? []);
      setMentions(iRes.mentions ?? []);
      setRelationships(rRes.relationships ?? []);
      const loadedProjects: Project[] = prjRes.projects ?? [];
      setProjects(loadedProjects);

      if (loadedProjects.length > 0) {
        const fileLists = await Promise.all(
          loadedProjects.map((p) =>
            fetch(`/api/projects/${p.id}/files`)
              .then((r) => r.json())
              .then((d) => d.files as ProjectFile[])
              .catch(() => [] as ProjectFile[])
          )
        );
        setFiles(fileLists.flat());
      }
      setBooting(false);
    }
    load();
  }, []);

  const selectedPerson = useMemo(
    () =>
      selected?.kind === "person"
        ? people.find((p) => p.id === selected.id) ?? null
        : null,
    [people, selected]
  );
  const selectedProject = useMemo(
    () =>
      selected?.kind === "project"
        ? projects.find((p) => p.id === selected.id) ?? null
        : null,
    [projects, selected]
  );
  const selectedFile = useMemo(
    () =>
      selected?.kind === "file"
        ? files.find((f) => f.id === selected.id) ?? null
        : null,
    [files, selected]
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
      <AppHeader
        stats={
          <>
            <span className="chip">{people.length} people</span>
            <span className="chip">{projects.length} projects</span>
            <span className="chip">{interactions.length} interactions</span>
          </>
        }
      />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-border bg-bg-raised flex-shrink-0">
          <PeopleSidebar
            people={people}
            selectedId={
              selected?.kind === "person" ? selected.id : null
            }
            onSelect={(id) => setSelected({ kind: "person", id })}
            onAdd={() => {
              setAddingPerson(true);
              setSelected(null);
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
                projects={projects}
                files={files}
                mentions={mentions}
                selectedId={selected?.id ?? null}
                onSelect={setSelected}
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
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-accent" />
                <span>Project</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 bg-accent-hover"
                  style={{
                    transform: "rotate(45deg)",
                    display: "inline-block",
                  }}
                />
                <span>File</span>
              </div>
              <div className="text-slate-500 pt-1">
                People size = workload · @mentions add edges
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
                  setSelected({ kind: "person", id: p.id });
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
                setSelected(null);
              }}
              onRelationshipsChanged={setRelationships}
              onClose={() => setSelected(null)}
            />
          ) : selectedProject ? (
            <ProjectQuickView
              project={selectedProject}
              files={files.filter((f) => f.project_id === selectedProject.id)}
              onClose={() => setSelected(null)}
            />
          ) : selectedFile ? (
            <FileQuickView
              file={selectedFile}
              project={
                projects.find((p) => p.id === selectedFile.project_id) ?? null
              }
              onClose={() => setSelected(null)}
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
                    projects={projects}
                    files={files}
                    onCreated={(i, ms) => {
                      setInteractions((prev) => [i, ...prev]);
                      const newMentionRows: InteractionMention[] = [
                        ...(i.person_id
                          ? [
                              {
                                interaction_id: i.id,
                                mention_type:
                                  "person" as MentionType,
                                target_id: i.person_id,
                              },
                            ]
                          : []),
                        ...ms.map((m) => ({
                          interaction_id: i.id,
                          mention_type: m.type,
                          target_id: m.id,
                        })),
                      ];
                      setMentions((prev) => {
                        const seen = new Set(
                          prev.map(
                            (p) =>
                              `${p.interaction_id}|${p.mention_type}|${p.target_id}`
                          )
                        );
                        const toAdd = newMentionRows.filter(
                          (m) =>
                            !seen.has(
                              `${m.interaction_id}|${m.mention_type}|${m.target_id}`
                            )
                        );
                        return [...prev, ...toAdd];
                      });
                    }}
                    onDeleted={(id) => {
                      setInteractions((prev) =>
                        prev.filter((x) => x.id !== id)
                      );
                      setMentions((prev) =>
                        prev.filter((m) => m.interaction_id !== id)
                      );
                    }}
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

function ProjectQuickView({
  project,
  files,
  onClose,
}: {
  project: Project;
  files: ProjectFile[];
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-muted">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-accent-muted border border-accent flex items-center justify-center text-sm">
              📁
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">
                Project
              </div>
              <div className="text-lg font-semibold text-slate-100">
                {project.name}
              </div>
            </div>
          </div>
          <button className="btn-ghost text-xs" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {project.description ? (
          <div className="text-sm text-slate-300 whitespace-pre-wrap">
            {project.description}
          </div>
        ) : null}
        <div>
          <div className="label mb-2">Files ({files.length})</div>
          {files.length === 0 ? (
            <div className="text-sm text-slate-500">No files yet.</div>
          ) : (
            <div className="space-y-2">
              {files.map((f) => (
                <div key={f.id} className="card p-2 text-sm">
                  <div className="font-medium text-slate-100">{f.name}</div>
                  {f.notes ? (
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {f.notes}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <Link
          href={`/projects/${project.id}`}
          className="btn-secondary w-full justify-center"
        >
          Open project →
        </Link>
      </div>
    </div>
  );
}

function FileQuickView({
  file,
  project,
  onClose,
}: {
  file: ProjectFile;
  project: Project | null;
  onClose: () => void;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border-muted">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center text-sm">
              📄
            </div>
            <div>
              <div className="text-xs text-slate-500 uppercase tracking-wider">
                File {project ? `· ${project.name}` : ""}
              </div>
              <div className="text-lg font-semibold text-slate-100">
                {file.name}
              </div>
            </div>
          </div>
          <button className="btn-ghost text-xs" onClick={onClose}>
            ×
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {file.notes ? (
          <div>
            <div className="label mb-1">Notes</div>
            <div className="text-sm text-slate-300 whitespace-pre-wrap">
              {file.notes}
            </div>
          </div>
        ) : null}
        {file.original_filename ? (
          <div className="text-xs text-slate-500">
            Uploaded: {file.original_filename}
          </div>
        ) : null}
        <div className="flex gap-2">
          {file.storage_path ? (
            <a
              href={`/api/files/${file.id}/download`}
              className="btn-secondary flex-1 justify-center"
            >
              Download
            </a>
          ) : null}
          {project ? (
            <Link
              href={`/projects/${project.id}`}
              className="btn-secondary flex-1 justify-center"
            >
              Open project →
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
