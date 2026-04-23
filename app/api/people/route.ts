import { NextResponse } from "next/server";
import { createPerson, listPeople } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ people: listPeople() });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json(
      { error: "name is required" },
      { status: 400 }
    );
  }
  const person = createPerson({
    name: body.name,
    role: body.role,
    reliability: body.reliability,
    workload: body.workload,
    communication_style: body.communication_style,
    personality_notes: body.personality_notes,
  });
  return NextResponse.json({ person }, { status: 201 });
}
