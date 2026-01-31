import Link from "next/link";

export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-3 pb-6 pt-8">
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
  );
}
