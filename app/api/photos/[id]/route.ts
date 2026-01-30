import { NextRequest, NextResponse } from "next/server";
import { getPhotoById, deletePhoto } from "@/src/db/photos";
import { deletePhotoFile } from "@/src/lib/storage";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const photo = await getPhotoById(id);

    if (!photo) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    await deletePhotoFile(photo.filename);
    await deletePhoto(id);

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Delete failed:", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
