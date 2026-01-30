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
      getOverviewStats(validDays),
      getViewsOverTime(validDays, linkId),
      getDeviceBreakdown(validDays, linkId),
      getBrowserBreakdown(validDays, linkId),
      getGeoBreakdown(validDays, linkId),
      getPerLinkStats(validDays),
      getRecentViews(20),
    ]);

    return NextResponse.json({
      overview,
      viewsOverTime,
      devices,
      browsers,
      geo,
      perLink,
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
