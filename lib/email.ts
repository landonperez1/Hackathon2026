import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import {
  type EmailAccount,
  type EmailMessage,
  getEmailAccount,
  getMaxEmailUid,
  listProjects,
  listUnsummarizedEmails,
  setEmailAccountStatus,
  setEmailMessageSummary,
  upsertEmailMessage,
} from "./db";

export type SyncResult = {
  fetched: number;
  newMessages: EmailMessage[];
  error?: string;
};

function snippet(body: string, max = 240): string {
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? flat.slice(0, max - 1) + "…" : flat;
}

async function withClient<T>(
  account: EmailAccount,
  fn: (client: ImapFlow) => Promise<T>
): Promise<T> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: !!account.secure,
    auth: { user: account.username, pass: account.password },
    logger: false,
  });
  await client.connect();
  try {
    return await fn(client);
  } finally {
    try {
      await client.logout();
    } catch {
      // logout failures aren't actionable; the connection still gets torn down.
    }
  }
}

export async function testConnection(account: {
  host: string;
  port: number;
  secure: boolean;
  username: string;
  password: string;
  mailbox?: string;
}): Promise<void> {
  const client = new ImapFlow({
    host: account.host,
    port: account.port,
    secure: account.secure,
    auth: { user: account.username, pass: account.password },
    logger: false,
  });
  await client.connect();
  try {
    const lock = await client.getMailboxLock(account.mailbox ?? "INBOX");
    lock.release();
  } finally {
    try {
      await client.logout();
    } catch {}
  }
}

export async function syncInbox(maxMessages = 30): Promise<SyncResult> {
  const account = getEmailAccount();
  if (!account) {
    return { fetched: 0, newMessages: [], error: "no email account configured" };
  }

  const since = getMaxEmailUid();
  const newMessages: EmailMessage[] = [];

  try {
    await withClient(account, async (client) => {
      const lock = await client.getMailboxLock(account.mailbox || "INBOX");
      try {
        const range = since > 0 ? `${since + 1}:*` : "1:*";
        const list: Array<{ uid: number }> = [];
        for await (const msg of client.fetch(range, { uid: true }, { uid: true })) {
          list.push({ uid: msg.uid });
        }
        const recent = list.slice(-maxMessages);

        for (const { uid } of recent) {
          if (uid <= since) continue;
          const msg = await client.fetchOne(
            String(uid),
            { source: true, envelope: true, internalDate: true },
            { uid: true }
          );
          if (!msg || !msg.source) continue;
          const parsed = await simpleParser(msg.source);
          const fromAddr = parsed.from?.value?.[0];
          const stored = upsertEmailMessage({
            uid,
            message_id: parsed.messageId ?? msg.envelope?.messageId ?? null,
            subject: parsed.subject ?? msg.envelope?.subject ?? "(no subject)",
            from_name: fromAddr?.name ?? "",
            from_address: fromAddr?.address ?? "",
            snippet: snippet(parsed.text ?? ""),
            body: (parsed.text ?? "").slice(0, 8000),
            received_at:
              parsed.date?.getTime() ??
              (msg.internalDate
                ? new Date(msg.internalDate).getTime()
                : Date.now()),
          });
          newMessages.push(stored);
        }
      } finally {
        lock.release();
      }
    });

    setEmailAccountStatus({ last_synced_at: Date.now(), last_error: null });
    return { fetched: newMessages.length, newMessages };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setEmailAccountStatus({ last_error: message });
    return { fetched: 0, newMessages: [], error: message };
  }
}

// Heuristic project tagging that runs without an LLM call: if the email's
// subject or first 500 characters contain a project name (case-insensitive),
// tag it. The LLM path layers on top of this for messages that don't match
// any project name verbatim.
export function tagMessageHeuristic(
  message: EmailMessage,
  projects: ReturnType<typeof listProjects>
): { project_id: string | null; summary: string } {
  const haystack = (message.subject + " " + message.body.slice(0, 500))
    .toLowerCase();
  const match = projects.find(
    (p) => p.name && haystack.includes(p.name.toLowerCase())
  );
  return {
    project_id: match?.id ?? null,
    summary: snippet(message.body, 320) || message.subject || "(empty message)",
  };
}

export function applyHeuristicTags(): {
  tagged: number;
  totalProcessed: number;
} {
  const projects = listProjects();
  const messages = listUnsummarizedEmails(50);
  let tagged = 0;
  for (const m of messages) {
    const result = tagMessageHeuristic(m, projects);
    setEmailMessageSummary(m.id, result.summary, result.project_id);
    if (result.project_id) tagged++;
  }
  return { tagged, totalProcessed: messages.length };
}
