import { put, head, del, list, BlobNotFoundError } from "@vercel/blob";

export async function ensureStorageDir(): Promise<void> {
  // No-op for blob storage
}

export async function savePhoto(
  filename: string,
  data: Buffer,
): Promise<void> {
  // Vercel Blob only supports public access. Blob URLs are not exposed to end
  // users (photos are served through API routes with share link validation),
  // but if someone discovered the direct URL they could bypass expiry/revocation.
  // Acceptable for temporary sharing with random 8-char filenames and 30-day cleanup.
  await put(filename, data, {
    access: "public",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
}

export async function deletePhotoFile(filename: string): Promise<void> {
  try {
    await del(filename);
  } catch (e) {
    if (e instanceof BlobNotFoundError) return;
    throw e;
  }
}

export async function readPhoto(filename: string): Promise<Buffer> {
  const blob = await head(filename);
  const response = await fetch(blob.url);
  if (!response.ok) {
    throw new Error(`Failed to fetch blob ${filename}: ${response.status}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

export async function listFiles(): Promise<string[]> {
  const filenames: string[] = [];
  let cursor: string | undefined;
  do {
    const result = await list({ cursor });
    for (const blob of result.blobs) {
      filenames.push(blob.pathname);
    }
    cursor = result.hasMore ? result.cursor : undefined;
  } while (cursor);
  return filenames;
}

export async function statPhoto(
  filename: string,
): Promise<{ size: number; modified: Date }> {
  try {
    const blob = await head(filename);
    return { size: blob.size, modified: blob.uploadedAt };
  } catch (e) {
    if (e instanceof BlobNotFoundError) {
      throw Object.assign(new Error(`Blob not found: ${filename}`), {
        code: "ENOENT",
      });
    }
    throw e;
  }
}
