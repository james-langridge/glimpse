import Link from "next/link";
import CodeEntry from "@/src/components/CodeEntry";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950">
      <main className="flex flex-col items-center gap-8">
        <h1 className="text-4xl font-light tracking-widest text-white">
          GLIMPSE
        </h1>
        <p className="text-zinc-400">Enter your code to view photos</p>
        <CodeEntry />
      </main>
      <footer className="absolute bottom-6">
        <Link
          href="/about"
          className="text-sm text-zinc-600 transition-colors hover:text-zinc-400"
        >
          About Glimpse
        </Link>
      </footer>
    </div>
  );
}
