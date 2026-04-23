import { NextResponse } from "next/server";
import { getStrategy } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const strategy = getStrategy(id);
  if (!strategy)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ strategy });
}
