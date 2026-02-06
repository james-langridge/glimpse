interface StorageBackend {
  ensureStorageDir(): Promise<void>;
  savePhoto(filename: string, data: Buffer): Promise<void>;
  deletePhotoFile(filename: string): Promise<void>;
  readPhoto(filename: string): Promise<Buffer>;
  statPhoto(filename: string): Promise<{ size: number; modified: Date }>;
}

const useBlob = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

let _backend: StorageBackend | null = null;
async function getBackend(): Promise<StorageBackend> {
  if (!_backend) {
    _backend = useBlob
      ? await import("@/src/lib/storage-blob")
      : await import("@/src/lib/storage-fs");
  }
  return _backend;
}

export async function ensureStorageDir(): Promise<void> {
  const backend = await getBackend();
  return backend.ensureStorageDir();
}

export async function savePhoto(
  filename: string,
  data: Buffer,
): Promise<void> {
  const backend = await getBackend();
  return backend.savePhoto(filename, data);
}

export async function deletePhotoFile(filename: string): Promise<void> {
  const backend = await getBackend();
  return backend.deletePhotoFile(filename);
}

export async function readPhoto(filename: string): Promise<Buffer> {
  const backend = await getBackend();
  return backend.readPhoto(filename);
}

export async function statPhoto(
  filename: string,
): Promise<{ size: number; modified: Date }> {
  const backend = await getBackend();
  return backend.statPhoto(filename);
}
