"use client";

import { useState, useEffect, useCallback } from "react";

interface Photo {
  id: string;
  filename: string;
  original_name: string | null;
  aspect_ratio: number;
  blur_data: string | null;
}

interface PhotoSelectorProps {
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function PhotoSelector({
  selected,
  onChange,
}: PhotoSelectorProps) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchPhotos = useCallback(() => {
    setError(false);
    setLoading(true);
    fetch("/api/photos")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load");
        return res.json();
      })
      .then((data) => setPhotos(data.photos))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  function togglePhoto(id: string) {
    if (selected.includes(id)) {
      onChange(selected.filter((s) => s !== id));
    } else {
      onChange([...selected, id]);
    }
  }

  if (loading) {
    return (
      <div className="py-8 text-center text-zinc-500">Loading photos...</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-dashed border-red-800 py-8 text-center text-red-400">
        <p>Failed to load photos.</p>
        <button
          onClick={fetchPhotos}
          className="mt-2 rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-white transition hover:bg-zinc-600"
        >
          Retry
        </button>
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-zinc-700 py-8 text-center text-zinc-500">
        No photos available. Upload photos first.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {photos.map((photo) => {
        const index = selected.indexOf(photo.id);
        const isSelected = index !== -1;

        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => togglePhoto(photo.id)}
            className={`relative overflow-hidden rounded-lg transition ${
              isSelected
                ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950"
                : "ring-1 ring-zinc-700 hover:ring-zinc-500"
            }`}
          >
            <div
              className="relative"
              style={{
                paddingBottom: `${(1 / photo.aspect_ratio) * 100}%`,
              }}
            >
              {photo.blur_data && (
                <img
                  src={photo.blur_data}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                  aria-hidden
                />
              )}
              <img
                src={`/api/photos/${photo.id}/image?w=400`}
                alt={photo.original_name ?? photo.filename}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            {isSelected && (
              <div className="absolute top-1 left-1 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500 text-xs font-bold text-white">
                {index + 1}
              </div>
            )}
            {!isSelected && <div className="absolute inset-0 bg-black/40" />}
          </button>
        );
      })}
    </div>
  );
}
