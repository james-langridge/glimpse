import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { runCleanup } from "@/src/lib/cleanup";

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${cronSecret}`);
  const actual = Buffer.from(authHeader);
  if (
    expected.length !== actual.length ||
    !crypto.timingSafeEqual(expected, actual)
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runCleanup();
  return NextResponse.json({
    deleted: result.deleted.length,
    orphansRemoved: result.orphansRemoved,
    errors: result.errors.length,
  });
}
