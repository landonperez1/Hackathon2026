import { NextResponse } from "next/server";
import { deleteLocation, updateLocation } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const k of ["project_id", "label", "address", "kind", "notes"]) {
    if (k in body) patch[k] = body[k];
  }
  if ("lat" in body) {
    const lat = Number(body.lat);
    if (!Number.isFinite(lat))
      return NextResponse.json({ error: "lat invalid" }, { status: 400 });
    patch.lat = lat;
  }
  if ("lng" in body) {
    const lng = Number(body.lng);
    if (!Number.isFinite(lng))
      return NextResponse.json({ error: "lng invalid" }, { status: 400 });
    patch.lng = lng;
  }

  const updated = updateLocation(id, patch);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ location: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const ok = deleteLocation(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
