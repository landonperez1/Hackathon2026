import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Nominatim's policy: identify yourself, no more than ~1 req/sec.
// We don't enforce the rate limit server-side because this is an interactive
// search-as-you-type endpoint; the UI debounces.
const USER_AGENT =
  "ProjectMind/0.1 (https://github.com/landonperez1/Hackathon2026)";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
  type?: string;
  importance?: number;
};

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ results: [] });
  }
  const limit = Math.min(Number(url.searchParams.get("limit") ?? "5") || 5, 10);

  const params = new URLSearchParams({
    q,
    format: "json",
    limit: String(limit),
    addressdetails: "0",
  });
  const upstream = `https://nominatim.openstreetmap.org/search?${params}`;

  try {
    const res = await fetch(upstream, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!res.ok) {
      return NextResponse.json(
        { error: `Nominatim returned ${res.status}` },
        { status: 502 }
      );
    }
    const data = (await res.json()) as NominatimResult[];
    return NextResponse.json({
      results: data.map((d) => ({
        label: d.display_name,
        lat: Number(d.lat),
        lng: Number(d.lon),
        type: d.type ?? "place",
      })),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Geocode request failed: ${message}` },
      { status: 502 }
    );
  }
}
