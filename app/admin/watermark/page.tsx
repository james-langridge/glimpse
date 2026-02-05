"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import type { DownloadDetail } from "@/src/db/downloads";

interface ExtractResult {
  found: boolean;
  source?: "exif" | "pixel" | "dct";
  downloadId?: number;
  download?: DownloadDetail;
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function WatermarkPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch("/api/photos/watermark/extract", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Extraction failed");
        return;
      }

      setResult(await res.json());
    } catch {
      setError("Failed to check watermark. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (loading) return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleReset() {
    setResult(null);
    setError("");
    setFileName(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <div className="px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-light tracking-widest text-white">
            CHECK WATERMARK
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Upload an image to extract its watermark and see download details.
          </p>
        </div>

        {/* Upload area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !loading && fileInputRef.current?.click()}
          className={`rounded-lg border-2 border-dashed p-8 text-center transition ${
            loading
              ? "cursor-wait opacity-60"
              : "cursor-pointer"
          } ${
            dragging
              ? "border-violet-500 bg-violet-500/10"
              : "border-zinc-700 hover:border-zinc-500"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
          <svg
            className="mx-auto h-12 w-12 text-zinc-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <p className="mt-4 text-sm text-zinc-300">
            {loading ? "Checking watermark..." : "Drop an image here or click to upload"}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            Supports JPEG, PNG, and WebP
          </p>
        </div>

        {error && (
          <div className="mt-4 rounded-lg bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
            {fileName && (
              <p className="mb-4 text-xs text-zinc-500">
                File: <span className="text-zinc-400">{fileName}</span>
              </p>
            )}

            {!result.found ? (
              <div className="text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800">
                  <svg
                    className="h-6 w-6 text-zinc-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <p className="text-zinc-300">No watermark found</p>
                <p className="mt-1 text-sm text-zinc-500">
                  This image may not have been downloaded through Glimpse, or the
                  watermark may have been removed.
                </p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                    <svg
                      className="h-5 w-5 text-green-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-zinc-200">Watermark found</p>
                    <p className="text-xs text-zinc-500">
                      Extracted from {result.source?.toUpperCase()} layer
                    </p>
                  </div>
                </div>

                {result.download ? (
                  <div className="space-y-4">
                    {result.download.email && (
                      <div className="rounded-lg bg-violet-500/10 p-4">
                        <p className="text-xs text-zinc-400">Downloaded by</p>
                        <p className="text-lg text-violet-400">
                          {result.download.email}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-zinc-500">Date</p>
                        <p className="text-zinc-200">
                          {formatDateTime(result.download.downloaded_at)}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Download ID</p>
                        <p className="text-zinc-200">{result.download.id}</p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Photo</p>
                        <Link
                          href={`/admin/photos/${result.download.photo_id}`}
                          className="text-violet-400 hover:underline"
                        >
                          {result.download.original_name ?? result.download.filename}
                        </Link>
                      </div>
                      <div>
                        <p className="text-zinc-500">Share Link</p>
                        <Link
                          href={`/admin/links/${result.download.share_link_id}`}
                          className="font-mono text-violet-400 hover:underline"
                        >
                          {result.download.code}
                        </Link>
                        {result.download.title && (
                          <p className="text-xs text-zinc-500">
                            {result.download.title}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-zinc-500">Location</p>
                        <p className="text-zinc-200">
                          {[result.download.city, result.download.country]
                            .filter(Boolean)
                            .join(", ") || "-"}
                        </p>
                      </div>
                      <div>
                        <p className="text-zinc-500">Device</p>
                        <p className="capitalize text-zinc-200">
                          {result.download.device_type ?? "-"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-zinc-500">Browser / OS</p>
                        <p className="text-zinc-200">
                          {[result.download.browser, result.download.os]
                            .filter(Boolean)
                            .join(" / ") || "-"}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400">
                    Download ID: {result.downloadId} (record not found in database)
                  </p>
                )}
              </>
            )}

            <button
              onClick={handleReset}
              className="mt-6 w-full rounded-md border border-zinc-700 py-2 text-sm text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            >
              Check another image
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
