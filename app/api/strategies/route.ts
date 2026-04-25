import { NextResponse } from "next/server";
import {
  createStrategy,
  listAllFiles,
  listCompletedStrategies,
  listInteractionMentions,
  listInteractions,
  listPeople,
  listProjects,
  listStrategies,
} from "@/lib/db";
import { generateStrategies } from "@/lib/anthropic";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET() {
  return NextResponse.json({ strategies: listStrategies() });
}

export async function POST(req: Request) {
  const body = await req.json();
  const description = body?.project_description;
  if (!description || typeof description !== "string") {
    return NextResponse.json(
      { error: "project_description is required" },
      { status: 400 }
    );
  }

  try {
    const options = await generateStrategies({
      projectDescription: description,
      people: listPeople(),
      interactions: listInteractions(),
      completedStrategies: listCompletedStrategies(),
      projects: listProjects(),
      files: listAllFiles(),
      mentions: listInteractionMentions(),
    });
    const strategy = createStrategy({
      project_description: description,
      options,
    });
    return NextResponse.json({ strategy }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
