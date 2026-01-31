import Link from "next/link";
import CodeEntry from "@/src/components/CodeEntry";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950">
      <Link
        href="/login"
        className="absolute right-6 top-6 text-zinc-700 transition-colors hover:text-zinc-400"
        title="Login"
      >
        <svg
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      </Link>
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-light tracking-widest text-white">
          GLIMPSE
        </h1>
        <p className="text-zinc-400">Enter your code to view photos</p>
        <CodeEntry />
      </main>
      <footer className="absolute bottom-6 flex flex-col items-center gap-3">
        <div className="flex gap-4">
          <Link
            href="/about"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
          >
            About Glimpse
          </Link>
          <a
            href="https://github.com/james-langridge/glimpse"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
          >
            GitHub
          </a>
        </div>
        <p className="text-xs text-zinc-700">
          Built by{" "}
          <a
            href="https://langridge.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-zinc-400"
          >
            James Langridge
          </a>
        </p>
      </footer>
    </div>
  );
}
