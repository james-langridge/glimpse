import { NextRequest, NextResponse } from "next/server";
import { getPhotoById } from "@/src/db/photos";
import { readPhoto } from "@/src/lib/storage";

const MIME_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

function mimeType(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return MIME_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const data = await readPhoto(photo.filename);

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeType(photo.filename),
        "Content-Length": String(data.length),
        "Cache-Control": "private, max-age=3600, must-revalidate",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    console.error("Image serve failed:", e);
    return NextResponse.json(
      { error: "Failed to serve image" },
      { status: 500 },
    );
  }
}
