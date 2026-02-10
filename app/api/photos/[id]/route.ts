import { NextRequest, NextResponse } from "next/server";
import { getPhotoById, updatePhotoCaption } from "@/src/db/photos";
import { getActiveLinksForPhoto } from "@/src/db/links";
import { safeDeletePhoto } from "@/src/lib/cleanup";

const MAX_CAPTION_LENGTH = 500;

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const body = await request.json();
    const rawCaption = body.caption;
    const caption =
      typeof rawCaption === "string" ? rawCaption.trim() || null : null;

    if (caption && caption.length > MAX_CAPTION_LENGTH) {
      return NextResponse.json(
        { error: "Caption too long" },
        { status: 400 },
      );
    }

    await updatePhotoCaption(id, caption);

    return NextResponse.json({ success: true, caption });
  } catch (e) {
    console.error("Update failed:", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const activeLinks = await getActiveLinksForPhoto(id);
    const force = request.nextUrl.searchParams.get("force") === "1";

    if (activeLinks.length > 0 && !force) {
      return NextResponse.json(
        {
          warning: "Photo is in active share links",
          activeLinks: activeLinks.map((l) => ({ id: l.id, code: l.code })),
        },
        { status: 409 },
      );
    }

    await safeDeletePhoto(id, photo.filename);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete failed:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
