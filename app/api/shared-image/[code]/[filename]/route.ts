import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, getLinkStatus, getPhotosForCode } from "@/src/db/links";
import { readPhoto } from "@/src/lib/storage";
import { checkRateLimit } from "@/src/lib/rate-limit";

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
  request: NextRequest,
  { params }: { params: Promise<{ code: string; filename: string }> },
) {
  try {
    const rateLimited = checkRateLimit(request, "shared-image", 60, 60_000);
    if (rateLimited) return rateLimited;

    const { code, filename } = await params;

    const link = await getLinkByCode(code);
    if (!link || getLinkStatus(link) !== "active") {
      return new NextResponse("Not found", { status: 404 });
    }

    const photos = await getPhotosForCode(code);
    const photo = photos.find((p) => p.filename === filename);
    if (!photo) {
      return new NextResponse("Not found", { status: 404 });
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
    console.error("Shared image serve failed:", e);
    return new NextResponse("Error serving image", { status: 500 });
  }
}
