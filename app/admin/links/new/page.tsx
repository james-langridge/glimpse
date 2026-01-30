"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhotoSelector from "@/src/components/PhotoSelector";

const EXPIRY_OPTIONS = [
  { label: "1 hour", ms: 1 * 60 * 60 * 1000 },
  { label: "24 hours", ms: 24 * 60 * 60 * 1000 },
  { label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
  { label: "Custom", ms: 0 },
];

export default function NewLinkPage() {
  const router = useRouter();
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [expiryMs, setExpiryMs] = useState(7 * 24 * 60 * 60 * 1000);
  const [customExpiry, setCustomExpiry] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setError("");

    if (selectedPhotos.length === 0) {
      setError("Select at least one photo");
      return;
    }

    let expiresAt: string;
    if (expiryMs === 0) {
      if (!customExpiry) {
        setError("Enter a custom expiry date");
        return;
      }
      const d = new Date(customExpiry);
      if (d <= new Date()) {
        setError("Expiry must be in the future");
        return;
      }
      expiresAt = d.toISOString();
    } else {
      expiresAt = new Date(Date.now() + expiryMs).toISOString();
    }

    setCreating(true);
    try {
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoIds: selectedPhotos, expiresAt }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to create link");
        return;
      }

      const { id } = await res.json();
      router.push(`/admin/links/${id}`);
    } catch {
      setError("Failed to create link");
    } finally {
      setCreating(false);
    }
  }

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
          <h1 className="text-2xl font-light tracking-widest text-white">
            CREATE LINK
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Select photos and set an expiry
          </p>
        </div>

        <div className="mb-8">
          <h2 className="mb-3 text-sm font-medium text-zinc-300">Expiry</h2>
          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.ms}
                type="button"
                onClick={() => setExpiryMs(opt.ms)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  expiryMs === opt.ms
                    ? "bg-white text-zinc-900"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {expiryMs === 0 && (
            <input
              type="datetime-local"
              value={customExpiry}
              onChange={(e) => setCustomExpiry(e.target.value)}
              className="mt-3 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-white"
            />
          )}
        </div>

        {error && <p className="mb-4 text-sm text-red-400">{error}</p>}

        <div className="mb-8 flex gap-3">
          <button
            onClick={handleCreate}
            disabled={creating || selectedPhotos.length === 0}
            className="rounded-lg bg-white px-6 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 disabled:opacity-50"
          >
            {creating ? "Creating..." : "Create Link"}
          </button>
          <button
            onClick={() => router.back()}
            className="rounded-lg bg-zinc-800 px-6 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
          >
            Cancel
          </button>
        </div>

        <div>
          <h2 className="mb-3 text-sm font-medium text-zinc-300">
            Photos ({selectedPhotos.length} selected)
          </h2>
          <PhotoSelector
            selected={selectedPhotos}
            onChange={setSelectedPhotos}
          />
        </div>
      </div>
    </div>
  );
}
