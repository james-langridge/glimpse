import { query, sql } from "@/src/lib/db";

export interface LinkView {
  id: number;
  share_link_id: string | null;
  viewed_at: Date;
  ip_hash: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
  session_duration_ms: number | null;
}

export async function insertView(view: {
  share_link_id: string;
  ip_hash: string | null;
  country: string | null;
  city: string | null;
  user_agent: string | null;
  device_type: string | null;
  browser: string | null;
  os: string | null;
  referrer: string | null;
}) {
  const result = await sql<{ id: number }>`
    INSERT INTO link_views (share_link_id, ip_hash, country, city, user_agent, device_type, browser, os, referrer)
    VALUES (${view.share_link_id}, ${view.ip_hash}, ${view.country}, ${view.city}, ${view.user_agent}, ${view.device_type}, ${view.browser}, ${view.os}, ${view.referrer})
    RETURNING id
  `;
  return result.rows[0].id;
}

export async function updateDuration(viewId: number, durationMs: number) {
  await sql`
    UPDATE link_views SET session_duration_ms = ${durationMs} WHERE id = ${viewId}
  `;
}

export async function getViewsForLink(linkId: string, days?: number) {
  const conditions = ["share_link_id = $1"];
  const values: (string | number)[] = [linkId];
  if (days) {
    values.push(days);
    conditions.push(`viewed_at >= NOW() - $${values.length} * INTERVAL '1 day'`);
  }
  const result = await query<LinkView>(
    `SELECT * FROM link_views WHERE ${conditions.join(" AND ")} ORDER BY viewed_at DESC`,
    values,
  );
  return result.rows;
}

function buildAnalyticsFilter(days: number, linkId?: string) {
  const conditions = [`viewed_at >= NOW() - $1 * INTERVAL '1 day'`];
  const values: (string | number)[] = [days];
  if (linkId) {
    values.push(linkId);
    conditions.push(`share_link_id = $${values.length}`);
  }
  return { where: conditions.join(" AND "), values };
}

export async function getViewsOverTime(days: number = 30, linkId?: string) {
  const { where, values } = buildAnalyticsFilter(days, linkId);
  const result = await query<{ date: string; views: string }>(
    `SELECT DATE(viewed_at) as date, COUNT(*) as views
     FROM link_views WHERE ${where}
     GROUP BY DATE(viewed_at) ORDER BY date ASC`,
    values,
  );
  return result.rows.map((r) => ({ date: r.date, views: parseInt(r.views, 10) }));
}

export async function getDeviceBreakdown(days: number = 30, linkId?: string) {
  const { where, values } = buildAnalyticsFilter(days, linkId);
  const result = await query<{ device_type: string; count: string }>(
    `SELECT COALESCE(device_type, 'unknown') as device_type, COUNT(*) as count
     FROM link_views WHERE ${where}
     GROUP BY device_type ORDER BY count DESC`,
    values,
  );
  return result.rows.map((r) => ({ device_type: r.device_type, count: parseInt(r.count, 10) }));
}

export async function getBrowserBreakdown(days: number = 30, linkId?: string) {
  const { where, values } = buildAnalyticsFilter(days, linkId);
  const result = await query<{ browser: string; count: string }>(
    `SELECT COALESCE(browser, 'unknown') as browser, COUNT(*) as count
     FROM link_views WHERE ${where}
     GROUP BY browser ORDER BY count DESC`,
    values,
  );
  return result.rows.map((r) => ({ browser: r.browser, count: parseInt(r.count, 10) }));
}

export async function getGeoBreakdown(days: number = 30, linkId?: string) {
  const { where, values } = buildAnalyticsFilter(days, linkId);
  const result = await query<{ country: string; city: string; count: string }>(
    `SELECT COALESCE(country, 'unknown') as country, COALESCE(city, 'unknown') as city, COUNT(*) as count
     FROM link_views WHERE ${where}
     GROUP BY country, city ORDER BY count DESC`,
    values,
  );
  return result.rows.map((r) => ({ country: r.country, city: r.city, count: parseInt(r.count, 10) }));
}

export async function getOverviewStats(
  days: number = 30,
  linkId?: string,
) {
  const { where, values } = buildAnalyticsFilter(days, linkId);
  const result = await query<{
    total_views: string;
    unique_visitors: string;
    avg_duration_ms: string;
  }>(
    `SELECT
      COUNT(*) as total_views,
      COUNT(DISTINCT ip_hash) as unique_visitors,
      COALESCE(AVG(session_duration_ms), 0) as avg_duration_ms
     FROM link_views
     WHERE ${where}`,
    values,
  );
  const row = result.rows[0] ?? {
    total_views: "0",
    unique_visitors: "0",
    avg_duration_ms: "0",
  };
  return {
    total_views: parseInt(row.total_views, 10),
    unique_visitors: parseInt(row.unique_visitors, 10),
    avg_duration_ms: parseFloat(row.avg_duration_ms),
  };
}

export async function getRecentViews(
  limit: number = 20,
  days?: number,
  linkId?: string,
) {
  const conditions: string[] = [];
  const values: (string | number)[] = [];
  if (days) {
    values.push(days);
    conditions.push(`lv.viewed_at >= NOW() - $${values.length} * INTERVAL '1 day'`);
  }
  if (linkId) {
    values.push(linkId);
    conditions.push(`lv.share_link_id = $${values.length}`);
  }
  values.push(limit);
  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const result = await query<
    Omit<LinkView, "share_link_id"> & { share_link_id: string; code: string }
  >(
    `SELECT lv.*, sl.code
     FROM link_views lv
     JOIN share_links sl ON sl.id = lv.share_link_id
     ${where}
     ORDER BY lv.viewed_at DESC
     LIMIT $${values.length}`,
    values,
  );
  return result.rows;
}

function buildPhotoAnalyticsFilter(photoId: string, days: number) {
  const values: (string | number)[] = [photoId, days];
  const where = `slp.photo_id = $1 AND lv.viewed_at >= NOW() - $2 * INTERVAL '1 day'`;
  const from = `link_views lv JOIN share_link_photos slp ON lv.share_link_id = slp.share_link_id`;
  return { from, where, values };
}

export async function getOverviewStatsForPhoto(
  photoId: string,
  days: number = 30,
) {
  const { from, where, values } = buildPhotoAnalyticsFilter(photoId, days);
  const result = await query<{
    total_views: string;
    unique_visitors: string;
    avg_duration_ms: string;
  }>(
    `SELECT
      COUNT(*) as total_views,
      COUNT(DISTINCT lv.ip_hash) as unique_visitors,
      COALESCE(AVG(lv.session_duration_ms), 0) as avg_duration_ms
     FROM ${from}
     WHERE ${where}`,
    values,
  );
  const row = result.rows[0] ?? {
    total_views: "0",
    unique_visitors: "0",
    avg_duration_ms: "0",
  };
  return {
    total_views: parseInt(row.total_views, 10),
    unique_visitors: parseInt(row.unique_visitors, 10),
    avg_duration_ms: parseFloat(row.avg_duration_ms),
  };
}

export async function getViewsOverTimeForPhoto(
  photoId: string,
  days: number = 30,
) {
  const { from, where, values } = buildPhotoAnalyticsFilter(photoId, days);
  const result = await query<{ date: string; views: string }>(
    `SELECT DATE(lv.viewed_at) as date, COUNT(*) as views
     FROM ${from} WHERE ${where}
     GROUP BY DATE(lv.viewed_at) ORDER BY date ASC`,
    values,
  );
  return result.rows.map((r) => ({ date: r.date, views: parseInt(r.views, 10) }));
}

export async function getDeviceBreakdownForPhoto(
  photoId: string,
  days: number = 30,
) {
  const { from, where, values } = buildPhotoAnalyticsFilter(photoId, days);
  const result = await query<{ device_type: string; count: string }>(
    `SELECT COALESCE(lv.device_type, 'unknown') as device_type, COUNT(*) as count
     FROM ${from} WHERE ${where}
     GROUP BY lv.device_type ORDER BY count DESC`,
    values,
  );
  return result.rows.map((r) => ({ device_type: r.device_type, count: parseInt(r.count, 10) }));
}

export async function getBrowserBreakdownForPhoto(
  photoId: string,
  days: number = 30,
) {
  const { from, where, values } = buildPhotoAnalyticsFilter(photoId, days);
  const result = await query<{ browser: string; count: string }>(
    `SELECT COALESCE(lv.browser, 'unknown') as browser, COUNT(*) as count
     FROM ${from} WHERE ${where}
     GROUP BY lv.browser ORDER BY count DESC`,
    values,
  );
  return result.rows.map((r) => ({ browser: r.browser, count: parseInt(r.count, 10) }));
}

export async function getGeoBreakdownForPhoto(
  photoId: string,
  days: number = 30,
) {
  const { from, where, values } = buildPhotoAnalyticsFilter(photoId, days);
  const result = await query<{ country: string; city: string; count: string }>(
    `SELECT COALESCE(lv.country, 'unknown') as country, COALESCE(lv.city, 'unknown') as city, COUNT(*) as count
     FROM ${from} WHERE ${where}
     GROUP BY lv.country, lv.city ORDER BY count DESC`,
    values,
  );
  return result.rows.map((r) => ({ country: r.country, city: r.city, count: parseInt(r.count, 10) }));
}

export async function getRecentViewsForPhoto(
  photoId: string,
  limit: number = 20,
  days?: number,
) {
  const conditions = ["slp.photo_id = $1"];
  const values: (string | number)[] = [photoId];
  if (days) {
    values.push(days);
    conditions.push(`lv.viewed_at >= NOW() - $${values.length} * INTERVAL '1 day'`);
  }
  values.push(limit);
  const where = conditions.join(" AND ");
  const result = await query<
    Omit<LinkView, "share_link_id"> & { share_link_id: string; code: string }
  >(
    `SELECT lv.*, sl.code
     FROM link_views lv
     JOIN share_link_photos slp ON lv.share_link_id = slp.share_link_id
     JOIN share_links sl ON sl.id = lv.share_link_id
     WHERE ${where}
     ORDER BY lv.viewed_at DESC
     LIMIT $${values.length}`,
    values,
  );
  return result.rows;
}

export async function getPerLinkStats(days: number = 30) {
  const result = await query<{
    share_link_id: string;
    code: string;
    title: string | null;
    revoked: boolean;
    expires_at: Date;
    views: string;
    unique_visitors: string;
  }>(
    `SELECT
      sl.id as share_link_id, sl.code, sl.title, sl.revoked, sl.expires_at,
      COUNT(lv.id) as views,
      COUNT(DISTINCT lv.ip_hash) as unique_visitors
     FROM share_links sl
     LEFT JOIN link_views lv ON lv.share_link_id = sl.id
       AND lv.viewed_at >= NOW() - $1 * INTERVAL '1 day'
     GROUP BY sl.id, sl.code, sl.title, sl.revoked, sl.expires_at
     ORDER BY sl.created_at DESC`,
    [days],
  );
  return result.rows.map((r) => ({
    ...r,
    views: parseInt(r.views, 10),
    unique_visitors: parseInt(r.unique_visitors, 10),
  }));
}
