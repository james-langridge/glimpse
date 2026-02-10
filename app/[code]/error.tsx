"use client";

import Link from "next/link";

export default function ShareError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-2xl font-light tracking-widest text-white">
          GLIMPSE
        </h1>
        <p className="text-zinc-400">Something went wrong</p>
        <div className="mt-4 flex gap-4">
          <button
            onClick={reset}
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Try again
          </button>
          <Link
            href="/"
            className="text-sm text-zinc-500 transition hover:text-zinc-300"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
