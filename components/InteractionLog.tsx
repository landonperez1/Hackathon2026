"use client";

import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import type {
  Interaction,
  MentionType,
  Person,
  Project,
  ProjectFile,
} from "@/lib/types";

type MentionCandidate = {
  type: MentionType;
  id: string;
  label: string;
  sublabel?: string;
  token: string;
};

type Props = {
  interactions: Interaction[];
  people: Person[];
  projects: Project[];
  files: ProjectFile[];
  defaultPersonId?: string | null;
  onCreated: (i: Interaction, mentions: Array<{ type: MentionType; id: string }>) => void;
  onDeleted: (id: string) => void;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48) || "item";
}

export default function InteractionLog({
  interactions,
  people,
  projects,
  files,
  defaultPersonId,
  onCreated,
  onDeleted,
}: Props) {
  const [personId, setPersonId] = useState<string>(defaultPersonId ?? "");
  const [content, setContent] = useState("");
  const [projectContext, setProjectContext] = useState("");
  const [saving, setSaving] = useState(false);
  const [committedMentions, setCommittedMentions] = useState<
    MentionCandidate[]
  >([]);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionAnchor, setMentionAnchor] = useState<number | null>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const candidates = useMemo<MentionCandidate[]>(() => {
    const list: MentionCandidate[] = [];
    for (const p of people) {
      list.push({
        type: "person",
        id: p.id,
        label: p.name,
        sublabel: p.role || "person",
        token: slugify(p.name),
      });
    }
    for (const pr of projects) {
      list.push({
        type: "project",
        id: pr.id,
        label: pr.name,
        sublabel: "project",
        token: slugify(pr.name),
      });
    }
    for (const f of files) {
      const projName = projects.find((p) => p.id === f.project_id)?.name ?? "";
      list.push({
        type: "file",
        id: f.id,
        label: f.name,
        sublabel: `file · ${projName}`,
        token: `${slugify(projName)}/${slugify(f.name)}`,
      });
    }
    return list;
  }, [people, projects, files]);

  const filtered = useMemo(() => {
    const q = mentionQuery.toLowerCase();
    if (!q) return candidates.slice(0, 8);
    return candidates
      .filter(
        (c) =>
          c.label.toLowerCase().includes(q) ||
          c.token.toLowerCase().includes(q)
      )
      .slice(0, 8);
  }, [candidates, mentionQuery]);

  useEffect(() => {
    setActiveIdx(0);
  }, [mentionQuery, mentionOpen]);

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    const value = e.target.value;
    setContent(value);
    const caret = e.target.selectionStart ?? value.length;
    // look back to find @ trigger
    let i = caret - 1;
    while (i >= 0) {
      const ch = value[i];
      if (ch === "@") {
        const before = i === 0 ? " " : value[i - 1];
        if (before === " " || before === "\n" || i === 0) {
          const query = value.slice(i + 1, caret);
          if (/^[a-zA-Z0-9_\-\/]*$/.test(query)) {
            setMentionAnchor(i);
            setMentionQuery(query);
            setMentionOpen(true);
            return;
          }
        }
        break;
      }
      if (ch === " " || ch === "\n") break;
      i--;
    }
    setMentionOpen(false);
    setMentionAnchor(null);
    setMentionQuery("");
  }

  function selectCandidate(c: MentionCandidate) {
    if (mentionAnchor === null || !textareaRef.current) return;
    const ta = textareaRef.current;
    const caret = ta.selectionStart ?? content.length;
    const before = content.slice(0, mentionAnchor);
    const after = content.slice(caret);
    const inserted = `@${c.token} `;
    const newValue = before + inserted + after;
    setContent(newValue);
    setCommittedMentions((prev) => {
      if (prev.find((x) => x.type === c.type && x.id === c.id)) return prev;
      return [...prev, c];
    });
    setMentionOpen(false);
    setMentionAnchor(null);
    setMentionQuery("");
    requestAnimationFrame(() => {
      ta.focus();
      const pos = before.length + inserted.length;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!mentionOpen || filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      selectCandidate(filtered[activeIdx]);
    } else if (e.key === "Escape") {
      setMentionOpen(false);
    }
  }

  async function submit() {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const usedMentions = committedMentions.filter((m) =>
        content.includes(`@${m.token}`)
      );
      const res = await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          person_id: personId || null,
          content,
          project_context: projectContext,
          mentions: usedMentions.map((m) => ({ type: m.type, id: m.id })),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onCreated(
          data.interaction,
          usedMentions.map((m) => ({ type: m.type, id: m.id }))
        );
        setContent("");
        setProjectContext("");
        setCommittedMentions([]);
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

        <div className="relative">
          <textarea
            ref={textareaRef}
            className="textarea"
            rows={3}
            placeholder="What happened? Use @ to link people, projects, or files."
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
          />

          {mentionOpen && filtered.length > 0 ? (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 card-elevated max-h-64 overflow-y-auto shadow-xl">
              {filtered.map((c, i) => (
                <button
                  key={`${c.type}-${c.id}`}
                  onClick={() => selectCandidate(c)}
                  onMouseEnter={() => setActiveIdx(i)}
                  className={`w-full text-left px-3 py-2 border-b border-border-muted last:border-b-0 flex items-center justify-between gap-2 ${
                    i === activeIdx ? "bg-bg-hover" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs">
                      {c.type === "person"
                        ? "👤"
                        : c.type === "project"
                        ? "📁"
                        : "📄"}
                    </span>
                    <span className="text-sm text-slate-100 truncate">
                      {c.label}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">
                    {c.sublabel}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {committedMentions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {committedMentions
              .filter((m) => content.includes(`@${m.token}`))
              .map((m) => (
                <span
                  key={`${m.type}-${m.id}`}
                  className="chip bg-accent-muted border-accent text-white"
                >
                  {m.type === "person"
                    ? "👤"
                    : m.type === "project"
                    ? "📁"
                    : "📄"}{" "}
                  {m.label}
                </span>
              ))}
          </div>
        ) : null}

        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Tip: type <span className="font-mono text-slate-400">@</span> to
            link people, projects, or files.
          </div>
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
                <div className="flex items-center gap-2 flex-wrap">
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
              <div className="text-slate-200 whitespace-pre-wrap break-words">
                {renderWithMentions(i.content, candidates)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function renderWithMentions(
  text: string,
  candidates: MentionCandidate[]
): React.ReactNode {
  if (!text.includes("@")) return text;
  const tokens = candidates
    .slice()
    .sort((a, b) => b.token.length - a.token.length);
  const parts: Array<{ text: string; mention?: MentionCandidate }> = [
    { text },
  ];
  for (const c of tokens) {
    const needle = `@${c.token}`;
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part.mention || !part.text.includes(needle)) continue;
      const segments: Array<{ text: string; mention?: MentionCandidate }> = [];
      let remaining = part.text;
      let idx: number;
      while ((idx = remaining.indexOf(needle)) !== -1) {
        if (idx > 0) segments.push({ text: remaining.slice(0, idx) });
        segments.push({ text: needle, mention: c });
        remaining = remaining.slice(idx + needle.length);
      }
      if (remaining) segments.push({ text: remaining });
      parts.splice(i, 1, ...segments);
      i += segments.length - 1;
    }
  }
  return parts.map((p, i) => {
    if (p.mention) {
      const icon =
        p.mention.type === "person"
          ? "👤"
          : p.mention.type === "project"
          ? "📁"
          : "📄";
      return (
        <span
          key={i}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-muted border border-accent text-white text-xs font-medium mx-0.5"
        >
          {icon} {p.mention.label}
        </span>
      );
    }
    return <Fragment key={i}>{p.text}</Fragment>;
  });
}
