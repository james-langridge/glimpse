"use client";

import { useEffect, useRef, useState } from "react";

export default function EmailDownloadModal({
  code,
  filename,
  onClose,
}: {
  code: string;
  filename: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/download-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, filename, email: trimmed }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Something went wrong.");
        return;
      }

      setSent(true);
    } catch {
      setError("Failed to send request. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="relative mx-4 w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-zinc-400 hover:text-white"
          aria-label="Close"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-5 w-5"
          >
            <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
          </svg>
        </button>

        {sent ? (
          <div className="text-center">
            <h3 className="mb-2 text-lg font-medium text-white">
              Check your email
            </h3>
            <p className="text-sm text-zinc-400">
              We sent a download link to{" "}
              <span className="text-zinc-200">{email.trim()}</span>. It expires
              in 1 hour and can only be used once. If you don&apos;t see it,
              check your spam folder.
            </p>
            <button
              onClick={onClose}
              className="mt-4 rounded-md bg-zinc-700 px-4 py-2 text-sm text-white hover:bg-zinc-600"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <h3 className="mb-4 text-lg font-medium text-white">
              Download photo
            </h3>
            <label
              htmlFor="download-email"
              className="mb-1 block text-sm text-zinc-300"
            >
              Email address
            </label>
            <input
              ref={inputRef}
              id="download-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mb-1 w-full rounded-md border border-zinc-600 bg-zinc-800 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-zinc-400 focus:outline-none"
              disabled={loading}
            />
            <p className="mb-4 text-xs text-zinc-400">
              We&apos;ll send a one-time download link to this address. Your
              email is only used for this download.
            </p>

            {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send download link"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
