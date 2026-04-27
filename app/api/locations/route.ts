import { NextResponse } from "next/server";
import { createLocation, listLocations } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ locations: listLocations() });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "invalid json" }, { status: 400 });
  if (!body.label || typeof body.label !== "string") {
    return NextResponse.json({ error: "label is required" }, { status: 400 });
  }
  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json(
      { error: "lat/lng must be finite numbers" },
      { status: 400 }
    );
  }
  const location = createLocation({
    project_id: body.project_id ?? null,
    label: body.label,
    address: body.address ?? "",
    lat,
    lng,
    kind: body.kind,
    notes: body.notes,
  });
  return NextResponse.json({ location }, { status: 201 });
}
