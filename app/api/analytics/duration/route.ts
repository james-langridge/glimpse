import { NextRequest, NextResponse } from "next/server";
import { updateDuration } from "@/src/db/analytics";

export async function POST(request: NextRequest) {
  try {
    const { viewId, durationMs } = await request.json();

    if (typeof viewId !== "number" || typeof durationMs !== "number") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    if (durationMs < 0 || durationMs > 86_400_000) {
      return NextResponse.json({ error: "Invalid duration" }, { status: 400 });
    }

    await updateDuration(viewId, durationMs);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update duration" },
      { status: 500 },
    );
  }
}
