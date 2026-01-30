import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, getLinkStatus } from "@/src/db/links";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
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
