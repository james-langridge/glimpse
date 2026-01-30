import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/src/lib/cleanup";

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CLEANUP_SECRET;

  if (!expected || auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runCleanup();
    return NextResponse.json({
      deleted: result.deleted.length,
      errors: result.errors.length,
      details: result,
    });
  } catch (e) {
    console.error("Cleanup failed:", e);
    return NextResponse.json({ error: "Cleanup failed" }, { status: 500 });
  }
}
