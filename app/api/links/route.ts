import { NextRequest, NextResponse } from "next/server";
import { generateId, generateShareCode } from "@/src/lib/codes";
import {
  getAllLinks,
  isCodeUnique,
  getLinkStatus,
} from "@/src/db/links";
import { query, withTransaction } from "@/src/lib/db";

export async function GET(request: NextRequest) {
  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const statusFilter =
      statusParam === "active" ||
      statusParam === "expired" ||
      statusParam === "revoked"
        ? statusParam
        : undefined;

    const links = await getAllLinks(statusFilter);

    const countResult = await query<{
      share_link_id: string;
      count: string;
    }>(
      "SELECT share_link_id, COUNT(*) as count FROM share_link_photos GROUP BY share_link_id",
    );
    const photoCounts = new Map(
      countResult.rows.map((r) => [r.share_link_id, parseInt(r.count, 10)]),
    );

    const previewResult = await query<{
      share_link_id: string;
      photo_id: string;
      display_order: number;
    }>(
      "SELECT share_link_id, photo_id, display_order FROM share_link_photos ORDER BY display_order ASC",
    );
    const previewPhotos = new Map<string, string[]>();
    for (const row of previewResult.rows) {
      const ids = previewPhotos.get(row.share_link_id) ?? [];
      if (ids.length < 4) ids.push(row.photo_id);
      previewPhotos.set(row.share_link_id, ids);
    }

    const linksWithCounts = links.map((link) => ({
      ...link,
      status: getLinkStatus(link),
      photo_count: photoCounts.get(link.id) ?? 0,
      preview_photo_ids: previewPhotos.get(link.id) ?? [],
    }));

    return NextResponse.json({ links: linksWithCounts });
  } catch (e) {
    console.error("Failed to fetch links:", e);
    return NextResponse.json(
      { error: "Failed to fetch links" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photoIds, expiresAt, title, allowDownloads } = body;

    if (!Array.isArray(photoIds) || photoIds.length === 0) {
      return NextResponse.json(
        { error: "At least one photo is required" },
        { status: 400 },
      );
    }

    if (!expiresAt) {
      return NextResponse.json(
        { error: "Expiry date is required" },
        { status: 400 },
      );
    }

    const expiresDate = new Date(expiresAt);
    if (isNaN(expiresDate.getTime()) || expiresDate <= new Date()) {
      return NextResponse.json(
        { error: "Expiry must be in the future" },
        { status: 400 },
      );
    }

    let code = generateShareCode();
    let attempts = 0;
    while (!(await isCodeUnique(code)) && attempts < 10) {
      code = generateShareCode();
      attempts++;
    }
    if (attempts >= 10) {
      return NextResponse.json(
        { error: "Failed to generate unique code" },
        { status: 500 },
      );
    }

    const id = generateId();
    await withTransaction(async (client) => {
      const linkTitle =
        typeof title === "string" && title.trim() ? title.trim() : null;
      await client.query(
        "INSERT INTO share_links (id, code, title, allow_downloads, expires_at) VALUES ($1, $2, $3, $4, $5)",
        [id, code, linkTitle, allowDownloads === true, expiresDate.toISOString()],
      );
      for (let i = 0; i < photoIds.length; i++) {
        await client.query(
          "INSERT INTO share_link_photos (share_link_id, photo_id, display_order) VALUES ($1, $2, $3)",
          [id, photoIds[i], i],
        );
      }
    });

    return NextResponse.json({ id, code });
  } catch (e) {
    console.error("Failed to create link:", e);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 },
    );
  }
}
