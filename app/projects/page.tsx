"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppHeader from "@/components/AppHeader";
import type { Project } from "@/lib/types";

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/projects")
      .then((r) => (r.ok ? r.json() : { projects: [] }))
      .then((d) => {
        setProjects(d.projects ?? []);
      })
      .catch(() => {
        // ignore — keep going so the form is still usable
      })
      .finally(() => setLoading(false));
  }, []);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description }),
      });
      const data = await res.json();
      if (res.ok) {
        setProjects((prev) => [data.project, ...prev]);
        setName("");
        setDescription("");
        setCreating(false);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <AppHeader
        stats={
          <span className="chip">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-slate-100">
                Projects
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Folders for blueprints, permits, and project documents.
                Reference them from interactions using <code>@</code>.
              </p>
            </div>
            {!creating ? (
              <button className="btn-primary" onClick={() => setCreating(true)}>
                + New project
              </button>
            ) : null}
          </div>

          {creating ? (
            <div className="card-elevated p-4 mb-6 space-y-3">
              <div>
                <label className="label">Project name</label>
                <input
                  className="input mt-1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Oakridge Tower renovation"
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <textarea
                  className="textarea mt-1"
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description of the project scope."
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => {
                    setCreating(false);
                    setName("");
                    setDescription("");
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={create}
                  disabled={saving || !name.trim()}
                >
                  {saving ? "Creating…" : "Create project"}
                </button>
              </div>
            </div>
          ) : null}

          {loading ? (
            <div className="text-sm text-slate-500">Loading projects…</div>
          ) : projects.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">
              <div className="text-sm mb-3">No projects yet.</div>
              {!creating ? (
                <button
                  className="btn-secondary"
                  onClick={() => setCreating(true)}
                >
                  Create your first project
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${p.id}`}
                  className="card p-4 hover:border-accent transition-colors block"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-accent-muted border border-accent flex items-center justify-center text-lg">
                      📁
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-100 truncate">
                        {p.name}
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        Created {new Date(p.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  {p.description ? (
                    <div className="text-sm text-slate-400 mt-3 line-clamp-3">
                      {p.description}
                    </div>
                  ) : null}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
