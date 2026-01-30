"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PhotoSelector from "@/src/components/PhotoSelector";

interface Photo {
  id: string;
  filename: string;
  original_name: string | null;
  aspect_ratio: number;
  blur_data: string | null;
}

interface LinkDetail {
  id: string;
  code: string;
  status: "active" | "expired" | "revoked";
  expires_at: string;
  revoked: boolean;
  created_at: string;
  updated_at: string;
  photos: Photo[];
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

export default function LinkDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [link, setLink] = useState<LinkDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchLink = useCallback(async () => {
    try {
      const res = await fetch(`/api/links/${id}`);
      if (res.ok) {
        const data = await res.json();
        setLink(data);
        setSelectedPhotos(data.photos.map((p: Photo) => p.id));
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLink();
  }, [fetchLink]);

  async function handleSavePhotos() {
    setSaving(true);
    try {
      const res = await fetch(`/api/links/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: selectedPhotos }),
      });
      if (res.ok) {
        setEditing(false);
        fetchLink();
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (
      !confirm(
        "Revoke this link? Recipients will no longer be able to view the photos.",
      )
    )
      return;

    const res = await fetch(`/api/links/${id}/revoke`, { method: "PATCH" });
    if (res.ok) fetchLink();
  }

  async function handleDelete() {
    if (!confirm("Delete this link permanently? This cannot be undone."))
      return;

    const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/admin/links");
  }

  function copyUrl() {
    if (!link) return;
    const url = `${window.location.origin}/${link.code}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 rounded-full border-2 border-zinc-700 border-t-zinc-400 animate-spin-slow" />
      </div>
    );
  }

  if (!link) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-zinc-400">Link not found</p>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/${link.code}`;

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/links")}
            className="mb-4 text-sm text-zinc-400 transition hover:text-white"
          >
            &larr; Back to links
          </button>

          <div className="flex items-center gap-4">
            <h1 className="font-mono text-3xl font-light tracking-widest text-white">
              {link.code}
            </h1>
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[link.status]}`}
            >
              {link.status}
            </span>
          </div>
        </div>

        {/* Share URL */}
        <div className="mb-8 rounded-lg bg-zinc-900 p-4">
          <div className="mb-1 text-xs text-zinc-400">Share URL</div>
          <div className="flex items-center gap-3">
            <code className="flex-1 truncate text-sm text-zinc-200">
              {shareUrl}
            </code>
            <button
              onClick={copyUrl}
              className="rounded bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition hover:bg-zinc-700"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>

        {/* Details */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">Photos</div>
            <div className="mt-1 text-xl text-white">{link.photos.length}</div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">Created</div>
            <div className="mt-1 text-sm text-white">
              {formatDate(link.created_at)}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">Expires</div>
            <div className="mt-1 text-sm text-white">
              {formatDate(link.expires_at)}
            </div>
          </div>
          <div className="rounded-lg bg-zinc-900 p-4">
            <div className="text-xs text-zinc-400">Status</div>
            <div className="mt-1 text-sm capitalize text-white">
              {link.status}
            </div>
          </div>
        </div>

        {/* Photos */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium text-zinc-300">Photos</h2>
            {link.status === "active" && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-zinc-400 transition hover:text-white"
              >
                Edit
              </button>
            )}
          </div>

          {editing ? (
            <>
              <PhotoSelector
                selected={selectedPhotos}
                onChange={setSelectedPhotos}
              />
              <div className="mt-4 flex gap-3">
                <button
                  onClick={handleSavePhotos}
                  disabled={saving || selectedPhotos.length === 0}
                  className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setSelectedPhotos(link.photos.map((p) => p.id));
                  }}
                  className="rounded-lg bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {link.photos.map((photo, i) => (
                <div
                  key={photo.id}
                  className="relative overflow-hidden rounded-lg"
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
                      src={`/api/photos/${photo.id}/image`}
                      alt={photo.original_name ?? photo.filename}
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="absolute top-1 left-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white">
                    {i + 1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 border-t border-zinc-800 pt-6">
          {link.status === "active" && (
            <button
              onClick={handleRevoke}
              className="rounded-lg bg-amber-600/20 px-4 py-2 text-sm font-medium text-amber-400 transition hover:bg-amber-600/30"
            >
              Revoke Link
            </button>
          )}
          <button
            onClick={handleDelete}
            className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-600/30"
          >
            Delete Link
          </button>
        </div>
      </div>
    </div>
  );
}
