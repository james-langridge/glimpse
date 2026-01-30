import { getPhotosForCleanup, deletePhoto } from "@/src/db/photos";
import { deletePhotoFile } from "@/src/lib/storage";

interface CleanupResult {
  deleted: string[];
  errors: { id: string; filename: string; error: string }[];
}

export async function runCleanup(): Promise<CleanupResult> {
  const photos = await getPhotosForCleanup();
  const deleted: string[] = [];
  const errors: CleanupResult["errors"] = [];

  for (const photo of photos) {
    try {
      await deletePhotoFile(photo.filename);
      await deletePhoto(photo.id);
      deleted.push(photo.id);
    } catch (e) {
      errors.push({
        id: photo.id,
        filename: photo.filename,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return { deleted, errors };
}
