import Link from "next/link";
import Footer from "@/src/components/Footer";

export default function Home() {
  return (
    <div className="flex h-dvh flex-col items-center bg-zinc-950">
      <div className="flex w-full justify-end p-6">
        <Link
          href="/login"
          className="text-zinc-700 transition-colors hover:text-zinc-400"
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
      </div>
      <main className="flex flex-1 flex-col items-center justify-center gap-6">
        <h1 className="text-4xl font-light tracking-widest text-white">
          GLIMPSE
        </h1>
        <p className="text-zinc-400">Temporary, secure photo sharing.</p>
        <Link
          href="/about"
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
        >
          Learn more
        </Link>
      </main>
      <Footer />
    </div>
  );
}
