import { NextRequest, NextResponse } from "next/server";

interface WindowEntry {
  timestamps: number[];
}

const store = new Map<string, WindowEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  const cutoff = now - windowMs;
  for (const [key, entry] of store) {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  cleanup(windowMs);

  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { timestamps: [now] });
    return false;
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  if (entry.timestamps.length >= maxRequests) {
    return true;
  }

  entry.timestamps.push(now);
  return false;
}

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return "unknown";
}

export function checkRateLimit(
  request: NextRequest,
  endpoint: string,
  maxRequests: number,
  windowMs: number,
): NextResponse | null {
  const ip = getClientIP(request);
  const key = `${endpoint}:${ip}`;

  if (isRateLimited(key, maxRequests, windowMs)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  return null;
}
