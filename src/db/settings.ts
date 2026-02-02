import { sql } from "@/src/lib/db";

export async function getSetting(key: string): Promise<string | null> {
  const result = await sql<{ value: string }>`
    SELECT value FROM settings WHERE key = ${key}
  `;
  return result.rows[0]?.value ?? null;
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const result = await sql<{ key: string; value: string }>`
    SELECT key, value FROM settings
  `;
  const settings: Record<string, string> = {};
  for (const row of result.rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await sql`
    INSERT INTO settings (key, value, updated_at)
    VALUES (${key}, ${value}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${value}, updated_at = NOW()
  `;
}

export async function deleteSetting(key: string): Promise<void> {
  await sql`DELETE FROM settings WHERE key = ${key}`;
}
