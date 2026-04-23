import { NextResponse } from "next/server";
import { createInteraction, listInteractions } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ interactions: listInteractions() });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.content || typeof body.content !== "string") {
    return NextResponse.json(
      { error: "content is required" },
      { status: 400 }
    );
  }
  const interaction = createInteraction({
    person_id: body.person_id ?? null,
    content: body.content,
    project_context: body.project_context,
  });
  return NextResponse.json({ interaction }, { status: 201 });
}
