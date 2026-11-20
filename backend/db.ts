import "server-only";
import {Pool} from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL 환경변수가 없습니다.");
}

const globalForDb = globalThis as unknown as {
  pgPool?: Pool;
};

function createPool() {
  const pool = new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 5_000,
  });

  pool.on("error", (error) => {
    console.error("PostgreSQL 연결 오류:", error);
  });

  return pool;
}

export const db = globalForDb.pgPool ?? createPool();

if (process.env.NODE_ENV !== "production") {
  globalForDb.pgPool = db;
}
