import { NextRequest, NextResponse } from "next/server";
import { getLinkById } from "@/src/db/links";
import { updateLinkPhotoCaption } from "@/src/db/links";

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

    await updateLinkPhotoCaption(id, photoId, caption);

    return NextResponse.json({ success: true, caption });
  } catch (e) {
    console.error("Update link photo caption failed:", e);
    return NextResponse.json(
      { error: "Update failed" },
      { status: 500 },
    );
  }
}
