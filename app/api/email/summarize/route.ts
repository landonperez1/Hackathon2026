import { NextResponse } from "next/server";
import {
  listEmailMessages,
  listProjects,
  listUnsummarizedEmails,
  setEmailMessageSummary,
} from "@/lib/db";
import { summarizeEmails } from "@/lib/anthropic";

export const runtime = "nodejs";

export async function POST() {
  const projects = listProjects();
  const pending = listUnsummarizedEmails(20);
  if (pending.length === 0) {
    return NextResponse.json({
      summarized: 0,
      messages: listEmailMessages(50),
    });
  }

  try {
    const results = await summarizeEmails({
      messages: pending.map((m) => ({
        id: m.id,
        subject: m.subject,
        from_name: m.from_name,
        from_address: m.from_address,
        received_at: m.received_at,
        body: m.body,
      })),
      projects,
    });

    const byId = new Map(results.map((r) => [r.message_id, r]));
    for (const m of pending) {
      const r = byId.get(m.id);
      if (!r) continue;
      setEmailMessageSummary(m.id, r.summary, r.project_id);
    }

    return NextResponse.json({
      summarized: results.length,
      messages: listEmailMessages(50),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Summarization failed: ${message}` },
      { status: 500 }
    );
  }
}
