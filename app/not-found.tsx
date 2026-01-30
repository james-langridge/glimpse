export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-6xl font-light tracking-widest text-zinc-700">
          404
        </h1>
        <p className="text-zinc-400">Page not found</p>
        <a
          href="/"
          className="mt-4 text-sm text-zinc-500 transition hover:text-zinc-300"
        >
          Go home
        </a>
      </div>
    </div>
  );
}
