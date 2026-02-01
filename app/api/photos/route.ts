import { NextResponse } from "next/server";
import { getAllPhotosWithStats } from "@/src/db/photos";

export async function GET() {
  try {
    const photos = await getAllPhotosWithStats();
    return NextResponse.json({ photos });
  } catch (e) {
    console.error("Failed to fetch photos:", e);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 },
    );
  }
}
