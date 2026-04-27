import { NextResponse } from "next/server";
import { createShipment, listShipments, type ShipmentStatus } from "@/lib/db";

export const runtime = "nodejs";

const VALID_STATUSES = new Set<ShipmentStatus>([
  "scheduled",
  "loading",
  "in_transit",
  "delivered",
  "delayed",
  "cancelled",
]);

export async function GET() {
  try {
    return NextResponse.json({ shipments: listShipments() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { shipments: [], error: message },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });

  if (!body.label || typeof body.label !== "string") {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  if (!body.origin_id || !body.destination_id) {
    return NextResponse.json(
      { error: "origin_id and destination_id are required" },
      { status: 400 }
    );
  }
  const status = body.status as ShipmentStatus | undefined;
  if (status && !VALID_STATUSES.has(status)) {
    return NextResponse.json({ error: "invalid status" }, { status: 400 });
  }

  const shipment = createShipment({
    project_id: body.project_id ?? null,
    label: body.label,
    cargo: body.cargo,
    origin_id: body.origin_id,
    destination_id: body.destination_id,
    status,
    eta: body.eta ?? null,
    progress: typeof body.progress === "number" ? body.progress : 0,
    notes: body.notes,
  });
  return NextResponse.json({ shipment }, { status: 201 });
}
