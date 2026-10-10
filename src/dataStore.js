// 서버가 쓰는 DB 인스턴스 — SUPABASE_DB_URL이 있으면 Postgres(Supabase), 없으면 null(호출부가 기존 Firestore·메모리 경로를 탄다)
import dotenv from "dotenv";
import { createPgPool, createPgStore } from "./pgStore.js";

dotenv.config();

const connectionString = (process.env.SUPABASE_DB_URL || "").trim();

export const pgStore = connectionString ? createPgStore(createPgPool(connectionString)) : null;

console.log(`[Data Store] ${pgStore ? "postgres (Supabase)" : "firestore / memory"}`);
