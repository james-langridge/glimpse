import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
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

const MAX_WIDTH = 1920;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const raw = await readPhoto(photo.filename);
    const wParam = request.nextUrl.searchParams.get("w");
    const requestedWidth = wParam ? parseInt(wParam, 10) : null;
    const width =
      requestedWidth && requestedWidth > 0 && requestedWidth <= MAX_WIDTH
        ? requestedWidth
        : null;

    if (width) {
      const resized = await sharp(raw)
        .resize(width, undefined, { withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toBuffer();

      return new NextResponse(new Uint8Array(resized), {
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": String(resized.length),
          "Cache-Control": "private, max-age=3600, must-revalidate",
          "Content-Disposition": "inline",
        },
      });
    }

    return new NextResponse(new Uint8Array(raw), {
      headers: {
        "Content-Type": mimeType(photo.filename),
        "Content-Length": String(raw.length),
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
