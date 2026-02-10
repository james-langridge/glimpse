"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import LinkTable from "@/src/components/LinkTable";
import Spinner from "@/src/components/Spinner";

type Status = "active" | "expired" | "revoked";

interface LinkItem {
  id: string;
  code: string;
  title: string | null;
  status: Status;
  expires_at: string;
  created_at: string;
  photo_count: number;
  preview_photo_ids: string[];
}

const tabs: { key: Status | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expired", label: "Expired" },
  { key: "revoked", label: "Revoked" },
];

export default function LinksPage() {
  const [links, setLinks] = useState<LinkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState<Status | "all">("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkRevoking, setBulkRevoking] = useState(false);

  const fetchLinks = useCallback(async () => {
    setError(false);
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links);
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
    fetchLinks();
  }, [fetchLinks]);

  const filtered =
    tab === "all" ? links : links.filter((l) => l.status === tab);

  const counts = {
    all: links.length,
    active: links.filter((l) => l.status === "active").length,
    expired: links.filter((l) => l.status === "expired").length,
    revoked: links.filter((l) => l.status === "revoked").length,
  };

  const allSelectedAreActive = useMemo(() => {
    if (selectedIds.size === 0) return false;
    const linkMap = new Map(links.map((l) => [l.id, l]));
    return Array.from(selectedIds).every(
      (id) => linkMap.get(id)?.status === "active",
    );
  }, [selectedIds, links]);

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
        `Delete ${ids.length} link${ids.length !== 1 ? "s" : ""}? This cannot be undone.`,
      )
    )
      return;

    setBulkDeleting(true);
    try {
      const res = await fetch("/api/links/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        const data = await res.json();
        const deletedSet = new Set(data.deleted);
        setLinks((prev) => prev.filter((l) => !deletedSet.has(l.id)));
        handleCancelSelection();
        if (data.failed?.length > 0) {
          alert(`${data.failed.length} link(s) could not be deleted.`);
        }
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to delete links. Please try again.");
      }
    } finally {
      setBulkDeleting(false);
    }
  }

  async function handleBulkRevoke() {
    if (selectedIds.size === 0) return;

    const ids = Array.from(selectedIds);
    if (
      !confirm(
        `Revoke ${ids.length} link${ids.length !== 1 ? "s" : ""}? They will no longer be accessible.`,
      )
    )
      return;

    setBulkRevoking(true);
    try {
      const res = await fetch("/api/links/bulk-revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });

      if (res.ok) {
        const data = await res.json();
        const revokedSet = new Set(data.revoked);
        setLinks((prev) =>
          prev.map((l) =>
            revokedSet.has(l.id) ? { ...l, status: "revoked" as Status } : l,
          ),
        );
        handleCancelSelection();
        if (data.failed?.length > 0) {
          alert(`${data.failed.length} link(s) could not be revoked.`);
        }
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? "Failed to revoke links. Please try again.");
      }
    } finally {
      setBulkRevoking(false);
    }
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-light tracking-widest text-white">
              LINKS
            </h1>
            <p className="mt-1 text-sm text-zinc-400">
              {counts.active} active, {counts.expired} expired,{" "}
              {counts.revoked} revoked
            </p>
          </div>
          <Link
            href="/admin/links/new"
            className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200"
          >
            Create Link
          </Link>
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
                  setSelectedIds(new Set(filtered.map((l) => l.id)))
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
                onClick={handleBulkRevoke}
                disabled={
                  selectedIds.size === 0 ||
                  !allSelectedAreActive ||
                  bulkRevoking
                }
                className="rounded-md bg-amber-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-amber-600 disabled:opacity-50"
              >
                {bulkRevoking
                  ? "Revoking..."
                  : `Revoke (${selectedIds.size})`}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className="rounded-md bg-red-600/80 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-600 disabled:opacity-50"
              >
                {bulkDeleting
                  ? "Deleting..."
                  : `Delete (${selectedIds.size})`}
              </button>
            </>
          )}
        </div>

        {error ? (
          <div className="py-16 text-center">
            <p className="text-zinc-400">Failed to load links</p>
            <button
              onClick={fetchLinks}
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
          <LinkTable
            links={filtered}
            selectionMode={selectionMode}
            selectedIds={selectedIds}
            onToggleSelect={handleToggleSelect}
          />
        )}
      </div>
    </div>
  );
}
