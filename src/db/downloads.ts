import { query, sql } from "@/src/lib/db";

export async function insertDownload(download: {
  share_link_id: string;
  photo_id: string;
  ip_hash: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}): Promise<number> {
  const result = await sql<{ id: number }>`
    INSERT INTO photo_downloads (share_link_id, photo_id, ip_hash, country, city, user_agent, device_type, browser, os)
    VALUES (${download.share_link_id}, ${download.photo_id}, ${download.ip_hash}, ${download.country}, ${download.city}, ${download.user_agent}, ${download.device_type}, ${download.browser}, ${download.os})
    RETURNING id
  `;
  return result.rows[0].id;
}

export interface DownloadDetail {
  id: number;
  downloaded_at: string;
  photo_id: string;
  filename: string;
  original_name: string | null;
  share_link_id: string;
  code: string;
  title: string | null;
  ip_hash: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

export async function getDownloadById(
  id: number,
): Promise<DownloadDetail | null> {
  const result = await query<DownloadDetail>(
    `SELECT pd.id, pd.downloaded_at, pd.photo_id, p.filename, p.original_name,
            pd.share_link_id, sl.code, sl.title,
            pd.ip_hash, pd.country, pd.city, pd.device_type, pd.browser, pd.os
     FROM photo_downloads pd
     JOIN photos p ON p.id = pd.photo_id
     JOIN share_links sl ON sl.id = pd.share_link_id
     WHERE pd.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function getDownloadCountForLink(
  linkId: string,
  days?: number,
) {
  const conditions = ["share_link_id = $1"];
  const values: (string | number)[] = [linkId];
  if (days) {
    values.push(days);
    conditions.push(
      `downloaded_at >= NOW() - $${values.length} * INTERVAL '1 day'`,
    );
  }
  const result = await query<{
    total_downloads: string;
    unique_downloaders: string;
  }>(
    `SELECT
      COUNT(*) as total_downloads,
      COUNT(DISTINCT COALESCE(ip_hash, 'unknown')) as unique_downloaders
     FROM photo_downloads
     WHERE ${conditions.join(" AND ")}`,
    values,
  );
  const row = result.rows[0];
  return {
    total_downloads: parseInt(row.total_downloads, 10),
    unique_downloaders: parseInt(row.unique_downloaders, 10),
  };
}

export interface RecentDownload {
  id: number;
  downloaded_at: string;
  photo_id: string;
  filename: string;
  original_name: string | null;
  country: string | null;
  city: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
}

export async function getDownloadsForLink(
  linkId: string,
  limit: number = 20,
  days?: number,
) {
  const conditions = ["pd.share_link_id = $1"];
  const values: (string | number)[] = [linkId];
  if (days) {
    values.push(days);
    conditions.push(
      `pd.downloaded_at >= NOW() - $${values.length} * INTERVAL '1 day'`,
    );
  }
  values.push(limit);
  const result = await query<RecentDownload>(
    `SELECT pd.id, pd.downloaded_at, pd.photo_id, p.filename, p.original_name,
            pd.country, pd.city, pd.device_type, pd.browser, pd.os
     FROM photo_downloads pd
     JOIN photos p ON p.id = pd.photo_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY pd.downloaded_at DESC
     LIMIT $${values.length}`,
    values,
  );
  return result.rows;
}
