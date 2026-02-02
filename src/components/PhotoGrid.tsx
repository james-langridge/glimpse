"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  view_count: number;
  link_count: number;
}

interface PhotoGridProps {
  photos: Photo[];
  onDelete: (id: string) => void;
  view: "grid" | "table";
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
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

type SortKey = "filename" | "dimensions" | "size" | "uploaded" | "views" | "links";
type SortDir = "asc" | "desc";

function comparePhotos(a: Photo, b: Photo, key: SortKey): number {
  switch (key) {
    case "filename": {
      const aName = a.original_name ?? a.filename;
      const bName = b.original_name ?? b.filename;
      return aName.localeCompare(bName);
    }
    case "dimensions":
      return ((a.width ?? 0) * (a.height ?? 0)) - ((b.width ?? 0) * (b.height ?? 0));
    case "size":
      return (a.file_size ?? 0) - (b.file_size ?? 0);
    case "uploaded":
      return new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
    case "views":
      return a.view_count - b.view_count;
    case "links":
      return a.link_count - b.link_count;
  }
}

function Checkmark({ className }: { className?: string }) {
  return (
    <svg
      className={className ?? "h-3 w-3 text-white"}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 6l3 3 5-5" />
    </svg>
  );
}

function SortIcon({ direction }: { direction: SortDir | null }) {
  return (
    <svg className="ml-1 inline h-3 w-3" viewBox="0 0 10 14" fill="currentColor">
      <path
        d="M5 0L9 5H1L5 0Z"
        className={direction === "asc" ? "text-white" : "text-zinc-600"}
      />
      <path
        d="M5 14L1 9H9L5 14Z"
        className={direction === "desc" ? "text-white" : "text-zinc-600"}
      />
    </svg>
  );
}

export default function PhotoGrid({
  photos,
  onDelete,
  view,
  selectionMode,
  selectedIds,
  onToggleSelect,
}: PhotoGridProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("uploaded");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir(key === "filename" ? "asc" : "desc");
    }
  }

  const sorted = useMemo(() => {
    const multiplier = sortDir === "asc" ? 1 : -1;
    return [...photos].sort((a, b) => multiplier * comparePhotos(a, b, sortKey));
  }, [photos, sortKey, sortDir]);

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

  const columns: { key: SortKey; label: string }[] = [
    { key: "filename", label: "Filename" },
    { key: "dimensions", label: "Dimensions" },
    { key: "size", label: "Size" },
    { key: "views", label: "Views" },
    { key: "links", label: "Links" },
    { key: "uploaded", label: "Uploaded" },
  ];

  function PhotoCard({ photo }: { photo: Photo }) {
    const isSelected = selectionMode && selectedIds?.has(photo.id);

    return (
      <div
        className={`cursor-pointer rounded-lg border bg-zinc-900/50 p-4 transition ${
          isSelected
            ? "border-blue-500 bg-blue-500/5"
            : "border-zinc-800 hover:border-zinc-700"
        }`}
        onClick={() =>
          selectionMode
            ? onToggleSelect?.(photo.id)
            : router.push(`/admin/photos/${photo.id}`)
        }
      >
        <div className="flex items-center gap-3">
          {selectionMode && (
            <div
              className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                isSelected
                  ? "border-blue-500 bg-blue-500"
                  : "border-zinc-600 bg-zinc-800"
              }`}
            >
              {isSelected && <Checkmark />}
            </div>
          )}
          <img
            src={`/api/photos/${photo.id}/image?w=400`}
            alt={photo.original_name ?? photo.filename}
            className="h-12 w-12 shrink-0 rounded object-cover"
            loading="lazy"
          />
          <p className="min-w-0 truncate text-sm text-zinc-300">
            {photo.original_name ?? photo.filename}
          </p>
          {!selectionMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(photo.id);
              }}
              disabled={deleting === photo.id}
              className="ml-auto shrink-0 rounded bg-red-600/80 px-2 py-1 text-xs font-medium text-white hover:bg-red-600 disabled:opacity-50"
            >
              {deleting === photo.id ? "..." : "Delete"}
            </button>
          )}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-zinc-500">Dimensions</span>
            <p className="text-zinc-300">
              {formatDimensions(photo.width, photo.height) || "—"}
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Size</span>
            <p className="text-zinc-300">
              {formatBytes(photo.file_size) || "—"}
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Views</span>
            <p className="text-zinc-300">{photo.view_count}</p>
          </div>
          <div>
            <span className="text-zinc-500">Links</span>
            <p className="text-zinc-300">{photo.link_count}</p>
          </div>
          <div className="col-span-2">
            <span className="text-zinc-500">Uploaded</span>
            <p className="text-zinc-400">{formatDate(photo.uploaded_at)}</p>
          </div>
        </div>
      </div>
    );
  }

  if (view === "table") {
    return (
      <>
        {/* Mobile: card layout */}
        <div className="flex flex-col gap-3 md:hidden">
          {sorted.map((photo) => (
            <PhotoCard key={photo.id} photo={photo} />
          ))}
        </div>

        {/* Desktop: table layout */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-400">
                {selectionMode && <th className="pb-3 pr-4 w-8 font-medium"></th>}
                <th className="pb-3 pr-4 font-medium"></th>
                {columns.map((col) => (
                  <th key={col.key} className="pb-3 pr-4 font-medium">
                    <button
                      onClick={() => handleSort(col.key)}
                      className="inline-flex items-center transition hover:text-white"
                    >
                      {col.label}
                      <SortIcon direction={sortKey === col.key ? sortDir : null} />
                    </button>
                  </th>
                ))}
                {!selectionMode && <th className="pb-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {sorted.map((photo) => {
                const isSelected = selectionMode && selectedIds?.has(photo.id);
                return (
                  <tr
                    key={photo.id}
                    className={`cursor-pointer border-b border-zinc-800/50 transition ${
                      isSelected ? "bg-blue-500/10" : "hover:bg-zinc-800/50"
                    }`}
                    onClick={() =>
                      selectionMode
                        ? onToggleSelect?.(photo.id)
                        : router.push(`/admin/photos/${photo.id}`)
                    }
                  >
                    {selectionMode && (
                      <td className="py-2 pr-4">
                        <div
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            isSelected
                              ? "border-blue-500 bg-blue-500"
                              : "border-zinc-600 bg-zinc-800"
                          }`}
                        >
                          {isSelected && <Checkmark />}
                        </div>
                      </td>
                    )}
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
                      {photo.view_count}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">
                      {photo.link_count}
                    </td>
                    <td className="py-2 pr-4 text-zinc-400">
                      {formatDate(photo.uploaded_at)}
                    </td>
                    {!selectionMode && (
                      <td className="py-2">
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
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {sorted.map((photo) => {
        const isSelected = selectionMode && selectedIds?.has(photo.id);

        return (
          <div
            key={photo.id}
            className={`group relative cursor-pointer overflow-hidden rounded-lg bg-zinc-800 transition ${
              isSelected
                ? "ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950"
                : ""
            }`}
            onClick={() =>
              selectionMode
                ? onToggleSelect?.(photo.id)
                : router.push(`/admin/photos/${photo.id}`)
            }
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
            {selectionMode && isSelected && (
              <div className="absolute top-1.5 left-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-blue-500">
                <Checkmark className="h-3.5 w-3.5 text-white" />
              </div>
            )}
            {selectionMode && !isSelected && (
              <>
                <div className="absolute inset-0 bg-black/40" />
                <div className="absolute top-1.5 left-1.5 h-6 w-6 rounded-full border-2 border-white/50" />
              </>
            )}
            {!selectionMode && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
                <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between gap-2 p-2 opacity-0 transition group-hover:opacity-100">
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
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
