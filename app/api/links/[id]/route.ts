import { NextRequest, NextResponse } from "next/server";
import {
  getLinkById,
  updateLink,
  deleteLink,
  getPhotosForLink,
  updateLinkPhotos,
  getLinkStatus,
} from "@/src/db/links";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const link = await getLinkById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const photos = await getPhotosForLink(id);

    return NextResponse.json({
      ...link,
      status: getLinkStatus(link),
      photos,
    });
  } catch (e) {
    console.error("Failed to fetch link:", e);
    return NextResponse.json(
      { error: "Failed to fetch link" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const link = await getLinkById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    const body = await request.json();
    const { photoIds, expiresAt, title } = body;

    if (title !== undefined) {
      const trimmed = typeof title === "string" ? title.trim() : null;
      await updateLink(id, { title: trimmed || null });
    }

    if (expiresAt) {
      const expiresDate = new Date(expiresAt);
      if (isNaN(expiresDate.getTime()) || expiresDate <= new Date()) {
        return NextResponse.json(
          { error: "Expiry must be a valid future date" },
          { status: 400 },
        );
      }
      await updateLink(id, { expires_at: expiresDate });
    }

    if (Array.isArray(photoIds)) {
      if (photoIds.length === 0) {
        return NextResponse.json(
          { error: "At least one photo is required" },
          { status: 400 },
        );
      }
      await updateLinkPhotos(id, photoIds);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to update link:", e);
    return NextResponse.json(
      { error: "Failed to update link" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const link = await getLinkById(id);

    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
    }

    await deleteLink(id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Failed to delete link:", e);
    return NextResponse.json(
      { error: "Failed to delete link" },
      { status: 500 },
    );
  }
}
