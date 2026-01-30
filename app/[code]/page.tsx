import { notFound } from "next/navigation";
import { getLinkByCode, getLinkStatus } from "@/src/db/links";
import { getPhotosForCode } from "@/src/db/links";
import ShareGallery from "@/src/components/ShareGallery";

interface Props {
  params: Promise<{ code: string }>;
}

// Guard against matching admin/login routes
const RESERVED_PATHS = new Set(["admin", "login", "api", "_next"]);

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

  const photos = await getPhotosForCode(upperCode);

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
      <ShareGallery photos={photos} code={upperCode} />
    </div>
  );
}
