import ProtectedImage from "./ProtectedImage";

interface Photo {
  filename: string;
  width: number | null;
  height: number | null;
  aspect_ratio: number;
  blur_data: string | null;
}

interface ShareGalleryProps {
  photos: Photo[];
  code: string;
  allowDownloads?: boolean;
}

function DownloadButton({
  code,
  filename,
  size = "sm",
}: {
  code: string;
  filename: string;
  size?: "sm" | "lg";
}) {
  const sizeClass = size === "lg" ? "h-10 w-10" : "h-8 w-8";
  return (
    <a
      href={`/api/download/${code}/${filename}`}
      download
      className={`absolute right-2 bottom-2 z-10 flex ${sizeClass} items-center justify-center rounded-full bg-black/60 text-white transition hover:bg-black/80`}
      onClick={(e) => e.stopPropagation()}
      aria-label="Download photo"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={size === "lg" ? "h-5 w-5" : "h-4 w-4"}
      >
        <path d="M10 3a.75.75 0 01.75.75v7.69l2.22-2.22a.75.75 0 011.06 1.06l-3.5 3.5a.75.75 0 01-1.06 0l-3.5-3.5a.75.75 0 011.06-1.06l2.22 2.22V3.75A.75.75 0 0110 3z" />
        <path d="M3 15.75a.75.75 0 01.75-.75h12.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" />
      </svg>
    </a>
  );
}

export default function ShareGallery({ photos, code, allowDownloads }: ShareGalleryProps) {
  if (photos.length === 0) return null;

  // Single photo: centered large
  if (photos.length === 1) {
    const photo = photos[0];
    return (
      <div className="flex items-center justify-center p-4">
        <div className="relative max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg">
          <ProtectedImage
            src={`/api/shared-image/${code}/${photo.filename}`}
            alt=""
            width={photo.width ?? 1600}
            height={photo.height ?? 1200}
            className="max-h-[85vh]"
            loading="eager"
            blurDataURL={photo.blur_data}
          />
          {allowDownloads && (
            <DownloadButton code={code} filename={photo.filename} size="lg" />
          )}
        </div>
      </div>
    );
  }

  // Multiple photos: responsive grid
  return (
    <div className="grid grid-cols-1 gap-2 p-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo, i) => (
        <div
          key={photo.filename}
          className="animate-fade-in-up overflow-hidden rounded-lg"
          style={{ animationDelay: `${i * 75}ms`, animationFillMode: "both" }}
        >
          <div
            className="relative"
            style={{
              paddingBottom: `${(1 / photo.aspect_ratio) * 100}%`,
            }}
          >
            <div className="absolute inset-0">
              <ProtectedImage
                src={`/api/shared-image/${code}/${photo.filename}`}
                alt=""
                width={photo.width ?? 1600}
                height={photo.height ?? 1200}
                className="h-full w-full"
                blurDataURL={photo.blur_data}
              />
              {allowDownloads && (
                <DownloadButton code={code} filename={photo.filename} />
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
