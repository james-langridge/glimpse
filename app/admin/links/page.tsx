"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import LinkTable from "@/src/components/LinkTable";

type Status = "active" | "expired" | "revoked";

interface LinkItem {
  id: string;
  code: string;
  status: Status;
  expires_at: string;
  created_at: string;
  photo_count: number;
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
  const [tab, setTab] = useState<Status | "all">("all");

  const fetchLinks = useCallback(async () => {
    try {
      const res = await fetch("/api/links");
      if (res.ok) {
        const data = await res.json();
        setLinks(data.links);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLinks();
  }, [fetchLinks]);

  const filtered = tab === "all" ? links : links.filter((l) => l.status === tab);

  const counts = {
    all: links.length,
    active: links.filter((l) => l.status === "active").length,
    expired: links.filter((l) => l.status === "expired").length,
    revoked: links.filter((l) => l.status === "revoked").length,
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-6 py-8">
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
              onClick={() => setTab(t.key)}
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

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <p className="text-zinc-500">Loading...</p>
          </div>
        ) : (
          <LinkTable links={filtered} />
        )}
      </div>
    </div>
  );
}
