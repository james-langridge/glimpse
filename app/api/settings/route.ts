import { NextRequest, NextResponse } from "next/server";
import { getAllSettings, setSetting, deleteSetting } from "@/src/db/settings";

const VALID_KEYS = ["CLEANUP_DAYS", "DISPLAY_TIMEZONE", "SITE_URL"] as const;
type SettingKey = (typeof VALID_KEYS)[number];

const DEFAULTS: Record<SettingKey, string> = {
  CLEANUP_DAYS: "30",
  DISPLAY_TIMEZONE: "",
  SITE_URL: "",
};

function isValidKey(key: string): key is SettingKey {
  return (VALID_KEYS as readonly string[]).includes(key);
}

function validate(
  key: SettingKey,
  value: string,
): { valid: true } | { valid: false; error: string } {
  switch (key) {
    case "CLEANUP_DAYS": {
      const n = Number(value);
      if (!Number.isInteger(n) || n < 0) {
        return { valid: false, error: "Must be a non-negative integer" };
      }
      return { valid: true };
    }
    case "DISPLAY_TIMEZONE": {
      try {
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid IANA timezone" };
      }
    }
    case "SITE_URL": {
      try {
        new URL(value);
        return { valid: true };
      } catch {
        return { valid: false, error: "Invalid URL" };
      }
    }
  }
}

export async function GET() {
  try {
    const dbSettings = await getAllSettings();

    const settings = VALID_KEYS.map((key) => ({
      key,
      dbValue: dbSettings[key] ?? null,
      envValue: process.env[key] ?? null,
      default: DEFAULTS[key],
    }));

    return NextResponse.json(settings);
  } catch (e) {
    console.error("Failed to fetch settings:", e);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { key, value } = body;

    if (typeof key !== "string" || !isValidKey(key)) {
      return NextResponse.json({ error: "Invalid setting key" }, { status: 400 });
    }

    const trimmed = typeof value === "string" ? value.trim() : "";

    if (trimmed === "") {
      await deleteSetting(key);
      return NextResponse.json({ success: true, action: "reset" });
    }

    const result = validate(key, trimmed);
    if (!result.valid) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    await setSetting(key, trimmed);
    return NextResponse.json({ success: true, action: "saved" });
  } catch (e) {
    console.error("Failed to update setting:", e);
    return NextResponse.json(
      { error: "Failed to update setting" },
      { status: 500 },
    );
  }
}
