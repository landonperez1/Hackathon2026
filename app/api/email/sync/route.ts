import { NextResponse } from "next/server";
import { applyHeuristicTags, syncInbox } from "@/lib/email";
import { listEmailMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function POST() {
  const result = await syncInbox(30);
  // Apply a fast heuristic pass so newly-fetched mail gets a project tag
  // and snippet immediately, even before the LLM summary runs.
  if (result.fetched > 0) {
    applyHeuristicTags();
  }
  return NextResponse.json({
    fetched: result.fetched,
    error: result.error ?? null,
    messages: listEmailMessages(50),
  });
}
