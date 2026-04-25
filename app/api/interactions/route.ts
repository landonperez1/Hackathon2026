import { NextResponse } from "next/server";
import {
  createInteraction,
  listInteractionMentions,
  listInteractions,
  type MentionType,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  if (url.searchParams.get("include") === "mentions") {
    return NextResponse.json({
      interactions: listInteractions(),
      mentions: listInteractionMentions(),
    });
  }
  return NextResponse.json({ interactions: listInteractions() });
}

const VALID_MENTION_TYPES: MentionType[] = ["person", "project", "file"];

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.content || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }

  const rawMentions: Array<{ type: string; id: string }> = Array.isArray(
    body.mentions
  )
    ? body.mentions
    : [];
  const mentions = rawMentions
    .filter(
      (m) =>
        m &&
        typeof m.id === "string" &&
        typeof m.type === "string" &&
        VALID_MENTION_TYPES.includes(m.type as MentionType)
    )
    .map((m) => ({ type: m.type as MentionType, id: m.id }));

  const interaction = createInteraction({
    person_id: body.person_id ?? null,
    content: body.content,
    project_context: body.project_context,
    mentions,
  });
  return NextResponse.json({ interaction }, { status: 201 });
}
