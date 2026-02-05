import ProtectedImage from "./ProtectedImage";
import DownloadButton from "./DownloadButton";

interface Photo {
  filename: string;
  width: number | null;
  height: number | null;
  aspect_ratio: number;
  blur_data: string | null;
  resolved_caption: string | null;
}

interface ShareGalleryProps {
  photos: Photo[];
  code: string;
  allowDownloads?: boolean;
}

export default function ShareGallery({ photos, code, allowDownloads }: ShareGalleryProps) {
  if (photos.length === 0) return null;

  // Single photo: centered large
  if (photos.length === 1) {
    const photo = photos[0];
    return (
      <div className="flex flex-col items-center justify-center p-4">
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
        {photo.resolved_caption && (
          <p className="mt-3 text-center text-sm text-zinc-400">
            {photo.resolved_caption}
          </p>
        )}
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
              {photo.resolved_caption && (
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-3 pb-2.5 pt-6">
                  <p className="text-sm text-white/90">
                    {photo.resolved_caption}
                  </p>
                </div>
              )}
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
