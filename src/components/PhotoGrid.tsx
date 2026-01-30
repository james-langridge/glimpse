"use client";

import { useState } from "react";

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

interface PhotoGridProps {
  photos: Photo[];
  onDelete: (id: string) => void;
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PhotoGrid({ photos, onDelete }: PhotoGridProps) {
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Delete this photo? This cannot be undone.")) return;

    setDeleting(id);
    try {
      const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });

      if (res.status === 409) {
        const data = await res.json();
        const codes = data.activeLinks
          .map((l: { code: string }) => l.code)
          .join(", ");
        const proceed = confirm(
          `This photo is in ${data.activeLinks.length} active share link(s): ${codes}. Delete anyway?`,
        );
        if (!proceed) return;

        const forceRes = await fetch(`/api/photos/${id}?force=1`, {
          method: "DELETE",
        });
        if (forceRes.ok) onDelete(id);
        return;
      }

      if (res.ok) onDelete(id);
    } finally {
      setDeleting(null);
    }
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-zinc-700 py-16 text-zinc-500">
        <p>No photos uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {photos.map((photo) => (
        <div
          key={photo.id}
          className="group relative overflow-hidden rounded-lg bg-zinc-800"
        >
          <div
            className="relative"
            style={{ paddingBottom: `${(1 / photo.aspect_ratio) * 100}%` }}
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
              src={`/api/photos/${photo.id}/image`}
              alt={photo.original_name ?? photo.filename}
              className="absolute inset-0 h-full w-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between p-2 opacity-0 transition group-hover:opacity-100">
            <span className="truncate text-xs text-zinc-300">
              {formatBytes(photo.file_size)}
            </span>
            <button
              onClick={() => handleDelete(photo.id)}
              disabled={deleting === photo.id}
              className="rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleting === photo.id ? "..." : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
