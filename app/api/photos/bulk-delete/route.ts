import { NextRequest, NextResponse } from "next/server";
import { getPhotoById, deletePhoto } from "@/src/db/photos";
import { getActiveLinksForPhoto } from "@/src/db/links";
import { deletePhotoFile } from "@/src/lib/storage";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids;
    const force: boolean = body.force === true;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 },
      );
    }

    const conflicts: { photoId: string; links: { id: string; code: string }[] }[] = [];

    const photos = await Promise.all(
      ids.map(async (id) => {
        const photo = await getPhotoById(id);
        if (!photo) return null;

        const activeLinks = await getActiveLinksForPhoto(id);
        if (activeLinks.length > 0) {
          conflicts.push({
            photoId: id,
            links: activeLinks.map((l) => ({ id: l.id, code: l.code })),
          });
        }

        return photo;
      }),
    );

    if (conflicts.length > 0 && !force) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    const deleted: string[] = [];

    for (const photo of photos) {
      if (!photo) continue;
      await deletePhotoFile(photo.filename);
      await deletePhoto(photo.id);
      deleted.push(photo.id);
    }

    return NextResponse.json({ deleted });
  } catch (e) {
    console.error("Bulk delete failed:", e);
    return NextResponse.json(
      { error: "Bulk delete failed" },
      { status: 500 },
    );
  }
}
