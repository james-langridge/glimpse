import { NextRequest, NextResponse } from "next/server";
import { getPhotoById } from "@/src/db/photos";
import {
  getOverviewStatsForPhoto,
  getViewsOverTimeForPhoto,
  getDeviceBreakdownForPhoto,
  getBrowserBreakdownForPhoto,
  getGeoBreakdownForPhoto,
  getRecentViewsForPhoto,
} from "@/src/db/analytics";
import {
  getDownloadCountForPhoto,
  getDownloadsForPhoto,
} from "@/src/db/downloads";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
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
      getOverviewStatsForPhoto(id, validDays),
      getViewsOverTimeForPhoto(id, validDays),
      getDeviceBreakdownForPhoto(id, validDays),
      getBrowserBreakdownForPhoto(id, validDays),
      getGeoBreakdownForPhoto(id, validDays),
      getRecentViewsForPhoto(id, 20, validDays),
      getDownloadCountForPhoto(id, validDays),
      getDownloadsForPhoto(id, 20, validDays),
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
    console.error("Failed to fetch photo analytics:", e);
    return NextResponse.json(
      { error: "Failed to fetch photo analytics" },
      { status: 500 },
    );
  }
}
