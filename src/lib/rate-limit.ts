import { NextRequest, NextResponse } from "next/server";

interface WindowEntry {
  timestamps: number[];
  windowMs: number;
}

const store = new Map<string, WindowEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanup = Date.now();

function cleanup(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    const cutoff = now - entry.windowMs;
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}

function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number,
): { limited: boolean; retryAfterMs: number } {
  cleanup();

  const now = Date.now();
  const cutoff = now - windowMs;
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { timestamps: [now], windowMs });
    return { limited: false, retryAfterMs: 0 };
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
  if (entry.timestamps.length >= maxRequests) {
    const oldest = entry.timestamps[0]!;
    const retryAfterMs = oldest + windowMs - now;
    return { limited: true, retryAfterMs };
  }

  entry.timestamps.push(now);
  return { limited: false, retryAfterMs: 0 };
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

  const { limited, retryAfterMs } = isRateLimited(key, maxRequests, windowMs);
  if (limited) {
    const retryAfterSeconds = Math.ceil(retryAfterMs / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSeconds) },
      },
    );
  }

  return null;
}
