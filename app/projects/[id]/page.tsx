"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppHeader from "@/components/AppHeader";
import type { Project, ProjectFile } from "@/lib/types";

function formatBytes(n: number | null): string {
  if (n === null || n === undefined) return "";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [project, setProject] = useState<Project | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [uploading, setUploading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [newFileNotes, setNewFileNotes] = useState("");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [editingFileId, setEditingFileId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetch(`/api/projects/${projectId}`)
      .then((r) => {
        if (r.status === 404) {
          setNotFound(true);
          return null;
        }
        return r.json();
      })
      .then((d) => {
        if (d) {
          setProject(d.project);
          setFiles(d.files ?? []);
        }
        setLoading(false);
      });
  }, [projectId]);

  async function upload() {
    if (!newFileName.trim() && !pendingFile) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("name", newFileName);
      form.set("notes", newFileNotes);
      if (pendingFile) form.set("file", pendingFile);

      const res = await fetch(`/api/projects/${projectId}/files`, {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (res.ok) {
        setFiles((prev) => [data.file, ...prev]);
        setNewFileName("");
        setNewFileNotes("");
        setPendingFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } else {
        alert(data?.error ?? "Upload failed");
      }
    } finally {
      setUploading(false);
    }
  }

  async function saveEdit(fileId: string) {
    const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName, notes: editNotes }),
    });
    const data = await res.json();
    if (res.ok) {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? data.file : f)));
      setEditingFileId(null);
    }
  }

  async function removeFile(fileId: string) {
    if (!confirm("Delete this file?")) return;
    const res = await fetch(`/api/projects/${projectId}/files/${fileId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    }
  }

  async function removeProject() {
    if (!confirm(`Delete project "${project?.name}" and all its files?`))
      return;
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) router.push("/projects");
  }

  if (notFound) {
    return (
      <div className="h-screen flex flex-col">
        <AppHeader />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="text-slate-300 mb-2">Project not found.</div>
            <Link href="/projects" className="btn-secondary">
              Back to projects
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <AppHeader
        stats={
          project ? (
            <span className="chip">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          ) : null
        }
      />

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="mb-6">
            <Link
              href="/projects"
              className="text-xs text-slate-500 hover:text-slate-300"
            >
              ← All projects
            </Link>
          </div>

          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : project ? (
            <>
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-10 h-10 rounded-md bg-accent-muted border border-accent flex items-center justify-center">
                      📁
                    </div>
                    <h1 className="text-2xl font-semibold text-slate-100">
                      {project.name}
                    </h1>
                  </div>
                  {project.description ? (
                    <p className="text-sm text-slate-400 mt-2 max-w-2xl">
                      {project.description}
                    </p>
                  ) : null}
                </div>
                <button
                  className="btn-ghost text-reliability-low text-xs"
                  onClick={removeProject}
                >
                  Delete project
                </button>
              </div>

              <section className="card-elevated p-4 mb-6 space-y-3">
                <div className="label">Add a file</div>
                <div>
                  <label className="label">File name</label>
                  <input
                    className="input mt-1"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    placeholder="e.g., Site plan v3, Building permit"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    className="textarea mt-1"
                    rows={3}
                    value={newFileNotes}
                    onChange={(e) => setNewFileNotes(e.target.value)}
                    placeholder="Context, revision notes, reviewers, dates…"
                  />
                </div>
                <div>
                  <label className="label">Upload (optional)</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="block mt-1 text-sm text-slate-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-bg-elevated file:text-slate-200 file:text-xs hover:file:bg-bg-hover cursor-pointer"
                    onChange={(e) =>
                      setPendingFile(e.target.files?.[0] ?? null)
                    }
                  />
                  {pendingFile ? (
                    <div className="text-xs text-slate-500 mt-1">
                      {pendingFile.name} · {formatBytes(pendingFile.size)}
                    </div>
                  ) : null}
                </div>
                <div className="flex justify-end">
                  <button
                    className="btn-primary"
                    onClick={upload}
                    disabled={
                      uploading || (!newFileName.trim() && !pendingFile)
                    }
                  >
                    {uploading ? "Saving…" : "Add file"}
                  </button>
                </div>
              </section>

              <section>
                <div className="label mb-3">Files</div>
                {files.length === 0 ? (
                  <div className="card p-6 text-center text-sm text-slate-500">
                    No files yet. Add a blueprint, permit, or any reference
                    document.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {files.map((f) => (
                      <div key={f.id} className="card p-4">
                        {editingFileId === f.id ? (
                          <div className="space-y-2">
                            <input
                              className="input"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                            <textarea
                              className="textarea"
                              rows={3}
                              value={editNotes}
                              onChange={(e) => setEditNotes(e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn-ghost"
                                onClick={() => setEditingFileId(null)}
                              >
                                Cancel
                              </button>
                              <button
                                className="btn-primary"
                                onClick={() => saveEdit(f.id)}
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-8 h-8 rounded bg-bg-elevated flex items-center justify-center text-sm">
                                  📄
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-slate-100 truncate">
                                    {f.name}
                                  </div>
                                  <div className="text-xs text-slate-500 mt-0.5 flex gap-2 flex-wrap">
                                    <span>
                                      {new Date(
                                        f.created_at
                                      ).toLocaleDateString()}
                                    </span>
                                    {f.original_filename ? (
                                      <span>· {f.original_filename}</span>
                                    ) : null}
                                    {f.size_bytes !== null ? (
                                      <span>· {formatBytes(f.size_bytes)}</span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {f.storage_path ? (
                                  <a
                                    href={`/api/files/${f.id}/download`}
                                    className="btn-ghost text-xs"
                                  >
                                    Download
                                  </a>
                                ) : null}
                                <button
                                  className="btn-ghost text-xs"
                                  onClick={() => {
                                    setEditingFileId(f.id);
                                    setEditName(f.name);
                                    setEditNotes(f.notes);
                                  }}
                                >
                                  Edit
                                </button>
                                <button
                                  className="btn-ghost text-xs text-reliability-low"
                                  onClick={() => removeFile(f.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                            {f.notes ? (
                              <div className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">
                                {f.notes}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
