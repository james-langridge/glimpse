import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getLinkByCode, getLinkStatus } from "@/src/db/links";
import { getPhotosForCode } from "@/src/db/links";
import { insertView } from "@/src/db/analytics";
import { hashIP, isBot, parseGeo, parseUserAgent } from "@/src/lib/analytics";
import { getConfig } from "@/src/lib/config";
import { getSession } from "@/src/lib/auth";
import Link from "next/link";
import ShareGallery from "@/src/components/ShareGallery";
import DurationTracker from "@/src/components/DurationTracker";
import Footer from "@/src/components/Footer";
import ExpiryCountdown from "@/src/components/ExpiryCountdown";

interface Props {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Guard against matching admin/login routes
const RESERVED_PATHS = new Set(["admin", "login", "api", "_next"]);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code } = await params;

  if (RESERVED_PATHS.has(code.toLowerCase())) return {};

  const link = await getLinkByCode(code);
  if (!link || getLinkStatus(link) !== "active") return {};

  const photos = await getPhotosForCode(code);
  if (photos.length === 0) return {};

  const displayTimezone = await getConfig("DISPLAY_TIMEZONE");
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
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
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

export default async function SharePage({ params, searchParams }: Props) {
  const { code } = await params;

  if (RESERVED_PATHS.has(code.toLowerCase())) {
    notFound();
  }

  const link = await getLinkByCode(code);

  if (!link) {
    notFound();
  }

  const status = getLinkStatus(link);

  if (status !== "active") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <Link
            href="/"
            className="text-sm font-medium tracking-[0.3em] text-zinc-400 transition-colors hover:text-zinc-300"
          >
            GLIMPSE
          </Link>
          <p className="text-zinc-400">
            {status === "expired"
              ? "This link has expired"
              : "This link is no longer available"}
          </p>
          <p className="text-sm text-zinc-500">
            Contact the person who shared this link to request a new one.
          </p>
        </div>
      </div>
    );
  }

  const { preview } = await searchParams;
  let isPreview = false;
  if (preview === "true") {
    const session = await getSession();
    isPreview = session.isLoggedIn === true;
  }

  const [photos, viewId] = await Promise.all([
    getPhotosForCode(code),
    isPreview ? Promise.resolve(null) : recordView(link.id),
  ]);

  if (photos.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4 text-center">
          <Link
            href="/"
            className="text-sm font-medium tracking-[0.3em] text-zinc-400 transition-colors hover:text-zinc-300"
          >
            GLIMPSE
          </Link>
          <p className="text-zinc-400">No photos found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {isPreview && (
        <div className="bg-amber-600/20 px-4 py-2 text-center text-sm text-amber-400">
          Preview mode — analytics are not being recorded
        </div>
      )}
      <div className="px-4 pt-8 text-center">
        <Link
          href="/"
          className="text-sm font-medium tracking-[0.3em] text-zinc-400 transition-colors hover:text-zinc-300"
        >
          GLIMPSE
        </Link>
      </div>
      {link.title && (
        <h1 className="px-4 pt-4 text-center text-2xl font-light tracking-widest text-white">
          {link.title}
        </h1>
      )}
      <ExpiryCountdown expiresAt={new Date(link.expires_at).toISOString()} />
      {photos.length > 1 && (
        <p className="px-4 pt-2 text-center text-sm text-zinc-500">
          {photos.length} photos
        </p>
      )}
      <ShareGallery photos={photos} code={code} allowDownloads={link.allow_downloads} />
      <Footer />
      {viewId !== null && <DurationTracker viewId={viewId} />}
    </div>
  );
}
