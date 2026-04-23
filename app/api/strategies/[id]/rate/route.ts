import { NextResponse } from "next/server";
import { rateStrategy } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const chosen = body?.chosen_index;
  const rating = body?.rating;
  if (
    typeof chosen !== "number" ||
    typeof rating !== "number" ||
    rating < 1 ||
    rating > 5
  ) {
    return NextResponse.json(
      {
        error:
          "chosen_index (number) and rating (1-5 number) are required",
      },
      { status: 400 }
    );
  }
  const feedback = typeof body?.feedback === "string" ? body.feedback : "";
  const strategy = rateStrategy(id, chosen, rating, feedback);
  if (!strategy)
    return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ strategy });
}
