import { NextResponse } from "next/server";
import {
  deleteRelationship,
  listRelationships,
  setRelationship,
} from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ relationships: listRelationships() });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.person_a_id || !body?.person_b_id) {
    return NextResponse.json(
      { error: "person_a_id and person_b_id are required" },
      { status: 400 }
    );
  }
  const rel = setRelationship(
    body.person_a_id,
    body.person_b_id,
    body.strength ?? 1
  );
  if (!rel) {
    return NextResponse.json(
      { error: "cannot relate a person to themselves" },
      { status: 400 }
    );
  }
  return NextResponse.json({ relationship: rel }, { status: 201 });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  if (!body?.person_a_id || !body?.person_b_id) {
    return NextResponse.json(
      { error: "person_a_id and person_b_id are required" },
      { status: 400 }
    );
  }
  const ok = deleteRelationship(body.person_a_id, body.person_b_id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
