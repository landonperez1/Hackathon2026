"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { EmailMessage, Project } from "@/lib/types";

type Props = {
  projects: Project[];
};

type AccountStatus = {
  id: number;
  host: string;
  username: string;
  mailbox: string;
  last_synced_at: number | null;
  last_error: string | null;
};

export default function EmailDigest({ projects }: Props) {
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [acctRes, msgRes] = await Promise.all([
        fetch("/api/email/account").then((r) => r.json()),
        fetch("/api/email/messages?limit=50").then((r) => r.json()),
      ]);
      if (cancelled) return;
      setAccount(acctRes.account ?? null);
      setMessages(msgRes.messages ?? []);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const projectName = useMemo(() => {
    const map = new Map(projects.map((p) => [p.id, p.name]));
    return (id: string | null) => (id ? map.get(id) ?? null : null);
  }, [projects]);

  const projectMessages = useMemo(
    () => messages.filter((m) => m.project_id),
    [messages]
  );

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert(`Sync failed: ${data.error}`);
      }
      setMessages(data.messages ?? messages);
      // Kick off LLM summarization in the background.
      fetch("/api/email/summarize", { method: "POST" })
        .then((r) => r.json())
        .then((d) => {
          if (d.messages) setMessages(d.messages);
        })
        .catch(() => {});
      // Refresh status.
      const acctRes = await fetch("/api/email/account").then((r) => r.json());
      setAccount(acctRes.account ?? null);
    } finally {
      setSyncing(false);
    }
  }

  if (loading) {
    return (
      <div className="card p-4 text-sm text-slate-500">
        Loading email digest…
      </div>
    );
  }

  if (!account) {
    return (
      <div className="card p-4 space-y-2">
        <div className="text-sm font-medium text-slate-100">📬 Email digest</div>
        <div className="text-xs text-slate-400">
          Connect your inbox to see project-related messages here.
        </div>
        <Link
          href="/email"
          className="btn-primary text-xs w-full justify-center"
        >
          Connect email →
        </Link>
      </div>
    );
  }

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-medium text-slate-100">
            📬 Email digest
          </div>
          <div className="text-xs text-slate-500">
            {account.username} ·{" "}
            {account.last_synced_at
              ? `synced ${formatRelative(account.last_synced_at)}`
              : "never synced"}
          </div>
        </div>
        <button
          className="btn-secondary text-xs"
          onClick={sync}
          disabled={syncing}
        >
          {syncing ? "Syncing…" : "Sync"}
        </button>
      </div>
      {account.last_error ? (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
          {account.last_error}
        </div>
      ) : null}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {projectMessages.length === 0 ? (
          <div className="text-xs text-slate-500">
            No project-related messages yet.{" "}
            {messages.length > 0
              ? `(${messages.length} other messages waiting to be classified)`
              : ""}
          </div>
        ) : (
          projectMessages.slice(0, 10).map((m) => {
            const proj = projectName(m.project_id);
            return (
              <div key={m.id} className="border border-border rounded-lg p-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-slate-100 truncate">
                    {m.subject || "(no subject)"}
                  </div>
                  {proj ? (
                    <Link
                      href={`/projects`}
                      className="chip text-[10px] bg-accent-muted/30 border-accent text-accent"
                    >
                      {proj}
                    </Link>
                  ) : null}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {m.from_name || m.from_address} ·{" "}
                  {formatRelative(m.received_at)}
                </div>
                <div className="text-xs text-slate-300 mt-1 line-clamp-2">
                  {m.summary || m.snippet}
                </div>
              </div>
            );
          })
        )}
      </div>
      <Link
        href="/email"
        className="btn-ghost text-xs w-full justify-center"
      >
        Open inbox →
      </Link>
    </div>
  );
}

function formatRelative(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString();
}
