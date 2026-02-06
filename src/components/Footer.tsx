export default function Footer() {
  return (
    <footer className="flex flex-col items-center gap-3 pb-8 pt-12">
      <div className="mb-2 h-px w-24 bg-zinc-700" />
      <a
        href="https://langridge.dev/glimpse"
        target="_blank"
        rel="noopener noreferrer"
        className="rounded-full border border-zinc-700 px-5 py-1.5 text-sm text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
      >
        About Glimpse
        <svg
          className="ml-1 inline-block h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
          />
        </svg>
      </a>
      <div className="flex items-center gap-2 text-sm text-zinc-400">
        <a
          href="https://langridge.dev"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-zinc-200"
        >
          James Langridge
        </a>
        <span className="text-zinc-600">&middot;</span>
        <a
          href="https://github.com/james-langridge/glimpse"
          target="_blank"
          rel="noopener noreferrer"
          className="transition-colors hover:text-zinc-200"
        >
          GitHub
        </a>
      </div>
    </footer>
  );
}
