import { NextRequest, NextResponse } from "next/server";
import { generateId, generateShareCode } from "@/src/lib/codes";
import {
  getAllLinks,
  insertLink,
  insertLinkPhotos,
  isCodeUnique,
  getLinkStatus,
} from "@/src/db/links";
import { query } from "@/src/lib/db";

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

    const linksWithCounts = links.map((link) => ({
      ...link,
      status: getLinkStatus(link),
      photo_count: photoCounts.get(link.id) ?? 0,
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
    const { photoIds, expiresAt } = body;

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
    await insertLink({ id, code, expires_at: expiresDate });
    await insertLinkPhotos(id, photoIds);

    return NextResponse.json({ id, code });
  } catch (e) {
    console.error("Failed to create link:", e);
    return NextResponse.json(
      { error: "Failed to create link" },
      { status: 500 },
    );
  }
}
