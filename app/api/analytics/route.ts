import { NextRequest, NextResponse } from "next/server";
import {
  getOverviewStats,
  getViewsOverTime,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getGeoBreakdown,
  getPerLinkStats,
  getRecentViews,
} from "@/src/db/analytics";
import { query } from "@/src/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const linkId = searchParams.get("linkId") ?? undefined;

    const validDays = [7, 30, 90].includes(days) ? days : 30;

    const [
      overview,
      viewsOverTime,
      devices,
      browsers,
      geo,
      perLink,
      recent,
    ] = await Promise.all([
      getOverviewStats(validDays, linkId),
      getViewsOverTime(validDays, linkId),
      getDeviceBreakdown(validDays, linkId),
      getBrowserBreakdown(validDays, linkId),
      getGeoBreakdown(validDays, linkId),
      getPerLinkStats(validDays),
      getRecentViews(20, validDays, linkId),
    ]);

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
    }>(
      "SELECT share_link_id, photo_id FROM share_link_photos ORDER BY display_order ASC",
    );
    const previewPhotos = new Map<string, string[]>();
    for (const row of previewResult.rows) {
      const ids = previewPhotos.get(row.share_link_id) ?? [];
      if (ids.length < 4) ids.push(row.photo_id);
      previewPhotos.set(row.share_link_id, ids);
    }

    const perLinkWithPhotos = perLink.map((link) => ({
      ...link,
      photo_count: photoCounts.get(link.share_link_id) ?? 0,
      preview_photo_ids: previewPhotos.get(link.share_link_id) ?? [],
    }));

    return NextResponse.json({
      overview,
      viewsOverTime,
      devices,
      browsers,
      geo,
      perLink: perLinkWithPhotos,
      recent,
    });
  } catch (e) {
    console.error("Analytics fetch failed:", e);
    return NextResponse.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}
