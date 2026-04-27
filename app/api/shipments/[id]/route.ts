import { NextResponse } from "next/server";
import {
  deleteShipment,
  type ShipmentStatus,
  updateShipment,
} from "@/lib/db";

export const runtime = "nodejs";

const VALID_STATUSES = new Set<ShipmentStatus>([
  "scheduled",
  "loading",
  "in_transit",
  "delivered",
  "delayed",
  "cancelled",
]);

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const k of [
    "project_id",
    "label",
    "cargo",
    "origin_id",
    "destination_id",
    "notes",
  ]) {
    if (k in body) patch[k] = body[k];
  }
  if ("status" in body) {
    if (!VALID_STATUSES.has(body.status))
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    patch.status = body.status;
  }
  if ("eta" in body) patch.eta = body.eta;
  if ("progress" in body) {
    const p = Number(body.progress);
    if (!Number.isFinite(p) || p < 0 || p > 1) {
      return NextResponse.json(
        { error: "progress must be 0..1" },
        { status: 400 }
      );
    }
    patch.progress = p;
  }

  const updated = updateShipment(id, patch);
  if (!updated) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ shipment: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const ok = deleteShipment(id);
  if (!ok) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
