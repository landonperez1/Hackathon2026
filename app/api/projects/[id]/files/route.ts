import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import {
  createProjectFile,
  getProject,
  listProjectFiles,
} from "@/lib/db";

export const runtime = "nodejs";

const FILES_DIR = path.join(process.cwd(), "data", "files");

async function ensureFilesDir() {
  await fs.mkdir(FILES_DIR, { recursive: true });
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getProject(id))
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ files: listProjectFiles(id) });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!getProject(id))
    return NextResponse.json({ error: "project not found" }, { status: 404 });

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const name = (form.get("name") as string | null) ?? "";
    const notes = (form.get("notes") as string | null) ?? "";
    const file = form.get("file") as File | null;

    if (!name.trim() && !file) {
      return NextResponse.json(
        { error: "name or file is required" },
        { status: 400 }
      );
    }

    let storagePath: string | null = null;
    let originalFilename: string | null = null;
    let mimeType: string | null = null;
    let sizeBytes: number | null = null;

    if (file) {
      await ensureFilesDir();
      const safeBase = crypto.randomUUID();
      const ext = path.extname(file.name);
      const diskName = `${safeBase}${ext}`;
      const diskPath = path.join(FILES_DIR, diskName);
      const buf = Buffer.from(await file.arrayBuffer());
      await fs.writeFile(diskPath, buf);
      storagePath = `files/${diskName}`;
      originalFilename = file.name;
      mimeType = file.type || null;
      sizeBytes = buf.length;
    }

    const created = createProjectFile({
      project_id: id,
      name: name.trim() || originalFilename || "Untitled",
      notes,
      storage_path: storagePath,
      original_filename: originalFilename,
      mime_type: mimeType,
      size_bytes: sizeBytes,
    });
    return NextResponse.json({ file: created }, { status: 201 });
  }

  const body = await req.json().catch(() => null);
  if (!body?.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  const created = createProjectFile({
    project_id: id,
    name: body.name,
    notes: body.notes ?? "",
  });
  return NextResponse.json({ file: created }, { status: 201 });
}
