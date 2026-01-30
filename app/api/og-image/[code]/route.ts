import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getLinkByCode, getLinkStatus, getPhotosForCode } from "@/src/db/links";
import { readPhoto } from "@/src/lib/storage";

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await params;
    const upperCode = code.toUpperCase();

    const link = await getLinkByCode(upperCode);
    if (!link || getLinkStatus(link) !== "active") {
      return new NextResponse("Not found", { status: 404 });
    }

    const photos = await getPhotosForCode(upperCode);
    if (photos.length === 0) {
      return new NextResponse("Not found", { status: 404 });
    }

    const firstPhoto = photos[0];
    const data = await readPhoto(firstPhoto.filename);

    const resized = await sharp(data)
      .resize(OG_WIDTH, OG_HEIGHT, { fit: "cover" })
      .jpeg({ quality: 80 })
      .toBuffer();

    return new NextResponse(new Uint8Array(resized), {
      headers: {
        "Content-Type": "image/jpeg",
        "Content-Length": String(resized.length),
        "Cache-Control": "public, max-age=86400, must-revalidate",
      },
    });
  } catch (e) {
    console.error("OG image serve failed:", e);
    return new NextResponse("Error serving image", { status: 500 });
  }
}
