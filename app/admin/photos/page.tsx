"use client";

import { Suspense, useEffect, useState, useCallback, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ImageUpload from "@/src/components/ImageUpload";
import PhotoGrid from "@/src/components/PhotoGrid";
import Spinner from "@/src/components/Spinner";

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
  active_link_count: number;
}

type PhotoTab = "all" | "active" | "inactive";

const tabs: { key: PhotoTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "inactive", label: "Inactive" },
];

function filterPhotos(photos: Photo[], tab: PhotoTab): Photo[] {
  switch (tab) {
    case "all":
      return photos;
    case "active":
      return photos.filter((p) => p.active_link_count > 0);
    case "inactive":
      return photos.filter((p) => p.active_link_count === 0);
  }
}

export default function PhotosPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center px-6 py-16">
          <Spinner />
        </div>
      }
    >
      <PhotosContent />
    </Suspense>
  );
}

function PhotosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<PhotoTab>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [cleanupDays, setCleanupDays] = useState<number | null>(null);
  const [lastCleanupAt, setLastCleanupAt] = useState<string | null>(null);
  const [lastCleanupDeleted, setLastCleanupDeleted] = useState<number | null>(
    null,
  );
  const [lastCleanupErrors, setLastCleanupErrors] = useState<number | null>(
    null,
  );

  const paramView = searchParams.get("view");
  const view: "grid" | "table" =
    paramView === "grid" || paramView === "table" ? paramView : "table";

  function setView(v: "grid" | "table") {
    router.replace(`/admin/photos?view=${v}`, { scroll: false });
  }

  const fetchPhotos = useCallback(async () => {
    setError(false);
    setLoading(true);
    try {
      const res = await fetch("/api/photos");
      if (res.ok) {
        const data = await res.json();
        setPhotos(data.photos);
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const entry = data.settings.find(
          (s: { key: string }) => s.key === "CLEANUP_DAYS",
        );
        if (entry) {
          const effective = entry.dbValue ?? entry.envValue ?? entry.default;
          setCleanupDays(parseInt(effective, 10));
        }
        if (data.lastCleanupAt) {
          setLastCleanupAt(data.lastCleanupAt);
          setLastCleanupDeleted(data.lastCleanupDeleted ?? null);
          setLastCleanupErrors(data.lastCleanupErrors ?? null);
        }
      })
      .catch(() => {});
  }, []);

  const filtered = filterPhotos(photos, tab);

  const activeCount = photos.filter((p) => p.active_link_count > 0).length;
  const counts = {
    all: photos.length,
    active: activeCount,
    inactive: photos.length - activeCount,
  };

  function handleDelete(id: string) {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  }

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  function handleCancelSelection() {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }

  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    if (
      !confirm(
        `Delete ${ids.length} photo${ids.length !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/photos/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, force: false }),
      });

      if (res.status === 409) {
        const data = await res.json();
        const totalConflicts = data.conflicts.length;
        const codes = [
          ...new Set(
            data.conflicts.flatMap(
              (c: { links: { code: string }[] }) =>
                c.links.map((l) => l.code),
            ),
          ),
        ].join(", ");
        const proceed = confirm(
          `${totalConflicts} photo${totalConflicts !== 1 ? "s are" : " is"} in active share link(s): ${codes}. Delete anyway?`,
        );
        if (!proceed) return;

        const forceRes = await fetch("/api/photos/bulk-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ids, force: true }),
        });
        if (forceRes.ok) {
          const forceData = await forceRes.json();
          const deletedSet = new Set(forceData.deleted);
          setPhotos((prev) => prev.filter((p) => !deletedSet.has(p.id)));
          handleCancelSelection();
        } else {
          alert("Failed to delete photos. Please try again.");
        }
        return;
      }

      if (res.ok) {
        const data = await res.json();
        const deletedSet = new Set(data.deleted);
        setPhotos((prev) => prev.filter((p) => !deletedSet.has(p.id)));
        handleCancelSelection();
      }
    } finally {
      setBulkDeleting(false);
    }
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
              {counts.active > 0 && `, ${counts.active} active`}
            </p>
            {cleanupDays !== null &&
              (cleanupDays > 0 ? (
                <p className="mt-1 text-sm text-zinc-500">
                  Unlinked photos are auto-deleted after {cleanupDays} day
                  {cleanupDays !== 1 ? "s" : ""}
                  {lastCleanupAt && (
                    <span className="text-zinc-600">
                      {" "}
                      (last run: {lastCleanupAt}
                      {lastCleanupDeleted != null && (
                        <>
                          {" — "}
                          {lastCleanupDeleted} deleted
                          {lastCleanupErrors
                            ? `, ${lastCleanupErrors} error${lastCleanupErrors !== 1 ? "s" : ""}`
                            : ""}
                        </>
                      )}
                      )
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-1 text-sm text-zinc-500">
                  Auto-cleanup is disabled
                </p>
              ))}
          </div>
          <ImageUpload onUploadComplete={fetchPhotos} />
        </div>

        <div className="mb-6 flex gap-1 rounded-lg bg-zinc-900 p-1">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => {
                setTab(t.key);
                setSelectedIds(new Set());
              }}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
              <span className="ml-1.5 text-xs text-zinc-500">
                {counts[t.key]}
              </span>
            </button>
          ))}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1 rounded-lg bg-zinc-900 p-1">
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

          {!selectionMode ? (
            <button
              onClick={() => setSelectionMode(true)}
              disabled={filtered.length === 0}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white disabled:opacity-50"
            >
              Select
            </button>
          ) : (
            <>
              <button
                onClick={handleCancelSelection}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  setSelectedIds(new Set(filtered.map((p) => p.id)))
                }
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                All
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-400 transition hover:text-white"
              >
                None
              </button>
              <span className="text-sm text-zinc-500">
                {selectedIds.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className="rounded-md bg-red-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {bulkDeleting
                  ? "Deleting..."
                  : `Delete (${selectedIds.size})`}
              </button>
              <button
                onClick={() =>
                  router.push(
                    `/admin/links/new?photos=${encodeURIComponent(Array.from(selectedIds).join(","))}`,
                  )
                }
                disabled={selectedIds.size === 0}
                className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
              >
                Create Link ({selectedIds.size})
              </button>
            </>
          )}
        </div>

        {error ? (
          <div className="py-16 text-center">
            <p className="text-zinc-400">Failed to load photos</p>
            <button
              onClick={fetchPhotos}
              className="mt-3 rounded-md bg-zinc-700 px-3 py-1.5 text-sm text-white transition hover:bg-zinc-600"
            >
              Retry
            </button>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner />
          </div>
        ) : (
          <PhotoGrid
            photos={filtered}
            onDelete={handleDelete}
            view={view}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        )}
      </div>
    </div>
  );
}
