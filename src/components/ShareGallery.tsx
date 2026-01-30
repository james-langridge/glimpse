"use client";

import { useState } from "react";
import ProtectedImage from "./ProtectedImage";
import Lightbox from "./Lightbox";

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
}

export default function ShareGallery({ photos, code }: ShareGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  // Single photo: centered large
  if (photos.length === 1) {
    const photo = photos[0];
    return (
      <>
        <div className="flex items-center justify-center p-4">
          <div className="max-h-[85vh] max-w-[90vw] overflow-hidden rounded-lg">
            <ProtectedImage
              src={`/api/shared-image/${code}/${photo.filename}`}
              alt=""
              width={photo.width ?? 1600}
              height={photo.height ?? 1200}
              className="max-h-[85vh] cursor-pointer"
              onClick={() => setLightboxIndex(0)}
              loading="eager"
              blurDataURL={photo.blur_data}
            />
          </div>
        </div>
        {lightboxIndex !== null && (
          <Lightbox
            photos={photos}
            currentIndex={lightboxIndex}
            code={code}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </>
    );
  }

  // Multiple photos: responsive grid
  return (
    <>
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
                  className="h-full w-full cursor-pointer"
                  onClick={() => setLightboxIndex(i)}
                  blurDataURL={photo.blur_data}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
      {lightboxIndex !== null && (
        <Lightbox
          photos={photos}
          currentIndex={lightboxIndex}
          code={code}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
        />
      )}
    </>
  );
}
