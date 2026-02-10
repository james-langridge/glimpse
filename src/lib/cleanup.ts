import { getPhotosForCleanup, deletePhoto, getAllFilenames } from "@/src/db/photos";
import { setSetting } from "@/src/db/settings";
import { getConfig } from "@/src/lib/config";
import { deletePhotoFile, listFiles } from "@/src/lib/storage";
import { query } from "@/src/lib/db";

interface CleanupResult {
  deleted: string[];
  orphansRemoved: number;
  errors: { id: string; filename: string; error: string }[];
}

export async function runCleanup(): Promise<CleanupResult> {
  const cleanupDays = parseInt(await getConfig("CLEANUP_DAYS"), 10);
  if (cleanupDays === 0) {
    return { deleted: [], orphansRemoved: 0, errors: [] };
  }

  const photos = await getPhotosForCleanup();
  const deleted: string[] = [];
  const errors: CleanupResult["errors"] = [];

  for (const photo of photos) {
    try {
      await deletePhoto(photo.id);
      try {
        await deletePhotoFile(photo.filename);
      } catch (fileErr) {
        console.error(
          `Orphaned file ${photo.filename} (DB record deleted):`,
          fileErr,
        );
      }
      deleted.push(photo.id);
    } catch (e) {
      errors.push({
        id: photo.id,
        filename: photo.filename,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const orphansRemoved = await sweepOrphanedFiles();

  try {
    await query(
      `DELETE FROM download_tokens WHERE expires_at < NOW() - INTERVAL '7 days'`,
    );
  } catch (e) {
    console.error("Failed to clean up expired download tokens:", e);
  }

  try {
    await setSetting("LAST_CLEANUP_AT", new Date().toISOString());
    await setSetting("LAST_CLEANUP_DELETED", String(deleted.length));
    await setSetting("LAST_CLEANUP_ERRORS", String(errors.length));
  } catch (e) {
    console.error("Failed to record cleanup stats:", e);
  }

  return { deleted, orphansRemoved, errors };
}

async function sweepOrphanedFiles(): Promise<number> {
  try {
    const [storageFiles, dbFilenames] = await Promise.all([
      listFiles(),
      getAllFilenames(),
    ]);

    let removed = 0;
    for (const file of storageFiles) {
      if (!dbFilenames.has(file)) {
        try {
          await deletePhotoFile(file);
          removed++;
        } catch (e) {
          console.error(`Failed to remove orphaned file ${file}:`, e);
        }
      }
    }

    if (removed > 0) {
      console.log(`Swept ${removed} orphaned file(s) from storage`);
    }
    return removed;
  } catch (e) {
    console.error("Orphan file sweep failed:", e);
    return 0;
  }
}
