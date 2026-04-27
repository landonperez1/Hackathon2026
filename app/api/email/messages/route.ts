import { NextResponse } from "next/server";
import { listEmailMessages } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Math.min(
      Number(url.searchParams.get("limit") ?? "50") || 50,
      200
    );
    return NextResponse.json({ messages: listEmailMessages(limit) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ messages: [], error: message }, { status: 500 });
  }
}
