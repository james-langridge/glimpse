import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/src/lib/cleanup";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCleanup();
  return NextResponse.json({
    deleted: result.deleted.length,
    errors: result.errors.length,
  });
}
