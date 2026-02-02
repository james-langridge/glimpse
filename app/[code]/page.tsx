import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getLinkByCode, getLinkStatus } from "@/src/db/links";
import { getPhotosForCode } from "@/src/db/links";
import { insertView } from "@/src/db/analytics";
import { hashIP, isBot, parseGeo, parseUserAgent } from "@/src/lib/analytics";
import { getConfig } from "@/src/lib/config";
import ShareGallery from "@/src/components/ShareGallery";
import DurationTracker from "@/src/components/DurationTracker";
import Footer from "@/src/components/Footer";
import ExpiryCountdown from "@/src/components/ExpiryCountdown";

interface Props {
  params: Promise<{ code: string }>;
}

// Guard against matching admin/login routes
const RESERVED_PATHS = new Set(["admin", "login", "api", "_next"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  if (RESERVED_PATHS.has(code.toLowerCase())) return {};

  const link = await getLinkByCode(upperCode);
  if (!link || getLinkStatus(link) !== "active") return {};

  const photos = await getPhotosForCode(upperCode);
  if (photos.length === 0) return {};

  const [siteUrl, displayTimezone] = await Promise.all([
    getConfig("SITE_URL"),
    getConfig("DISPLAY_TIMEZONE"),
  ]);
  const imageUrl = `${siteUrl}/og-image.jpg`;
  const photoCount = photos.length;
  const title =
    link.title || (photoCount === 1 ? "1 photo" : `${photoCount} photos`);
  const expiresAt = new Date(link.expires_at);
  const description = `Link expires ${expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short", ...(displayTimezone && { timeZone: displayTimezone }) })}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: imageUrl, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

async function recordView(linkId: string): Promise<number | null> {
  if (process.env.NODE_ENV === "development") return null;

  try {
    const headersList = await headers();
    const forwarded = headersList.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : null;
    const userAgent = headersList.get("user-agent") || "";
    if (isBot(userAgent)) return null;
    const referrer = headersList.get("referer") || null;

    const ipHash = ip ? hashIP(ip) : null;
    const geo = ip ? parseGeo(ip) : { country: null, city: null };
    const ua = parseUserAgent(userAgent);

    return await insertView({
      share_link_id: linkId,
      ip_hash: ipHash,
      country: geo.country,
      city: geo.city,
      user_agent: userAgent || null,
      device_type: ua.device_type,
      browser: ua.browser,
      os: ua.os,
      referrer,
    });
  } catch (err) {
    console.error("Failed to record view:", err);
    return null;
  }
}

export default async function SharePage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();

  if (RESERVED_PATHS.has(code.toLowerCase())) {
    notFound();
  }

  const link = await getLinkByCode(upperCode);

  if (!link) {
    notFound();
  }

  const status = getLinkStatus(link);

  if (status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-light tracking-widest text-white">
            GLIMPSE
          </h1>
          <p className="text-zinc-400">
            {status === "expired"
              ? "This link has expired"
              : "This link is no longer available"}
          </p>
          <a
            href="/"
            className="mt-4 text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Enter a different code
          </a>
        </div>
      </div>
    );
  }

  const [photos, viewId] = await Promise.all([
    getPhotosForCode(upperCode),
    recordView(link.id),
  ]);

  if (photos.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <h1 className="text-2xl font-light tracking-widest text-white">
            GLIMPSE
          </h1>
          <p className="text-zinc-400">No photos found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {link.title && (
        <h1 className="px-4 pt-8 text-center text-2xl font-light tracking-widest text-white">
          {link.title}
        </h1>
      )}
      <ExpiryCountdown expiresAt={new Date(link.expires_at).toISOString()} />
      <ShareGallery photos={photos} code={upperCode} />
      <Footer />
      {viewId !== null && <DurationTracker viewId={viewId} />}
    </div>
  );
}
