import { query } from "@/src/lib/db";

export async function initializeDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS photos (
      id VARCHAR(8) PRIMARY KEY,
      filename VARCHAR(255) NOT NULL,
      original_name VARCHAR(255),
      width INTEGER,
      height INTEGER,
      aspect_ratio REAL DEFAULT 1.5,
      blur_data TEXT,
      file_size INTEGER,
      uploaded_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS share_links (
      id VARCHAR(8) PRIMARY KEY,
      code VARCHAR(6) UNIQUE NOT NULL,
      title VARCHAR(255),
      expires_at TIMESTAMPTZ NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      revoked_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    ALTER TABLE share_links ADD COLUMN IF NOT EXISTS title VARCHAR(255)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS share_link_photos (
      share_link_id VARCHAR(8) REFERENCES share_links(id) ON DELETE CASCADE,
      photo_id VARCHAR(8) REFERENCES photos(id) ON DELETE CASCADE,
      display_order INTEGER DEFAULT 0,
      PRIMARY KEY (share_link_id, photo_id)
    )
  `);

  await query(`
    ALTER TABLE photos ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64)
  `);

  await query(`
    DROP INDEX IF EXISTS idx_photos_content_hash
  `);

  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_photos_content_hash ON photos(content_hash)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS link_views (
      id SERIAL PRIMARY KEY,
      share_link_id VARCHAR(8) REFERENCES share_links(id) ON DELETE CASCADE,
      viewed_at TIMESTAMPTZ DEFAULT NOW(),
      ip_hash VARCHAR(64),
      country VARCHAR(100),
      city VARCHAR(255),
      user_agent TEXT,
      device_type VARCHAR(20),
      browser VARCHAR(100),
      os VARCHAR(100),
      referrer TEXT,
      session_duration_ms INTEGER
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    ALTER TABLE share_links ADD COLUMN IF NOT EXISTS allow_downloads BOOLEAN DEFAULT FALSE
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS photo_downloads (
      id SERIAL PRIMARY KEY,
      share_link_id VARCHAR(8) REFERENCES share_links(id) ON DELETE CASCADE,
      photo_id VARCHAR(8) REFERENCES photos(id) ON DELETE CASCADE,
      downloaded_at TIMESTAMPTZ DEFAULT NOW(),
      ip_hash VARCHAR(64),
      country VARCHAR(100),
      city VARCHAR(255),
      user_agent TEXT,
      device_type VARCHAR(20),
      browser VARCHAR(100),
      os VARCHAR(100)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_photo_downloads_link ON photo_downloads(share_link_id, downloaded_at DESC)
  `);

  await query(`
    ALTER TABLE photos ADD COLUMN IF NOT EXISTS caption VARCHAR(500)
  `);

  await query(`
    ALTER TABLE share_link_photos ADD COLUMN IF NOT EXISTS caption VARCHAR(500)
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS download_tokens (
      id VARCHAR(8) PRIMARY KEY,
      token VARCHAR(64) UNIQUE NOT NULL,
      share_link_id VARCHAR(8) REFERENCES share_links(id) ON DELETE CASCADE,
      photo_id VARCHAR(8) REFERENCES photos(id) ON DELETE CASCADE,
      email VARCHAR(255) NOT NULL,
      ip_hash VARCHAR(64),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      consumed_at TIMESTAMPTZ
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_download_tokens_token ON download_tokens(token)
  `);

  await query(`
    ALTER TABLE photo_downloads ADD COLUMN IF NOT EXISTS email VARCHAR(255)
  `);

  await query(`
    ALTER TABLE photo_downloads ADD COLUMN IF NOT EXISTS download_token_id VARCHAR(8)
  `);
}
