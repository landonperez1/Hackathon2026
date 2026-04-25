import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { deleteProjectFile, getProjectFile, updateProjectFile } from "@/lib/db";

export const runtime = "nodejs";

const DATA_DIR =
  process.env.PROJECTMIND_DATA_DIR ?? path.join(process.cwd(), "data");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { fileId } = await params;
  const file = getProjectFile(fileId);
  if (!file)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ file });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { fileId } = await params;
  const body = await req.json();
  const file = updateProjectFile(fileId, body);
  if (!file)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ file });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; fileId: string }> }
) {
  const { fileId } = await params;
  const existing = deleteProjectFile(fileId);
  if (!existing)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  if (existing.storage_path) {
    const abs = path.join(DATA_DIR, existing.storage_path);
    await fs.unlink(abs).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
