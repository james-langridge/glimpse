export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error(
      "FATAL: SESSION_SECRET must be set and at least 32 characters",
    );
    process.exit(1);
  }

  if (!process.env.ADMIN_PASSWORD) {
    console.warn("WARNING: ADMIN_PASSWORD is not set — login is disabled");
  }

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
