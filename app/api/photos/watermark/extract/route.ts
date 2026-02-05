import { NextRequest, NextResponse } from "next/server";
import { extractWatermark } from "@/src/lib/watermark";
import { getDownloadById } from "@/src/db/downloads";
import { checkRateLimit } from "@/src/lib/rate-limit";

const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB

export async function POST(request: NextRequest) {
  try {
    const rateLimited = checkRateLimit(request, "watermark-extract", 10, 60_000);
    if (rateLimited) return rateLimited;

    const formData = await request.formData();
    const file = formData.get("image") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image provided" },
        { status: 400 },
      );
    }

    if (file.size > MAX_UPLOAD_SIZE) {
      return NextResponse.json(
        { error: "File too large" },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const result = await extractWatermark(buffer);

    if (!result) {
      return NextResponse.json({ found: false });
    }

    const download = await getDownloadById(result.downloadId);

    return NextResponse.json({
      found: true,
      source: result.source,
      downloadId: result.downloadId,
      download,
    });
  } catch (e) {
    console.error("Watermark extraction failed:", e);
    return NextResponse.json(
      { error: "Extraction failed" },
      { status: 500 },
    );
  }
}
