import { NextRequest, NextResponse } from "next/server";
import { getPhotoById, deletePhoto } from "@/src/db/photos";
import { getActiveLinksForPhoto } from "@/src/db/links";
import { deletePhotoFile } from "@/src/lib/storage";

const MAX_BULK_DELETE = 100;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: unknown[] = body.ids;
    const force: boolean = body.force === true;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { error: "ids must be a non-empty array" },
        { status: 400 },
      );
    }

    if (ids.length > MAX_BULK_DELETE) {
      return NextResponse.json(
        { error: `Cannot delete more than ${MAX_BULK_DELETE} photos at once` },
        { status: 400 },
      );
    }

    if (!ids.every((id) => typeof id === "string" && id.length > 0)) {
      return NextResponse.json(
        { error: "All ids must be non-empty strings" },
        { status: 400 },
      );
    }

    const results = await Promise.all(
      (ids as string[]).map(async (id) => {
        const photo = await getPhotoById(id);
        if (!photo) return { photo: null, conflict: null };

        const activeLinks = await getActiveLinksForPhoto(id);
        const conflict =
          activeLinks.length > 0
            ? {
                photoId: id,
                links: activeLinks.map((l) => ({ id: l.id, code: l.code })),
              }
            : null;

        return { photo, conflict };
      }),
    );

    const conflicts = results
      .map((r) => r.conflict)
      .filter((c): c is NonNullable<typeof c> => c !== null);

    if (conflicts.length > 0 && !force) {
      return NextResponse.json({ conflicts }, { status: 409 });
    }

    const deleted: string[] = [];
    const failed: string[] = [];

    for (const { photo } of results) {
      if (!photo) continue;
      try {
        await deletePhoto(photo.id);
        try {
          await deletePhotoFile(photo.filename);
        } catch (fileErr) {
          console.error(`Orphaned file ${photo.filename} (DB record deleted):`, fileErr);
        }
        deleted.push(photo.id);
      } catch (e) {
        console.error(`Failed to delete photo ${photo.id}:`, e);
        failed.push(photo.id);
      }
    }

    return NextResponse.json({ deleted, failed });
  } catch (e) {
    console.error("Bulk delete failed:", e);
    return NextResponse.json(
      { error: "Bulk delete failed" },
      { status: 500 },
    );
  }
}
