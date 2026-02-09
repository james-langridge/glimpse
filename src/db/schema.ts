import { query } from "@/src/lib/db";

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      filename TEXT NOT NULL,
      original_name TEXT,
      width INTEGER,
      height INTEGER,
      aspect_ratio REAL DEFAULT 1.5,
      blur_data TEXT,
      file_size INTEGER,
      caption TEXT,
      content_hash TEXT,
      uploaded_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_content_hash ON photos(content_hash)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS share_links (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT,
      allow_downloads INTEGER DEFAULT 0,
      expires_at TEXT NOT NULL,
      revoked INTEGER DEFAULT 0,
      revoked_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS share_link_photos (
      share_link_id TEXT REFERENCES share_links(id) ON DELETE CASCADE,
      photo_id TEXT REFERENCES photos(id) ON DELETE CASCADE,
      display_order INTEGER DEFAULT 0,
      caption TEXT,
      PRIMARY KEY (share_link_id, photo_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS link_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      share_link_id TEXT REFERENCES share_links(id) ON DELETE CASCADE,
      viewed_at TEXT DEFAULT (datetime('now')),
      ip_hash TEXT,
      country TEXT,
      city TEXT,
      user_agent TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      referrer TEXT,
      session_duration_ms INTEGER
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS photo_downloads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      share_link_id TEXT REFERENCES share_links(id) ON DELETE SET NULL,
      photo_id TEXT REFERENCES photos(id) ON DELETE SET NULL,
      downloaded_at TEXT DEFAULT (datetime('now')),
      ip_hash TEXT,
      country TEXT,
      city TEXT,
      user_agent TEXT,
      device_type TEXT,
      browser TEXT,
      os TEXT,
      email TEXT,
      download_token_id TEXT
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_photo_downloads_link ON photo_downloads(share_link_id, downloaded_at DESC)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS download_tokens (
      id TEXT PRIMARY KEY,
      token TEXT UNIQUE NOT NULL,
      share_link_id TEXT REFERENCES share_links(id) ON DELETE CASCADE,
      photo_id TEXT REFERENCES photos(id) ON DELETE CASCADE,
      email TEXT NOT NULL,
      ip_hash TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      consumed_at TEXT
    )
  `);
}
