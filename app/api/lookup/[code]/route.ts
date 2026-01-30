import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, getLinkStatus } from "@/src/db/links";
import { checkRateLimit } from "@/src/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const rateLimited = checkRateLimit(request, "lookup", 10, 60_000);
  if (rateLimited) return rateLimited;

  try {
    const { code } = await params;
    const upperCode = code.toUpperCase();

    const link = await getLinkByCode(upperCode);
    const valid = link !== null && getLinkStatus(link) === "active";

    return NextResponse.json({ valid });
  } catch (e) {
    console.error("Code lookup failed:", e);
    return NextResponse.json({ valid: false });
  }
}
