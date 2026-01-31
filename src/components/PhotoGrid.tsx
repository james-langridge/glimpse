"use client";

import { useEffect, useState } from "react";

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
  view: "grid" | "table";
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDimensions(
  width: number | null,
  height: number | null,
): string {
  if (width === null || height === null) return "";
  return `${width}×${height}`;
}

export default function PhotoGrid({ photos, onDelete, view }: PhotoGridProps) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeId) return;
    function handleTap(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(`[data-photo-id="${activeId}"]`)) {
        setActiveId(null);
      }
    }
    document.addEventListener("click", handleTap);
    return () => document.removeEventListener("click", handleTap);
  }, [activeId]);

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

  if (view === "table") {
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400">
              <th className="pb-3 pr-4 font-medium"></th>
              <th className="pb-3 pr-4 font-medium">Filename</th>
              <th className="pb-3 pr-4 font-medium">Dimensions</th>
              <th className="pb-3 pr-4 font-medium">Size</th>
              <th className="pb-3 pr-4 font-medium">Uploaded</th>
              <th className="pb-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {photos.map((photo) => (
              <tr key={photo.id} className="border-b border-zinc-800/50">
                <td className="py-2 pr-4">
                  <img
                    src={`/api/photos/${photo.id}/image?w=400`}
                    alt={photo.original_name ?? photo.filename}
                    className="h-10 w-10 rounded object-cover"
                    loading="lazy"
                  />
                </td>
                <td className="py-2 pr-4 text-zinc-300">
                  <span className="line-clamp-1">
                    {photo.original_name ?? photo.filename}
                  </span>
                </td>
                <td className="py-2 pr-4 text-zinc-400">
                  {formatDimensions(photo.width, photo.height)}
                </td>
                <td className="py-2 pr-4 text-zinc-400">
                  {formatBytes(photo.file_size)}
                </td>
                <td className="py-2 pr-4 text-zinc-400">
                  {formatDate(photo.uploaded_at)}
                </td>
                <td className="py-2">
                  <button
                    onClick={() => handleDelete(photo.id)}
                    disabled={deleting === photo.id}
                    className="rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
                  >
                    {deleting === photo.id ? "..." : "Delete"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {photos.map((photo) => {
        const isActive = activeId === photo.id;
        return (
          <div
            key={photo.id}
            data-photo-id={photo.id}
            className="group relative overflow-hidden rounded-lg bg-zinc-800"
            onClick={() => setActiveId(isActive ? null : photo.id)}
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
                src={`/api/photos/${photo.id}/image?w=480`}
                alt={photo.original_name ?? photo.filename}
                className="absolute inset-0 h-full w-full object-cover"
                loading="lazy"
              />
            </div>
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent transition ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            />
            <div
              className={`absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-2 transition ${isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
            >
              <div className="min-w-0">
                <p className="truncate text-xs text-zinc-200">
                  {photo.original_name ?? photo.filename}
                </p>
                <p className="text-xs text-zinc-400">
                  {[
                    formatBytes(photo.file_size),
                    formatDimensions(photo.width, photo.height),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(photo.id);
                }}
                disabled={deleting === photo.id}
                className="rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {deleting === photo.id ? "..." : "Delete"}
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
