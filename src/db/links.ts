import { sql, query, withTransaction } from "@/src/lib/db";
import { Photo } from "./photos";

export interface ShareLink {
  id: string;
  code: string;
  title: string | null;
  allow_downloads: boolean;
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
  updates: { expires_at?: Date; title?: string | null; allow_downloads?: boolean },
) {
  if (updates.expires_at) {
    await sql`
      UPDATE share_links
      SET expires_at = ${updates.expires_at.toISOString()}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }
  if (updates.title !== undefined) {
    await sql`
      UPDATE share_links
      SET title = ${updates.title}, updated_at = NOW()
      WHERE id = ${id}
    `;
  }
  if (updates.allow_downloads !== undefined) {
    await sql`
      UPDATE share_links
      SET allow_downloads = ${updates.allow_downloads}, updated_at = NOW()
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
  await withTransaction(async (client) => {
    for (let i = 0; i < photoIds.length; i++) {
      await client.query(
        "INSERT INTO share_link_photos (share_link_id, photo_id, display_order) VALUES ($1, $2, $3)",
        [linkId, photoIds[i], i],
      );
    }
  });
}

export async function updateLinkPhotos(
  linkId: string,
  photoIds: string[],
) {
  await withTransaction(async (client) => {
    const existing = await client.query<{
      photo_id: string;
      caption: string | null;
    }>(
      "SELECT photo_id, caption FROM share_link_photos WHERE share_link_id = $1",
      [linkId],
    );
    const captionMap = new Map(
      existing.rows.map((r) => [r.photo_id, r.caption]),
    );

    await client.query(
      "DELETE FROM share_link_photos WHERE share_link_id = $1",
      [linkId],
    );
    for (let i = 0; i < photoIds.length; i++) {
      const caption = captionMap.get(photoIds[i]) ?? null;
      await client.query(
        "INSERT INTO share_link_photos (share_link_id, photo_id, display_order, caption) VALUES ($1, $2, $3, $4)",
        [linkId, photoIds[i], i, caption],
      );
    }
  });
}

export async function getPhotosForLink(linkId: string) {
  const result = await sql<Photo & { link_caption: string | null }>`
    SELECT p.*, slp.caption AS link_caption FROM photos p
    JOIN share_link_photos slp ON slp.photo_id = p.id
    WHERE slp.share_link_id = ${linkId}
    ORDER BY slp.display_order ASC
  `;
  return result.rows;
}

export async function getPhotosForCode(code: string) {
  const result = await sql<Photo & { resolved_caption: string | null }>`
    SELECT p.*, COALESCE(slp.caption, p.caption) AS resolved_caption FROM photos p
    JOIN share_link_photos slp ON slp.photo_id = p.id
    JOIN share_links sl ON sl.id = slp.share_link_id
    WHERE sl.code = ${code}
    ORDER BY slp.display_order ASC
  `;
  return result.rows;
}

export async function updateLinkPhotoCaption(
  linkId: string,
  photoId: string,
  caption: string | null,
) {
  const result = await sql`
    UPDATE share_link_photos
    SET caption = ${caption}
    WHERE share_link_id = ${linkId} AND photo_id = ${photoId}
  `;
  return (result.rowCount ?? 0) > 0;
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

export async function getActiveLinksForPhoto(photoId: string) {
  const result = await sql<ShareLink>`
    SELECT sl.* FROM share_links sl
    JOIN share_link_photos slp ON slp.share_link_id = sl.id
    WHERE slp.photo_id = ${photoId}
    AND sl.revoked = FALSE
    AND sl.expires_at > NOW()
  `;
  return result.rows;
}

export async function isCodeUnique(code: string) {
  const result = await sql<{ count: string }>`
    SELECT COUNT(*) as count FROM share_links WHERE code = ${code}
  `;
  return parseInt(result.rows[0].count, 10) === 0;
}
