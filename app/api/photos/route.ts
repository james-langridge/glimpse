import { NextResponse } from "next/server";
import { getAllPhotos } from "@/src/db/photos";

export async function GET() {
  try {
    const photos = await getAllPhotos();
    return NextResponse.json({ photos });
  } catch (e) {
    console.error("Failed to fetch photos:", e);
    return NextResponse.json(
      { error: "Failed to fetch photos" },
      { status: 500 },
    );
  }
}
