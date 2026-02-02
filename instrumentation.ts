export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { initializeDatabase } = await import("@/src/db/schema");
  await initializeDatabase();

  const { runCleanup } = await import("@/src/lib/cleanup");

  setTimeout(() => {
    runCleanup().catch((e) =>
      console.error("Scheduled cleanup failed:", e),
    );
    setInterval(
      () =>
        runCleanup().catch((e) =>
          console.error("Scheduled cleanup failed:", e),
        ),
      24 * 60 * 60 * 1000,
    );
  }, 60 * 1000);
}
