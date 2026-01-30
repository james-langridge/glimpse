import { NextResponse } from "next/server";
import { getSession } from "@/src/lib/auth";

export async function POST() {
  try {
    const session = await getSession();
    session.destroy();
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Logout failed:", e);
    return NextResponse.json({ error: "Logout failed" }, { status: 500 });
  }
}
