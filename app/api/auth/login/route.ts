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

  const key = process.env.SESSION_SECRET!;
  const hmacExpected = crypto.createHmac("sha256", key).update(expected).digest();
  const hmacActual = crypto.createHmac("sha256", key).update(actual).digest();
  const isValid = crypto.timingSafeEqual(hmacExpected, hmacActual);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid password" }, { status: 401 });
  }

  const session = await getSession();
  session.isLoggedIn = true;
  await session.save();

  return NextResponse.json({ success: true });
}
