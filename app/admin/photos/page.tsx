"use client";

import { useEffect, useState, useCallback } from "react";
import ImageUpload from "@/src/components/ImageUpload";
import PhotoGrid from "@/src/components/PhotoGrid";

interface Photo {
  id: string;
  filename: string;
  original_name: string | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number;
  blur_data: string | null;
  file_size: number | null;
  uploaded_at: string;
}

export default function PhotosPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"grid" | "table">("grid");

  const fetchPhotos = useCallback(async () => {
    try {
      const res = await fetch("/api/photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-widest text-white">
              PHOTOS
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {photos.length} photo{photos.length !== 1 ? "s" : ""} in pool
            </p>
          </div>
          <ImageUpload onUploadComplete={fetchPhotos} />
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-zinc-900 p-1 self-start w-fit">
          {(["grid", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                view === v
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {v === "grid" ? "Grid" : "Table"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin-slow" />
          </div>
        ) : (
          <PhotoGrid photos={photos} onDelete={handleDelete} view={view} />
        )}
      </div>
    </div>
  );
}
