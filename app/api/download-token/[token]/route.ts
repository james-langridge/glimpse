import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, getClientIP } from "@/src/lib/rate-limit";
import { getDownloadToken } from "@/src/db/download-tokens";
import { withTransaction } from "@/src/lib/db";
import { readPhoto } from "@/src/lib/storage";
import { embedWatermark } from "@/src/lib/watermark";
import { hashIP, parseGeo, parseUserAgent } from "@/src/lib/analytics";

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
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const rateLimited = checkRateLimit(request, "download-token", 20, 60_000);
    if (rateLimited) return rateLimited;

    const { token } = await params;

    const dt = await getDownloadToken(token);
    if (!dt) {
      return new NextResponse("Download link not found.", { status: 404 });
    }

    if (dt.consumed_at) {
      return new NextResponse("This download link has already been used.", {
        status: 410,
      });
    }

    if (new Date(dt.expires_at) < new Date()) {
      return new NextResponse("This download link has expired.", {
        status: 410,
      });
    }

    if (dt.link_revoked || new Date(dt.link_expires_at) < new Date()) {
      return new NextResponse("The share link is no longer active.", {
        status: 410,
      });
    }

    if (!dt.allow_downloads) {
      return new NextResponse("Downloads have been disabled for this link.", {
        status: 403,
      });
    }

    const ip = getClientIP(request);
    const userAgent = request.headers.get("user-agent") || "";
    const ipHash = ip !== "unknown" ? hashIP(ip) : null;
    const geo =
      ip !== "unknown" ? parseGeo(ip) : { country: null, city: null };
    const ua = parseUserAgent(userAgent);

    let downloadId: number | null = null;

    try {
      downloadId = await withTransaction(async (client) => {
        const consumed = await client.query(
          "UPDATE download_tokens SET consumed_at = NOW() WHERE token = $1 AND consumed_at IS NULL RETURNING id",
          [token],
        );

        if (consumed.rowCount === 0) {
          return null;
        }

        const result = await client.query<{ id: number }>(
          `INSERT INTO photo_downloads (share_link_id, photo_id, ip_hash, country, city, user_agent, device_type, browser, os, email, download_token_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
           RETURNING id`,
          [
            dt.share_link_id,
            dt.photo_id,
            ipHash,
            geo.country,
            geo.city,
            userAgent || null,
            ua.device_type,
            ua.browser,
            ua.os,
            dt.email,
            dt.id,
          ],
        );
        return result.rows[0].id;
      });
    } catch (err) {
      console.error("Failed to consume token:", err);
      return new NextResponse("Failed to process download.", { status: 500 });
    }

    if (downloadId === null) {
      return new NextResponse("This download link has already been used.", {
        status: 410,
      });
    }

    const data = await readPhoto(dt.filename);
    const downloadName = dt.original_name ?? dt.filename;
    const safeName = downloadName.replace(/["\r\n]/g, "_");

    try {
      const { buffer: watermarked, contentType } = await embedWatermark(
        data,
        downloadId,
      );
      return new NextResponse(new Uint8Array(watermarked), {
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(watermarked.length),
          "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
          "Cache-Control": "no-store",
        },
      });
    } catch (err) {
      console.error("Watermark failed, serving raw file:", err);
    }

    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": mimeType(dt.filename),
        "Content-Length": String(data.length),
        "Content-Disposition": `attachment; filename="${safeName}"; filename*=UTF-8''${encodeURIComponent(downloadName)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("Token download failed:", e);
    return new NextResponse("Error serving download", { status: 500 });
  }
}
