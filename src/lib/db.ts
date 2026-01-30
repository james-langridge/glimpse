import { Pool, PoolClient, QueryResultRow } from "pg";

const globalForDb = globalThis as unknown as { pool: Pool };
const pool =
  globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL });
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

type Primitive = string | number | boolean | undefined | null;

export async function query<T extends QueryResultRow = QueryResultRow>(
  queryString: string,
  values: Primitive[] = [],
) {
  const client = await pool.connect();
  try {
    return await client.query<T>(queryString, values);
  } finally {
    client.release();
  }
}

export function sql<T extends QueryResultRow = QueryResultRow>(
  strings: TemplateStringsArray,
  ...values: Primitive[]
) {
  let result = strings[0] ?? "";
  for (let i = 1; i < strings.length; i++) {
    result += `$${i}${strings[i] ?? ""}`;
  }
  return query<T>(result, values);
}

export async function withTransaction<T>(
  fn: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
