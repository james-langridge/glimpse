"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import PhotoAnalytics from "@/src/components/PhotoAnalytics";
import Spinner from "@/src/components/Spinner";

interface LinkInfo {
  id: string;
  code: string;
  title: string | null;
  link_caption: string | null;
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
  caption: string | null;
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
  const [error, setError] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");
  const [savingCaption, setSavingCaption] = useState(false);
  const [editingLinkCaption, setEditingLinkCaption] = useState<string | null>(
    null,
  );
  const [linkCaptionDraft, setLinkCaptionDraft] = useState("");
  const [savingLinkCaption, setSavingLinkCaption] = useState(false);

  const fetchPhoto = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch(`/api/photos/${id}/detail`);
      if (res.ok) {
        const data = await res.json();
        setPhoto(data);
      } else if (res.status !== 404) {
        setError(true);
      }
    } catch {
      setError(true);
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

  async function handleSaveCaption() {
    if (!photo) return;
    setSavingCaption(true);
    try {
      const res = await fetch(`/api/photos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: captionDraft }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhoto({ ...photo, caption: data.caption });
        setEditingCaption(false);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to save caption");
      }
    } finally {
      setSavingCaption(false);
    }
  }

  async function handleSaveLinkCaption(linkId: string) {
    if (!photo) return;
    setSavingLinkCaption(true);
    try {
      const res = await fetch(`/api/links/${linkId}/photos/${id}/caption`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: linkCaptionDraft }),
      });
      if (res.ok) {
        const data = await res.json();
        setPhoto({
          ...photo,
          links: photo.links.map((l) =>
            l.id === linkId ? { ...l, link_caption: data.caption } : l,
          ),
        });
        setEditingLinkCaption(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to save caption");
      }
    } finally {
      setSavingLinkCaption(false);
    }
  }

  async function handleResetLinkCaption(linkId: string) {
    if (!photo) return;
    setSavingLinkCaption(true);
    try {
      const res = await fetch(`/api/links/${linkId}/photos/${id}/caption`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caption: null }),
      });
      if (res.ok) {
        setPhoto({
          ...photo,
          links: photo.links.map((l) =>
            l.id === linkId ? { ...l, link_caption: null } : l,
          ),
        });
        setEditingLinkCaption(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Failed to reset caption");
      }
    } finally {
      setSavingLinkCaption(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400">Failed to load photo details</p>
          <button
            onClick={fetchPhoto}
            className="mt-3 rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-white transition hover:bg-zinc-600"
          >
            Retry
          </button>
        </div>
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
            &larr; Back
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

        {/* Caption */}
        <div className="mb-8">
          <h2 className="mb-2 text-sm font-medium text-zinc-300">Caption</h2>
          {editingCaption ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={captionDraft}
                onChange={(e) => setCaptionDraft(e.target.value)}
                placeholder="Enter a caption..."
                className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveCaption();
                  if (e.key === "Escape") setEditingCaption(false);
                }}
              />
              <button
                onClick={handleSaveCaption}
                disabled={savingCaption}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                Save
              </button>
              <button
                onClick={() => setEditingCaption(false)}
                className="rounded-lg px-3 py-1.5 text-sm text-zinc-400 transition hover:text-white"
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className={photo.caption ? "text-sm text-white" : "text-sm text-zinc-500"}>
                {photo.caption ?? "No caption"}
              </span>
              <button
                onClick={() => {
                  setCaptionDraft(photo.caption ?? "");
                  setEditingCaption(true);
                }}
                className="text-xs text-zinc-500 transition hover:text-white"
              >
                Edit
              </button>
            </div>
          )}
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

        {/* Actions */}
        <div className="mb-8 flex gap-3">
          <button
            onClick={() =>
              router.push(
                `/admin/links/new?photos=${encodeURIComponent(photo.id)}`,
              )
            }
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Create Link
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="rounded-lg bg-red-600/20 px-4 py-2 text-sm font-medium text-red-400 transition hover:bg-red-600/30 disabled:opacity-50"
          >
            {deleting ? "Deleting..." : "Delete Photo"}
          </button>
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
                    <th className="pb-3 pr-4 font-medium">Caption</th>
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
                      <td
                        className="py-2 pr-4"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {editingLinkCaption === link.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={linkCaptionDraft}
                              onChange={(e) =>
                                setLinkCaptionDraft(e.target.value)
                              }
                              placeholder="Override caption..."
                              className="w-32 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-sm text-white placeholder-zinc-500 focus:border-zinc-500 focus:outline-none"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleSaveLinkCaption(link.id);
                                if (e.key === "Escape")
                                  setEditingLinkCaption(null);
                              }}
                            />
                            <button
                              onClick={() => handleSaveLinkCaption(link.id)}
                              disabled={savingLinkCaption}
                              className="text-xs text-white hover:text-zinc-300"
                            >
                              Save
                            </button>
                            {link.link_caption !== null && (
                              <button
                                onClick={() =>
                                  handleResetLinkCaption(link.id)
                                }
                                disabled={savingLinkCaption}
                                className="text-xs text-zinc-500 hover:text-zinc-300"
                              >
                                Reset
                              </button>
                            )}
                            <button
                              onClick={() => setEditingLinkCaption(null)}
                              className="text-xs text-zinc-500 hover:text-zinc-300"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setLinkCaptionDraft(link.link_caption ?? "");
                              setEditingLinkCaption(link.id);
                            }}
                            className="text-left"
                          >
                            {link.link_caption ? (
                              <span className="text-zinc-200">
                                {link.link_caption}
                              </span>
                            ) : photo.caption ? (
                              <span className="text-zinc-600">(default)</span>
                            ) : (
                              <span className="text-zinc-600">—</span>
                            )}
                          </button>
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

        {/* Analytics */}
        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">
            Analytics
          </h2>
          <PhotoAnalytics photoId={photo.id} />
        </div>

      </div>
    </div>
  );
}
