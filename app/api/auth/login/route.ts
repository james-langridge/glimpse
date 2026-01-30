import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { getSession } from "@/src/lib/auth";

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.ADMIN_PASSWORD ?? "";
  const actual = password ?? "";

  if (!expected || !actual) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  const isValid =
    expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ success: true });
}
