import { sql } from "@/src/lib/db";

export interface Photo {
  id: string;
  filename: string;
  original_name: string | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number;
  blur_data: string | null;
  file_size: number | null;
  uploaded_at: Date;
}

export async function insertPhoto(photo: {
  id: string;
  filename: string;
  original_name: string | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number;
  blur_data: string | null;
  file_size: number | null;
}) {
  await sql`
    INSERT INTO photos (id, filename, original_name, width, height, aspect_ratio, blur_data, file_size)
    VALUES (${photo.id}, ${photo.filename}, ${photo.original_name}, ${photo.width}, ${photo.height}, ${photo.aspect_ratio}, ${photo.blur_data}, ${photo.file_size})
  `;
}

export async function getAllPhotos() {
  const result = await sql<Photo>`
    SELECT * FROM photos ORDER BY uploaded_at DESC
  `;
  return result.rows;
}

export async function getPhotoById(id: string) {
  const result = await sql<Photo>`
    SELECT * FROM photos WHERE id = ${id}
  `;
  return result.rows[0] ?? null;
}

export async function getPhotoByFilename(filename: string) {
  const result = await sql<Photo>`
    SELECT * FROM photos WHERE filename = ${filename}
  `;
  return result.rows[0] ?? null;
}

export async function deletePhoto(id: string) {
  await sql`DELETE FROM photos WHERE id = ${id}`;
}

export async function getPhotosForCleanup() {
  const days = parseInt(process.env.CLEANUP_DAYS || "30", 10) || 30;
  const result = await sql<Photo>`
    SELECT p.* FROM photos p
    WHERE p.uploaded_at <= NOW() - MAKE_INTERVAL(days => ${days})
    AND NOT EXISTS (
      SELECT 1 FROM share_link_photos slp
      JOIN share_links sl ON sl.id = slp.share_link_id
      WHERE slp.photo_id = p.id
      AND sl.revoked = FALSE
      AND sl.expires_at > NOW()
    )
  `;
  return result.rows;
}

export async function getPhotoCount() {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM photos
  `;
  return parseInt(result.rows[0].count, 10);
}
