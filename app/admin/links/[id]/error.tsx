"use client";

import { useRouter } from "next/navigation";

export default function LinkDetailError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h2 className="text-xl font-light text-white">Something went wrong</h2>
      <p className="text-sm text-zinc-500">{error.message}</p>
      <div className="mt-2 flex gap-3">
        <button
          onClick={reset}
          className="rounded-md bg-white px-4 py-2 text-sm text-zinc-900 transition hover:bg-zinc-200"
        >
          Try again
        </button>
        <button
          onClick={() => router.back()}
          className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition hover:bg-zinc-700"
        >
          Go back
        </button>
      </div>
    </div>
  );
}
