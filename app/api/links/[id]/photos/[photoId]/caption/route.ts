import { NextRequest, NextResponse } from "next/server";
import { getLinkById, updateLinkPhotoCaption } from "@/src/db/links";

const MAX_CAPTION_LENGTH = 500;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> },
) {
  try {
    const { id, photoId } = await params;

    const link = await getLinkById(id);
    if (!link) {
      return NextResponse.json({ error: "Link not found" }, { status: 404 });
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

    const updated = await updateLinkPhotoCaption(id, photoId, caption);
    if (!updated) {
      return NextResponse.json(
        { error: "Photo not found in this link" },
        { status: 404 },
      );
    }

    return NextResponse.json({ success: true, caption });
  } catch (e) {
    console.error("Update link photo caption failed:", e);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 },
    );
  }
}
