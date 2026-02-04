import { NextRequest, NextResponse } from "next/server";
import { getLinkByCode, getLinkStatus, getPhotosForCode } from "@/src/db/links";
import { insertDownload } from "@/src/db/downloads";
import { readPhoto } from "@/src/lib/storage";
import { checkRateLimit, getClientIP } from "@/src/lib/rate-limit";
import { hashIP, isBot, parseGeo, parseUserAgent } from "@/src/lib/analytics";

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
    const rateLimited = checkRateLimit(request, "download", 20, 60_000);
    if (rateLimited) return rateLimited;

    const { code, filename } = await params;
    const upperCode = code.toUpperCase();

    const link = await getLinkByCode(upperCode);
    if (!link || getLinkStatus(link) !== "active") {
      return new NextResponse("Not found", { status: 404 });
    }

    if (!link.allow_downloads) {
      return NextResponse.json(
        { error: "Downloads are not enabled for this link" },
        { status: 403 },
      );
    }

    const photos = await getPhotosForCode(upperCode);
    const photo = photos.find((p) => p.filename === filename);
    if (!photo) {
      return new NextResponse("Not found", { status: 404 });
    }

    // Record download analytics (fire-and-forget)
    const ip = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";
    if (!isBot(userAgent)) {
      const ipHash = ip !== "unknown" ? hashIP(ip) : null;
      const geo = ip !== "unknown" ? parseGeo(ip) : { country: null, city: null };
      const ua = parseUserAgent(userAgent);
      insertDownload({
        share_link_id: link.id,
        photo_id: photo.id,
        ip_hash: ipHash,
        country: geo.country,
        city: geo.city,
        user_agent: userAgent || null,
        device_type: ua.device_type,
        browser: ua.browser,
        os: ua.os,
      }).catch((err) => console.error("Failed to record download:", err));
    }

    const data = await readPhoto(photo.filename);
    const downloadName = photo.original_name ?? photo.filename;
    const safeName = downloadName.replace(/["\r\n]/g, "_");

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeType(photo.filename),
        "Content-Length": String(data.length),
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Download serve failed:", e);
    return new NextResponse("Error serving download", { status: 500 });
  }
}
