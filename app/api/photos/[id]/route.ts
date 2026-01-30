import { NextRequest, NextResponse } from "next/server";
import { getPhotoById, deletePhoto } from "@/src/db/photos";
import { getActiveLinksForPhoto } from "@/src/db/links";
import { deletePhotoFile } from "@/src/lib/storage";

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

    await deletePhotoFile(photo.filename);
    await deletePhoto(id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete failed:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
