import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { getProjectFile } from "@/lib/db";

export const runtime = "nodejs";

const DATA_DIR = path.join(process.cwd(), "data");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ fileId: string }> }
) {
  const { fileId } = await params;
  const file = getProjectFile(fileId);
  if (!file || !file.storage_path) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const abs = path.join(DATA_DIR, file.storage_path);
  const buf = await fs.readFile(abs).catch(() => null);
  if (!buf) {
    return NextResponse.json({ error: "file missing on disk" }, { status: 404 });
  }
  const headers = new Headers();
  headers.set("Content-Type", file.mime_type ?? "application/octet-stream");
  headers.set(
    "Content-Disposition",
    `attachment; filename="${encodeURIComponent(file.original_filename ?? file.name)}"`
  );
  return new NextResponse(buf, { headers });
}
