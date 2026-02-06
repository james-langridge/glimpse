import { mkdir, writeFile, unlink, readFile, stat } from "fs/promises";
import { join } from "path";

const STORAGE_PATH = process.env.PHOTO_STORAGE_PATH ?? "/data/photos";

function photoPath(filename: string): string {
  return join(STORAGE_PATH, filename);
}

export async function ensureStorageDir(): Promise<void> {
  await mkdir(STORAGE_PATH, { recursive: true });
}

export async function savePhoto(
  filename: string,
  data: Buffer,
): Promise<void> {
  await ensureStorageDir();
  await writeFile(photoPath(filename), data);
}

export async function deletePhotoFile(filename: string): Promise<void> {
  try {
    await unlink(photoPath(filename));
  } catch (e: unknown) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e;
  }
}

export async function readPhoto(filename: string): Promise<Buffer> {
  return readFile(photoPath(filename));
}

export async function statPhoto(
  filename: string,
): Promise<{ size: number; modified: Date }> {
  const s = await stat(photoPath(filename));
  return { size: s.size, modified: s.mtime };
}
