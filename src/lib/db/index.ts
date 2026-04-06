import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;
let _pool: InstanceType<typeof Pool> | null = null;

function getDb() {
  if (_db) return _db;
  const connectionString = process.env.RAILWAY_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("RAILWAY_DATABASE_URL or DATABASE_URL must be set.");
  }
  _pool = new Pool({ connectionString });
  _db = drizzle(_pool, { schema });
  return _db;
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export * from "./schema";
