// ============================================================
// Hangul Now Postgres(Supabase) 저장 계층
// - Firestore에 두던 서버 측 데이터(학습 이력, 수업 기록, 튜터 기억, 채팅, 오답 노트, 프로필 조회)를 다룬다.
// - 서버와 DB가 다른 리전에 있을 수 있어 질의 왕복이 비싸다. 동작 하나를 되도록 질의 한 번으로 끝낸다.
// - 세션 상태나 명시적 트랜잭션을 쓰지 않으므로 Session/Transaction 풀러 어느 쪽으로도 동작한다.
// ============================================================

import fs from "node:fs";
import tls from "node:tls";
import pg from "pg";

const MEMORY_UPDATE_ATTEMPTS = 6;

// Supabase DB·풀러 인증서는 자체 인증기관(Supabase Root 2021 CA)으로 서명되어 기본 신뢰 목록에 없다.
// 공식 배포본(대시보드 Database → SSL Configuration의 prod-ca-2021.crt)을 저장소에 두고 신뢰 목록에 더한다.
// 공인 인증기관도 그대로 신뢰해, Supabase가 공인 인증서로 바꾸더라도 접속이 끊기지 않게 한다.
const SUPABASE_ROOT_CA = fs.readFileSync(new URL("../supabase/certs/supabase-root-2021-ca.crt", import.meta.url), "utf8");
const TRUSTED_CAS = [SUPABASE_ROOT_CA, ...tls.rootCertificates];

// 접속 문자열을 항목별로 풀어서 넘긴다 (비밀번호의 기호·퍼센트 인코딩을 pg 해석에 맡기지 않는다)
export function pgPoolConfig(connectionString) {
  const url = new URL(String(connectionString).trim());
  return {
    host: url.hostname,
    port: Number(url.port) || 5432,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)) || "postgres",
    // 서버 인증서의 서명 체인과 호스트 이름을 검증한다 (중간자 공격 방지)
    ssl: { rejectUnauthorized: true, ca: TRUSTED_CAS },
    max: 5,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    // 유휴 연결만 남았을 때는 프로세스 종료를 막지 않는다 (스크립트·테스트가 바로 끝나도록)
    allowExitOnIdle: true
  };
}

export function createPgPool(connectionString) {
  const pool = new pg.Pool(pgPoolConfig(connectionString));
  // 유휴 연결이 끊겨도 프로세스가 죽지 않게 한다 (다음 질의에서 새 연결을 맺는다)
  pool.on("error", (error) => console.warn("[Postgres] 유휴 연결 오류:", error.message));
  return pool;
}

const json = (value) => JSON.stringify(value ?? {});
const finiteOrNull = (value) => (Number.isFinite(Number(value)) && value !== null && value !== "" ? Math.trunc(Number(value)) : null);

export function createPgStore(pool) {
  return {
    /** 학습한 항목 { key: {label, firstAt, lastAt, count} } */
    async getLearned(userId, type) {
      const { rows } = await pool.query("select items from public.learned where user_id = $1 and type = $2", [userId, type]);
      return rows[0]?.items || {};
    },

    async setLearned(userId, type, items, updatedAtMs = Date.now()) {
      await pool.query(
        `insert into public.learned (user_id, type, items, updated_at)
         values ($1, $2, $3::jsonb, to_timestamp($4::double precision / 1000))
         on conflict (user_id, type) do update set items = excluded.items, updated_at = excluded.updated_at`,
        [userId, type, json(items), updatedAtMs]);
    },

    /** 세션 문서에 필드를 덧붙인다 (같은 세션에 복습 노트와 오디오 리뷰가 각각 저장된다) */
    async saveSession(userId, sessionId, fields) {
      await pool.query(
        `insert into public.sessions (user_id, session_id, data, ended_at)
         values ($1, $2, $3::jsonb, $4)
         on conflict (user_id, session_id) do update
           set data = public.sessions.data || excluded.data,
               ended_at = coalesce(excluded.ended_at, public.sessions.ended_at),
               updated_at = now()`,
        [userId, sessionId, json(fields), finiteOrNull(fields?.endedAt)]);
    },

    /** endedAt이 있는 세션(복습 노트)을 최신순으로 */
    async listSessions(userId, limit = 50) {
      const { rows } = await pool.query(
        "select data from public.sessions where user_id = $1 and ended_at is not null order by ended_at desc limit $2",
        [userId, limit]);
      return rows.map((row) => row.data);
    },

    async getTutorMemory(userId) {
      const { rows } = await pool.query("select memory from public.tutor_memory where user_id = $1", [userId]);
      return rows[0]?.memory || {};
    },

    /**
     * 현재 기억에 mergeFn을 적용해 저장한다. 읽은 뒤 다른 갱신이 끼어들었으면 다시 읽어 재시도한다.
     * mergeFn은 여러 번 불릴 수 있으므로 부수 효과가 없어야 한다.
     */
    async updateTutorMemory(userId, mergeFn) {
      for (let attempt = 0; attempt < MEMORY_UPDATE_ATTEMPTS; attempt++) {
        const { rows } = await pool.query("select memory, version from public.tutor_memory where user_id = $1", [userId]);
        const current = rows[0];
        const next = mergeFn(current?.memory || {});
        const written = current
          ? await pool.query(
              "update public.tutor_memory set memory = $2::jsonb, version = version + 1, updated_at = now() where user_id = $1 and version = $3",
              [userId, json(next), current.version])
          : await pool.query(
              "insert into public.tutor_memory (user_id, memory) values ($1, $2::jsonb) on conflict (user_id) do nothing",
              [userId, json(next)]);
        if (written.rowCount === 1) return next;
      }
      throw new Error("튜터 기억 갱신이 계속 충돌했습니다.");
    },

    /** messages: [{ sender: "user" | "tutor", text }] — 넘긴 순서대로 저장한다 */
    async addChatMessages(userId, tutorId, messages) {
      if (!messages?.length) return;
      await pool.query(
        `insert into public.chat_messages (user_id, tutor_id, sender, text)
         select $1, $2, m.sender, m.text
         from unnest($3::text[], $4::text[]) with ordinality as m(sender, text, position)
         order by m.position`,
        [userId, tutorId, messages.map((m) => m.sender), messages.map((m) => m.text)]);
    },

    async addMistakeNote(userId, note) {
      await pool.query(
        `insert into public.mistake_notes (user_id, original, wrong_span, fixed, rule_id, explanation_ko, explanation_en, cefr_level, due_at)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [userId, note.original, note.wrongSpan, note.fixed, note.ruleId, note.explanationKo, note.explanationEn, note.cefrLevel, note.dueAt]);
    },

    /** Supabase Auth에 해당 ID의 계정이 있는지 */
    async authUserExists(userId) {
      const { rows } = await pool.query("select 1 from auth.users where id::text = $1", [String(userId)]);
      return rows.length > 0;
    },

    /**
     * 관리자 대시보드용 계정 목록 — Firebase UserRecord와 같은 필드 형태로 돌려준다.
     * 가입일은 프로필의 created_at을 우선한다 (Firebase에서 옮겨 온 회원의 원래 가입일이 거기 있다).
     */
    async listAuthUsers(limit = 500) {
      const { rows } = await pool.query(
        `select u.id::text as uid, u.email, u.raw_user_meta_data as meta, u.raw_app_meta_data as app,
                coalesce(p.created_at, u.created_at) as created_at, u.last_sign_in_at
         from auth.users u
         left join public.profiles p on p.user_id = u.id::text
         order by u.created_at
         limit $1`,
        [limit]);
      return rows.map((row) => {
        const providers = Array.isArray(row.app?.providers) ? row.app.providers : [row.app?.provider].filter(Boolean);
        return {
          uid: row.uid,
          email: row.email,
          displayName: row.meta?.full_name || row.meta?.name || null,
          photoURL: row.meta?.avatar_url || row.meta?.picture || null,
          metadata: {
            creationTime: row.created_at ? row.created_at.toISOString() : null,
            lastSignInTime: row.last_sign_in_at ? row.last_sign_in_at.toISOString() : null
          },
          // Firebase의 제공자 이름에 맞춘다 (Google 연결이 있으면 Google을 대표로)
          providerData: [{ providerId: providers.includes("google") ? "google.com" : providers.includes("email") ? "password" : (providers[0] || "unknown") }]
        };
      });
    },

    /** 관리자 대시보드용 — user_id → 프로필 (Firestore users 문서와 같은 필드 이름) */
    async listProfiles() {
      const { rows } = await pool.query(
        `select user_id, display_name, photo_url, nickname, nationality, nationality_name, gender, interests,
                selected_tutor_id, level, xp, last_login_at
         from public.profiles`);
      return new Map(rows.map((row) => [row.user_id, {
        displayName: row.display_name,
        photoURL: row.photo_url,
        nickname: row.nickname,
        nationality: row.nationality,
        nationalityName: row.nationality_name,
        gender: row.gender,
        interests: row.interests,
        selectedTutorId: row.selected_tutor_id,
        level: row.level,
        xp: row.xp,
        lastLoginAt: row.last_login_at ? row.last_login_at.getTime() : null
      }]));
    }
  };
}
