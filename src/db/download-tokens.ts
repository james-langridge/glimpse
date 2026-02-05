import { randomBytes } from "node:crypto";
import { sql } from "@/src/lib/db";
import { generateId } from "@/src/lib/codes";

export async function createDownloadToken(params: {
  share_link_id: string;
  photo_id: string;
  email: string;
  ip_hash: string | null;
}): Promise<{ id: string; token: string }> {
  const id = generateId();
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await sql`
    INSERT INTO download_tokens (id, token, share_link_id, photo_id, email, ip_hash, expires_at)
    VALUES (${id}, ${token}, ${params.share_link_id}, ${params.photo_id}, ${params.email}, ${params.ip_hash}, ${expiresAt.toISOString()})
  `;

  return { id, token };
}

export interface DownloadToken {
  id: string;
  token: string;
  share_link_id: string;
  photo_id: string;
  email: string;
  ip_hash: string | null;
  created_at: string;
  expires_at: string;
  consumed_at: string | null;
  filename: string;
  original_name: string | null;
  code: string;
  link_revoked: boolean;
  link_expires_at: string;
  allow_downloads: boolean;
  download_id: number | null;
}

export async function getDownloadToken(
  token: string,
): Promise<DownloadToken | null> {
  // Invariant: each token has at most one photo_downloads record, enforced by
  // the atomic UPDATE...WHERE consumed_at IS NULL in the download-token route.
  // The LEFT JOIN returns one row; if multiple records somehow exist, the first
  // is returned (non-deterministic order, but this shouldn't happen in practice).
  const result = await sql<DownloadToken>`
    SELECT dt.*, p.filename, p.original_name,
           sl.code, sl.revoked AS link_revoked, sl.expires_at AS link_expires_at, sl.allow_downloads,
           pd.id AS download_id
    FROM download_tokens dt
    JOIN photos p ON p.id = dt.photo_id
    JOIN share_links sl ON sl.id = dt.share_link_id
    LEFT JOIN photo_downloads pd ON pd.download_token_id = dt.id
    WHERE dt.token = ${token}
  `;
  return result.rows[0] ?? null;
}
