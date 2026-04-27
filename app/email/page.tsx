"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import type { EmailMessage, Project } from "@/lib/types";

type AccountStatus = {
  id: number;
  host: string;
  port: number;
  secure: number;
  username: string;
  mailbox: string;
  last_synced_at: number | null;
  last_error: string | null;
};

const PRESETS: Array<{ label: string; host: string; port: number }> = [
  { label: "Gmail", host: "imap.gmail.com", port: 993 },
  { label: "Outlook / Office 365", host: "outlook.office365.com", port: 993 },
  { label: "iCloud", host: "imap.mail.me.com", port: 993 },
  { label: "Yahoo", host: "imap.mail.yahoo.com", port: 993 },
];

export default function EmailPage() {
  const [account, setAccount] = useState<AccountStatus | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [summarizing, setSummarizing] = useState(false);

  const projectMap = useMemo(
    () => new Map(projects.map((p) => [p.id, p])),
    [projects]
  );

  useEffect(() => {
    let cancelled = false;
    const safe = (url: string): Promise<Record<string, unknown>> =>
      fetch(url)
        .then((r) => (r.ok ? r.json() : {}))
        .catch(() => ({}));

    async function load() {
      try {
        const [acctRes, msgRes, prjRes] = await Promise.all([
          safe("/api/email/account"),
          safe("/api/email/messages?limit=100"),
          safe("/api/projects"),
        ]);
        if (cancelled) return;
        setAccount((acctRes.account as AccountStatus | null) ?? null);
        setMessages((msgRes.messages as EmailMessage[]) ?? []);
        setProjects((prjRes.projects as Project[]) ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch("/api/email/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) alert(`Sync failed: ${data.error}`);
      setMessages(data.messages ?? messages);
      const acct = await fetch("/api/email/account").then((r) => r.json());
      setAccount(acct.account ?? null);
    } finally {
      setSyncing(false);
    }
  }

  async function summarize() {
    setSummarizing(true);
    try {
      const res = await fetch("/api/email/summarize", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        alert(`Summarize failed: ${data.error}`);
      } else {
        setMessages(data.messages ?? messages);
      }
    } finally {
      setSummarizing(false);
    }
  }

  async function disconnect() {
    if (!confirm("Disconnect email and delete all cached messages?")) return;
    await fetch("/api/email/account", { method: "DELETE" });
    setAccount(null);
    setMessages([]);
  }

  return (
    <div className="h-screen flex flex-col">
      <AppHeader />
      <div className="flex-1 overflow-hidden flex">
        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-sm text-slate-500">Loading…</div>
          ) : !account ? (
            <ConnectForm
              onSaved={(a) => {
                setAccount(a);
                // Auto-sync on first connect.
                setTimeout(sync, 100);
              }}
            />
          ) : (
            <ConnectedView
              account={account}
              messages={messages}
              projectMap={projectMap}
              syncing={syncing}
              summarizing={summarizing}
              onSync={sync}
              onSummarize={summarize}
              onDisconnect={disconnect}
            />
          )}
        </main>
      </div>
    </div>
  );
}

function ConnectForm({ onSaved }: { onSaved: (a: AccountStatus) => void }) {
  const [host, setHost] = useState("imap.gmail.com");
  const [port, setPort] = useState(993);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/email/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ host, port, username, password, secure: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Connection failed");
        return;
      }
      onSaved(data.account);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-100">
          📬 Connect your inbox
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          ProjectMind reads your IMAP mailbox over a direct, encrypted
          connection. Credentials are stored locally on this machine — they
          never leave the app.
        </p>
      </div>

      <div className="card p-4 space-y-2 text-sm text-slate-300">
        <div className="font-medium text-slate-100">
          ⚠️ Use an app password, not your real password
        </div>
        <ul className="list-disc list-inside text-xs text-slate-400 space-y-1">
          <li>
            Gmail: enable 2FA, then create an{" "}
            <a
              href="https://myaccount.google.com/apppasswords"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              app password
            </a>
            .
          </li>
          <li>
            Outlook / Office 365: create an{" "}
            <a
              href="https://account.microsoft.com/security"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              app password
            </a>{" "}
            in security settings.
          </li>
          <li>iCloud: generate an app-specific password from appleid.apple.com.</li>
        </ul>
      </div>

      <form onSubmit={submit} className="card p-4 space-y-4">
        <div>
          <label className="label block mb-2">Provider preset</label>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className={`chip cursor-pointer ${
                  host === p.host ? "border-accent text-accent" : ""
                }`}
                onClick={() => {
                  setHost(p.host);
                  setPort(p.port);
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="label block mb-1">IMAP host</label>
            <input
              className="input"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label block mb-1">Port</label>
            <input
              className="input"
              type="number"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              required
            />
          </div>
        </div>

        <div>
          <label className="label block mb-1">Email address</label>
          <input
            className="input"
            type="email"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <div>
          <label className="label block mb-1">App password</label>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="xxxx xxxx xxxx xxxx"
            required
          />
        </div>

        {error ? (
          <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          className="btn-primary w-full justify-center"
          disabled={submitting}
        >
          {submitting ? "Testing connection…" : "Connect inbox"}
        </button>
      </form>
    </div>
  );
}

function ConnectedView({
  account,
  messages,
  projectMap,
  syncing,
  summarizing,
  onSync,
  onSummarize,
  onDisconnect,
}: {
  account: AccountStatus;
  messages: EmailMessage[];
  projectMap: Map<string, Project>;
  syncing: boolean;
  summarizing: boolean;
  onSync: () => void;
  onSummarize: () => void;
  onDisconnect: () => void;
}) {
  const [filter, setFilter] = useState<"all" | "tagged" | "untagged">("all");

  const visible = useMemo(() => {
    if (filter === "tagged") return messages.filter((m) => m.project_id);
    if (filter === "untagged") return messages.filter((m) => !m.project_id);
    return messages;
  }, [messages, filter]);

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-100">📬 Inbox</h1>
          <p className="text-sm text-slate-500 mt-1">
            {account.username} on {account.host} ·{" "}
            {account.last_synced_at
              ? `synced ${new Date(account.last_synced_at).toLocaleString()}`
              : "never synced"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            className="btn-secondary text-xs"
            onClick={onSync}
            disabled={syncing}
          >
            {syncing ? "Syncing…" : "🔄 Sync"}
          </button>
          <button
            className="btn-secondary text-xs"
            onClick={onSummarize}
            disabled={summarizing}
          >
            {summarizing ? "Summarizing…" : "✨ AI Tag & summarize"}
          </button>
          <button
            className="btn-ghost text-xs text-red-400"
            onClick={onDisconnect}
          >
            Disconnect
          </button>
        </div>
      </div>

      {account.last_error ? (
        <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded p-2">
          Last sync error: {account.last_error}
        </div>
      ) : null}

      <div className="flex gap-2 text-xs">
        {(["all", "tagged", "untagged"] as const).map((f) => (
          <button
            key={f}
            className={`chip cursor-pointer ${
              filter === f ? "border-accent text-accent" : ""
            }`}
            onClick={() => setFilter(f)}
          >
            {f === "all"
              ? `All (${messages.length})`
              : f === "tagged"
              ? `Project-related (${
                  messages.filter((m) => m.project_id).length
                })`
              : `Untagged (${messages.filter((m) => !m.project_id).length})`}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <div className="card p-6 text-center text-sm text-slate-500">
            No messages.{" "}
            {messages.length === 0
              ? "Hit Sync to pull from your inbox."
              : "Try a different filter."}
          </div>
        ) : (
          visible.map((m) => {
            const project = m.project_id ? projectMap.get(m.project_id) : null;
            return (
              <div key={m.id} className="card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium text-slate-100">
                      {m.subject || "(no subject)"}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {m.from_name || m.from_address} ·{" "}
                      {new Date(m.received_at).toLocaleString()}
                    </div>
                    {(m.summary || m.snippet) && (
                      <div className="text-sm text-slate-300 mt-2 whitespace-pre-wrap">
                        {m.summary ?? m.snippet}
                      </div>
                    )}
                  </div>
                  {project ? (
                    <Link
                      href={`/projects`}
                      className="chip text-[10px] bg-accent-muted/30 border-accent text-accent shrink-0"
                    >
                      📁 {project.name}
                    </Link>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
