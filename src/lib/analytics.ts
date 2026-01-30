import { createHash } from "crypto";
import geoip from "geoip-lite";
import { UAParser } from "ua-parser-js";

export function hashIP(ip: string): string {
  const salt = process.env.SESSION_SECRET || "";
  return createHash("sha256").update(salt + ip).digest("hex");
}

export function parseGeo(ip: string): {
  country: string | null;
  city: string | null;
} {
  const geo = geoip.lookup(ip);
  if (!geo) return { country: null, city: null };
  return {
    country: geo.country || null,
    city: geo.city || null,
  };
}

export function parseUserAgent(ua: string): {
  browser: string | null;
  os: string | null;
  device_type: string | null;
} {
  const parser = new UAParser(ua);
  const result = parser.getResult();
  return {
    browser: result.browser.name || null,
    os: result.os.name || null,
    device_type: result.device.type || "desktop",
  };
}
