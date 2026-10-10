// supabase/migrations/*.sql 을 이름순으로 한 번씩만 적용한다.
// 사용: node --env-file=.env scripts/migrate.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPgPool } from "../src/pgStore.js";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "supabase", "migrations");

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error("SUPABASE_DB_URL이 설정되지 않았습니다.");
  process.exit(1);
}

const pool = createPgPool(connectionString);
const client = await pool.connect();
try {
  // 적용 기록은 Data API에 노출되지 않는 별도 스키마에 둔다
  await client.query("create schema if not exists hn_internal");
  await client.query("create table if not exists hn_internal.migrations (name text primary key, applied_at timestamptz not null default now())");
  const applied = new Set((await client.query("select name from hn_internal.migrations")).rows.map((row) => row.name));
  const files = (await fs.readdir(MIGRATIONS_DIR)).filter((name) => name.endsWith(".sql")).sort();

  for (const name of files) {
    if (applied.has(name)) {
      console.log(`건너뜀  ${name} (이미 적용됨)`);
      continue;
    }
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, name), "utf8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into hn_internal.migrations (name) values ($1)", [name]);
      await client.query("commit");
      console.log(`적용    ${name}`);
    } catch (error) {
      await client.query("rollback");
      console.error(`실패    ${name}: ${error.message}`);
      process.exitCode = 1;
      break;
    }
  }
} finally {
  client.release();
  await pool.end();
}
