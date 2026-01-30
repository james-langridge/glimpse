import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { runCleanup } from "@/src/lib/cleanup";

function verifyBearerToken(header: string | null, expected: string): boolean {
  const token = header?.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !expected) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const expected = process.env.CLEANUP_SECRET;

  if (!expected || !verifyBearerToken(auth, expected)) {
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
