import { Pool, QueryResultRow } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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
