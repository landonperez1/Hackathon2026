import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const project = createProject({
    name: body.name,
    description: body.description,
  });
  return NextResponse.json({ project }, { status: 201 });
}
