import { getPhotosForCleanup, deletePhoto } from "@/src/db/photos";
import { setSetting } from "@/src/db/settings";
import { getConfig } from "@/src/lib/config";
import { deletePhotoFile } from "@/src/lib/storage";

interface CleanupResult {
  deleted: string[];
  errors: { id: string; filename: string; error: string }[];
}

export async function runCleanup(): Promise<CleanupResult> {
  const cleanupDays = parseInt(await getConfig("CLEANUP_DAYS"), 10);
  if (cleanupDays === 0) {
    return { deleted: [], errors: [] };
  }

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

  try {
    await setSetting("LAST_CLEANUP_AT", new Date().toISOString());
  } catch (e) {
    console.error("Failed to record cleanup timestamp:", e);
  }

  return { deleted, errors };
}
