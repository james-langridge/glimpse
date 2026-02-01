import { NextRequest, NextResponse } from "next/server";
import {
  getPhotoById,
  getLinksForPhoto,
  getViewCountForPhoto,
} from "@/src/db/photos";

function linkStatus(link: { revoked: boolean; expires_at: Date }) {
  if (link.revoked) return "revoked";
  if (new Date(link.expires_at) < new Date()) return "expired";
  return "active";
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const [links, viewStats] = await Promise.all([
      getLinksForPhoto(id),
      getViewCountForPhoto(id),
    ]);

    const linksWithStatus = links.map((link) => ({
      ...link,
      status: linkStatus(link),
    }));

    return NextResponse.json({
      ...photo,
      links: linksWithStatus,
      total_views: viewStats.total_views,
      unique_visitors: viewStats.unique_visitors,
    });
  } catch (e) {
    console.error("Failed to fetch photo detail:", e);
    return NextResponse.json(
      { error: "Failed to fetch photo detail" },
      { status: 500 },
    );
  }
}
