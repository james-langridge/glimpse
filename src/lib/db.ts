import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";

const dbPath = process.env.DATABASE_PATH || "./data/glimpse.db";
mkdirSync(dirname(dbPath), { recursive: true });

const globalForDb = globalThis as unknown as { db: Database.Database };
const db =
  globalForDb.db ??
  (() => {
    const instance = new Database(dbPath);
    instance.pragma("journal_mode = WAL");
    instance.pragma("foreign_keys = ON");
    instance.pragma("busy_timeout = 5000");
    return instance;
  })();
if (process.env.NODE_ENV !== "production") globalForDb.db = db;

type Primitive = string | number | boolean | undefined | null;

interface QueryResult<T> {
  rows: T[];
  rowCount: number;
}

function hasReturning(sql: string): boolean {
  return /\bRETURNING\b/i.test(sql);
}

function isSelect(sql: string): boolean {
  return /^\s*SELECT\b/i.test(sql);
}

function convertPlaceholders(sql: string): string {
  return sql.replace(/\$\d+/g, "?");
}

function normalizeBooleans(values: Primitive[]): Primitive[] {
  return values.map((v) => {
    if (v === true) return 1;
    if (v === false) return 0;
    return v;
  });
}

function execQuery<T>(
  target: Database.Database,
  queryString: string,
  values: Primitive[],
): QueryResult<T> {
  const sqlStr = convertPlaceholders(queryString);
  const params = normalizeBooleans(values);

  if (isSelect(sqlStr) || hasReturning(sqlStr)) {
    const stmt = target.prepare(sqlStr);
    const rows = stmt.all(...params) as T[];
    return { rows, rowCount: rows.length };
  }

  const stmt = target.prepare(sqlStr);
  const result = stmt.run(...params);
  return { rows: [] as T[], rowCount: result.changes };
}

export async function query<T = Record<string, unknown>>(
  queryString: string,
  values: Primitive[] = [],
): Promise<QueryResult<T>> {
  return execQuery<T>(db, queryString, values);
}

export function sql<T = Record<string, unknown>>(
  strings: TemplateStringsArray,
  ...values: Primitive[]
) {
  let result = strings[0] ?? "";
  for (let i = 1; i < strings.length; i++) {
    result += `?${strings[i] ?? ""}`;
  }
  return query<T>(result, values);
}

export interface TransactionClient {
  query: <T = Record<string, unknown>>(
    queryString: string,
    values?: Primitive[],
  ) => Promise<QueryResult<T>>;
}

export async function withTransaction<T>(
  fn: (client: TransactionClient) => Promise<T>,
): Promise<T> {
  const client: TransactionClient = {
    query: async <R = Record<string, unknown>>(
      queryString: string,
      values: Primitive[] = [],
    ) => execQuery<R>(db, queryString, values),
  };

  db.exec("BEGIN");
  try {
    const result = await fn(client);
    db.exec("COMMIT");
    return result;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
