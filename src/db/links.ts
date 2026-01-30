import { sql, query } from "@/src/lib/db";
import { Photo } from "./photos";

export interface ShareLink {
  id: string;
  code: string;
  expires_at: Date;
  revoked: boolean;
  revoked_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export type LinkStatus = "active" | "expired" | "revoked";

export function getLinkStatus(link: ShareLink): LinkStatus {
  if (link.revoked) return "revoked";
  if (new Date(link.expires_at) < new Date()) return "expired";
  return "active";
}

export async function insertLink(link: {
  id: string;
  code: string;
  expires_at: Date;
}) {
  await sql`
    INSERT INTO share_links (id, code, expires_at)
    VALUES (${link.id}, ${link.code}, ${link.expires_at.toISOString()})
  `;
}

export async function getAllLinks(statusFilter?: LinkStatus) {
  const result = await sql<ShareLink>`
    SELECT * FROM share_links ORDER BY created_at DESC
  `;
  if (!statusFilter) return result.rows;
  return result.rows.filter((link) => getLinkStatus(link) === statusFilter);
}

export async function getLinkById(id: string) {
  const result = await sql<ShareLink>`
    SELECT * FROM share_links WHERE id = ${id}
  `;
  return result.rows[0] ?? null;
}

export async function getLinkByCode(code: string) {
  const result = await sql<ShareLink>`
    SELECT * FROM share_links WHERE code = ${code}
  `;
  return result.rows[0] ?? null;
}

export async function updateLink(
  id: string,
  updates: { expires_at?: Date },
) {
  if (updates.expires_at) {
    await sql`
      UPDATE share_links
      SET expires_at = ${updates.expires_at.toISOString()}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }
}

export async function revokeLink(id: string) {
  await sql`
    UPDATE share_links
    SET revoked = TRUE, revoked_at = NOW(), updated_at = NOW()
    WHERE id = ${id}
  `;
}

export async function deleteLink(id: string) {
  await sql`DELETE FROM share_links WHERE id = ${id}`;
}

export async function insertLinkPhotos(
  linkId: string,
  photoIds: string[],
) {
  for (let i = 0; i < photoIds.length; i++) {
    await sql`
      INSERT INTO share_link_photos (share_link_id, photo_id, display_order)
      VALUES (${linkId}, ${photoIds[i]}, ${i})
    `;
  }
}

export async function updateLinkPhotos(
  linkId: string,
  photoIds: string[],
) {
  await sql`DELETE FROM share_link_photos WHERE share_link_id = ${linkId}`;
  await insertLinkPhotos(linkId, photoIds);
}

export async function getPhotosForLink(linkId: string) {
  const result = await sql<Photo>`
    SELECT p.* FROM photos p
    JOIN share_link_photos slp ON slp.photo_id = p.id
    WHERE slp.share_link_id = ${linkId}
    ORDER BY slp.display_order ASC
  `;
  return result.rows;
}

export async function getPhotosForCode(code: string) {
  const result = await sql<Photo>`
    SELECT p.* FROM photos p
    JOIN share_link_photos slp ON slp.photo_id = p.id
    JOIN share_links sl ON sl.id = slp.share_link_id
    WHERE sl.code = ${code}
    ORDER BY slp.display_order ASC
  `;
  return result.rows;
}

export async function getLinkCounts() {
  const result = await query<{ status: string; count: string }>(`
    SELECT
      CASE
        WHEN revoked = TRUE THEN 'revoked'
        WHEN expires_at < NOW() THEN 'expired'
        ELSE 'active'
      END as status,
      COUNT(*) as count
    FROM share_links
    GROUP BY status
  `);
  const counts = { active: 0, expired: 0, revoked: 0 };
  for (const row of result.rows) {
    counts[row.status as LinkStatus] = parseInt(row.count, 10);
  }
  return counts;
}

export async function isCodeUnique(code: string) {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM share_links WHERE code = ${code}
  `;
  return parseInt(result.rows[0].count, 10) === 0;
}
