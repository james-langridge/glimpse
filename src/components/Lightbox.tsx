"use client";

import { useEffect, useCallback } from "react";
import ProtectedImage from "./ProtectedImage";

interface Photo {
  filename: string;
  width: number | null;
  height: number | null;
}

interface LightboxProps {
  photos: Photo[];
  currentIndex: number;
  code: string;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export default function Lightbox({
  photos,
  currentIndex,
  code,
  onClose,
  onNavigate,
}: LightboxProps) {
  const photo = photos[currentIndex];
  const hasMultiple = photos.length > 1;

  const handlePrev = useCallback(() => {
    onNavigate((currentIndex - 1 + photos.length) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  const handleNext = useCallback(() => {
    onNavigate((currentIndex + 1) % photos.length);
  }, [currentIndex, photos.length, onNavigate]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (hasMultiple && e.key === "ArrowLeft") handlePrev();
      if (hasMultiple && e.key === "ArrowRight") handleNext();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose, hasMultiple, handlePrev, handleNext]);

  return (
    <div className="animate-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/95">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      </button>

      {/* Previous arrow */}
      {hasMultiple && (
        <button
          onClick={handlePrev}
          className="absolute left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Previous photo"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
      )}

      {/* Image */}
      <div className="animate-scale-in flex max-h-[90vh] max-w-[90vw] items-center justify-center">
        <ProtectedImage
          src={`/api/shared-image/${code}/${photo.filename}`}
          alt=""
          width={photo.width ?? 1600}
          height={photo.height ?? 1200}
          className="max-h-[90vh] max-w-[90vw]"
          loading="eager"
        />
      </div>

      {/* Next arrow */}
      {hasMultiple && (
        <button
          onClick={handleNext}
          className="absolute right-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          aria-label="Next photo"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      )}

      {/* Counter */}
      {hasMultiple && (
        <div className="absolute bottom-6 text-sm text-zinc-400">
          {currentIndex + 1} / {photos.length}
        </div>
      )}
    </div>
  );
}
