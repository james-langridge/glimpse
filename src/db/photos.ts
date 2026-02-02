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
  content_hash: string | null;
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
  content_hash: string | null;
}): Promise<boolean> {
  const result = await sql`
    INSERT INTO photos (id, filename, original_name, width, height, aspect_ratio, blur_data, file_size, content_hash)
    VALUES (${photo.id}, ${photo.filename}, ${photo.original_name}, ${photo.width}, ${photo.height}, ${photo.aspect_ratio}, ${photo.blur_data}, ${photo.file_size}, ${photo.content_hash})
    ON CONFLICT (content_hash) DO NOTHING
  `;
  return (result.rowCount ?? 0) > 0;
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

export async function getPhotoByHash(hash: string): Promise<Photo | null> {
  const result = await sql<Photo>`
    SELECT * FROM photos WHERE content_hash = ${hash}
  `;
  return result.rows[0] ?? null;
}

export async function deletePhoto(id: string) {
  await sql`DELETE FROM photos WHERE id = ${id}`;
}

export async function getPhotosForCleanup() {
  const days = parseInt(process.env.CLEANUP_DAYS ?? "30", 10);
  if (days <= 0 || isNaN(days)) return [];
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

export interface PhotoWithStats extends Photo {
  view_count: number;
  link_count: number;
  active_link_count: number;
}

export async function getAllPhotosWithStats() {
  const result = await sql<
    Photo & {
      view_count: string;
      link_count: string;
      active_link_count: string;
    }
  >`
    SELECT p.*,
      COUNT(DISTINCT lv.id)::text AS view_count,
      COUNT(DISTINCT slp.share_link_id)::text AS link_count,
      COUNT(DISTINCT CASE WHEN sl.revoked = FALSE AND sl.expires_at > NOW() THEN slp.share_link_id END)::text AS active_link_count
    FROM photos p
    LEFT JOIN share_link_photos slp ON slp.photo_id = p.id
    LEFT JOIN share_links sl ON sl.id = slp.share_link_id
    LEFT JOIN link_views lv ON lv.share_link_id = slp.share_link_id
    GROUP BY p.id
    ORDER BY p.uploaded_at DESC
  `;
  return result.rows.map((row) => ({
    ...row,
    view_count: parseInt(row.view_count, 10),
    link_count: parseInt(row.link_count, 10),
    active_link_count: parseInt(row.active_link_count, 10),
  }));
}

export async function getLinksForPhoto(photoId: string) {
  const result = await sql<{
    id: string;
    code: string;
    title: string | null;
    expires_at: Date;
    revoked: boolean;
    created_at: Date;
  }>`
    SELECT sl.id, sl.code, sl.title, sl.expires_at, sl.revoked, sl.created_at
    FROM share_links sl
    JOIN share_link_photos slp ON slp.share_link_id = sl.id
    WHERE slp.photo_id = ${photoId}
    ORDER BY sl.created_at DESC
  `;
  return result.rows;
}

export async function getViewCountForPhoto(photoId: string) {
  const result = await sql<{ total_views: string; unique_visitors: string }>`
    SELECT
      COUNT(lv.id)::text AS total_views,
      COUNT(DISTINCT lv.ip_hash)::text AS unique_visitors
    FROM link_views lv
    JOIN share_link_photos slp ON slp.share_link_id = lv.share_link_id
    WHERE slp.photo_id = ${photoId}
  `;
  return {
    total_views: parseInt(result.rows[0].total_views, 10),
    unique_visitors: parseInt(result.rows[0].unique_visitors, 10),
  };
}

export async function getPhotoCount() {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM photos
  `;
  return parseInt(result.rows[0].count, 10);
}
