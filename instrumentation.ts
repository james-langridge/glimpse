export async function register() {
  const { initializeDatabase } = await import("@/src/db/schema");
  await initializeDatabase();
}
