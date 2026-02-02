import { getSetting } from "@/src/db/settings";

type ConfigKey = "CLEANUP_DAYS" | "DISPLAY_TIMEZONE" | "SITE_URL";

const DEFAULTS: Record<ConfigKey, string> = {
  CLEANUP_DAYS: "30",
  DISPLAY_TIMEZONE: "",
  SITE_URL: "",
};

export async function getConfig(key: ConfigKey): Promise<string> {
  const dbValue = await getSetting(key);
  if (dbValue !== null) return dbValue;

  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== "") return envValue;

  return DEFAULTS[key];
}

export type ConfigSource = "db" | "env" | "default";

export async function getConfigWithSource(
  key: ConfigKey,
): Promise<{ value: string; source: ConfigSource }> {
  const dbValue = await getSetting(key);
  if (dbValue !== null) return { value: dbValue, source: "db" };

  const envValue = process.env[key];
  if (envValue !== undefined && envValue !== "")
    return { value: envValue, source: "env" };

  return { value: DEFAULTS[key], source: "default" };
}
