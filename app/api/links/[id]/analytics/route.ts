import { NextRequest, NextResponse } from "next/server";
import { getLinkById } from "@/src/db/links";
import {
  getOverviewStats,
  getViewsOverTime,
  getDeviceBreakdown,
  getBrowserBreakdown,
  getGeoBreakdown,
  getRecentViews,
} from "@/src/db/analytics";
import {
  getDownloadCountForLink,
  getDownloadsForLink,
} from "@/src/db/downloads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const link = await getLinkById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const { searchParams } = request.nextUrl;
    const days = parseInt(searchParams.get("days") ?? "30", 10);
    const validDays = [7, 30, 90].includes(days) ? days : 30;

    const [
      overview,
      viewsOverTime,
      devices,
      browsers,
      geo,
      recent,
      downloadStats,
      recentDownloads,
    ] = await Promise.all([
      getOverviewStats(validDays, id),
      getViewsOverTime(validDays, id),
      getDeviceBreakdown(validDays, id),
      getBrowserBreakdown(validDays, id),
      getGeoBreakdown(validDays, id),
      getRecentViews(20, validDays, id),
      getDownloadCountForLink(id, validDays),
      getDownloadsForLink(id, 20, validDays),
    ]);

    return NextResponse.json({
      overview,
      viewsOverTime,
      devices,
      browsers,
      geo,
      recent,
      downloadStats,
      recentDownloads,
    });
  } catch (e) {
    console.error("Failed to fetch link analytics:", e);
    return NextResponse.json(
      { error: "Failed to fetch link analytics" },
      { status: 500 },
    );
  }
}
