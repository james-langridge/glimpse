"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";

interface LinkInfo {
  id: string;
  code: string;
  title: string | null;
  status: "active" | "expired" | "revoked";
  expires_at: string;
  revoked: boolean;
  created_at: string;
}

interface PhotoDetail {
  id: string;
  filename: string;
  original_name: string | null;
  width: number | null;
  height: number | null;
  aspect_ratio: number;
  blur_data: string | null;
  file_size: number | null;
  uploaded_at: string;
  links: LinkInfo[];
  total_views: number;
  unique_visitors: number;
}

const statusColors: Record<string, string> = {
  active: "bg-emerald-500/20 text-emerald-400",
  expired: "bg-zinc-500/20 text-zinc-400",
  revoked: "bg-red-500/20 text-red-400",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatBytes(bytes: number | null): string {
  if (bytes === null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PhotoDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [photo, setPhoto] = useState<PhotoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const fetchPhoto = useCallback(async () => {
    try {
      const res = await fetch(`/api/photos/${id}/detail`);
      if (res.ok) {
        const data = await res.json();
        setPhoto(data);
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPhoto();
  }, [fetchPhoto]);

  async function handleDelete() {
    if (!photo) return;

    setDeleting(true);
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
        if (!proceed) {
          setDeleting(false);
          return;
        }

        const forceRes = await fetch(`/api/photos/${id}?force=1`, {
          method: "DELETE",
        });
        if (forceRes.ok) router.push("/admin/photos");
        return;
      }

      if (res.ok) router.push("/admin/photos");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin-slow" />
      </div>
    );
  }

  if (!photo) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Photo not found</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-zinc-400 transition hover:text-white"
          >
            &larr; Back to photos
          </button>

          <h1 className="text-2xl font-light tracking-wide text-white">
            {photo.original_name ?? photo.filename}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Uploaded {formatDate(photo.uploaded_at)}
          </p>
        </div>

        {/* Photo preview */}
        <div className="mb-8 overflow-hidden rounded-lg bg-zinc-900">
          <div className="relative mx-auto max-h-96 max-w-2xl">
            <img
              src={`/api/photos/${photo.id}/image`}
              alt={photo.original_name ?? photo.filename}
              className="mx-auto max-h-96 object-contain"
              style={{
                backgroundImage: photo.blur_data
                  ? `url(${photo.blur_data})`
                  : undefined,
                backgroundSize: "cover",
              }}
            />
          </div>
        </div>

        {/* Stats cards */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">Views</div>
            <div className="mt-1 text-xl text-white">{photo.total_views}</div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">Unique Visitors</div>
            <div className="mt-1 text-xl text-white">
              {photo.unique_visitors}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">Links</div>
            <div className="mt-1 text-xl text-white">{photo.links.length}</div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">File Size</div>
            <div className="mt-1 text-sm text-white">
              {formatBytes(photo.file_size)}
            </div>
          </div>
        </div>

        {/* Links section */}
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">
            Share Links
          </h2>
          {photo.links.length === 0 ? (
            <p className="text-sm text-zinc-500">
              This photo is not in any share links.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-3 pr-4 font-medium">Code</th>
                    <th className="pb-3 pr-4 font-medium">Title</th>
                    <th className="pb-3 pr-4 font-medium">Status</th>
                    <th className="pb-3 pr-4 font-medium">Expires</th>
                    <th className="pb-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {photo.links.map((link) => (
                    <tr
                      key={link.id}
                      className="cursor-pointer border-b border-zinc-800/50 transition hover:bg-zinc-800/50"
                      onClick={() => router.push(`/admin/links/${link.id}`)}
                    >
                      <td className="py-2 pr-4 font-mono text-zinc-200">
                        {link.code}
                      </td>
                      <td className="py-2 pr-4 text-zinc-400">
                        {link.title ?? (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td className="py-2 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[link.status]}`}
                        >
                          {link.status}
                        </span>
                      </td>
                      <td className="py-2 pr-4 text-zinc-400">
                        {formatDate(link.expires_at)}
                      </td>
                      <td className="py-2 text-zinc-400">
                        {formatDate(link.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-zinc-800 pt-6">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-600/30 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}
