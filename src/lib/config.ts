import { getAllSettings } from "@/src/db/settings";

export const VALID_KEYS = [
  "CLEANUP_DAYS",
  "DISPLAY_TIMEZONE",
  "SITE_URL",
] as const;

export type ConfigKey = (typeof VALID_KEYS)[number];

export const DEFAULTS: Record<ConfigKey, string> = {
  CLEANUP_DAYS: "30",
  DISPLAY_TIMEZONE: "",
  SITE_URL: "",
};

export function isValidKey(key: string): key is ConfigKey {
  return (VALID_KEYS as readonly string[]).includes(key);
}

let cache: { data: Record<string, string>; ts: number } | null = null;
const TTL = 60_000;

async function getCachedSettings(): Promise<Record<string, string>> {
  if (cache && Date.now() - cache.ts < TTL) return cache.data;
  const data = await getAllSettings();
  cache = { data, ts: Date.now() };
  return data;
}

export async function getConfig(key: ConfigKey): Promise<string> {
  const settings = await getCachedSettings();
  const dbValue = settings[key];
  if (dbValue !== undefined) return dbValue;

  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== "") return envValue;

  return DEFAULTS[key];
}
