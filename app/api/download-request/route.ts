import { NextRequest, NextResponse } from "next/server";
import {
  checkRateLimit,
  getClientIP,
  isRateLimited,
} from "@/src/lib/rate-limit";
import { getLinkByCode, getLinkStatus, getPhotosForCode } from "@/src/db/links";
import { createDownloadToken } from "@/src/db/download-tokens";
import { sendDownloadEmail } from "@/src/lib/email";
import { hashIP } from "@/src/lib/analytics";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: NextRequest) {
  try {
    const rateLimited = checkRateLimit(request, "download-request", 10, 60_000);
    if (rateLimited) return rateLimited;

    const body = await request.json();
    const { code, filename, email } = body;

    if (!code || !filename || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 },
      );
    }

    const { limited } = isRateLimited(
      `download-request:email:${email.toLowerCase()}`,
      5,
      900_000,
    );
    if (limited) {
      return NextResponse.json(
        { error: "Too many download requests for this email. Please try again later." },
        { status: 429 },
      );
    }

    const link = await getLinkByCode(code);
    if (!link || getLinkStatus(link) !== "active") {
      return NextResponse.json(
        { error: "Share link not found or expired" },
        { status: 404 },
      );
    }

    if (!link.allow_downloads) {
      return NextResponse.json(
        { error: "Downloads are not enabled for this link" },
        { status: 403 },
      );
    }

    const photos = await getPhotosForCode(code);
    const photo = photos.find((p) => p.filename === filename);
    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const ip = getClientIP(request);
    const ipHash = ip !== "unknown" ? hashIP(ip) : null;

    const { token } = await createDownloadToken({
      share_link_id: link.id,
      photo_id: photo.id,
      email: email.toLowerCase(),
      ip_hash: ipHash,
    });

    const siteUrl = process.env.SITE_URL || "http://localhost:3000";
    const downloadUrl = `${siteUrl}/api/download-token/${token}`;
    const photoName = photo.original_name ?? photo.filename;

    await sendDownloadEmail({
      to: email,
      downloadUrl,
      photoName,
      linkTitle: link.title,
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Download request failed:", e);
    return NextResponse.json(
      { error: "Failed to process download request" },
      { status: 500 },
    );
  }
}
