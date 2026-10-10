-- Hangul Now 초기 스키마 (Firestore → Postgres 전환)
--
-- user_id는 text다: Supabase 사용자 UUID, 전환 전 Firebase uid, 비로그인 게스트 ID("guest-…")를 모두 담는다.
-- 모든 테이블에 RLS를 켜고 정책은 두지 않는다 → 공개 키(Data API)로는 읽기·쓰기가 전부 거부되고,
-- 서버만 DB 접속으로 접근한다. 클라이언트가 직접 읽어야 하는 테이블은 인증 단계에서 정책을 추가한다.

-- 회원 프로필 (Firestore: users/{uid})
create table public.profiles (
  user_id text primary key,
  email text,
  display_name text,
  photo_url text,
  nickname text,
  nationality text,
  nationality_name text,
  native_language text,
  gender text,
  interests jsonb not null default '[]'::jsonb,
  onboarded boolean not null default false,
  selected_tutor_id text,
  level text,
  xp integer,
  onboarded_at timestamptz,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 학습 이력 (Firestore: users/{uid}/learned/{type}) — items: { key: {label, firstAt, lastAt, count} }
create table public.learned (
  user_id text not null,
  type text not null,
  items jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, type)
);

-- 수업·대화 기록 (Firestore: users/{uid}/sessions/{sessionId})
-- 롤플레잉 복습 노트와 튜터 수업 오디오 리뷰가 같은 문서에 필드를 덧붙이므로 data에 병합 저장한다.
-- ended_at(ms)은 목록 정렬용이며, 롤플레잉 복습 노트에만 있다.
create table public.sessions (
  user_id text not null,
  session_id text not null,
  data jsonb not null default '{}'::jsonb,
  ended_at bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, session_id)
);
create index sessions_user_ended_idx on public.sessions (user_id, ended_at desc) where ended_at is not null;

-- 튜터 장기 기억 (Firestore: users/{uid}/meta/memory)
-- version은 동시 갱신이 서로 덮어쓰지 않게 하는 낙관적 잠금용이다 (읽은 버전과 같을 때만 갱신).
create table public.tutor_memory (
  user_id text primary key,
  memory jsonb not null default '{}'::jsonb,
  version integer not null default 0,
  updated_at timestamptz not null default now()
);

-- 튜터 채팅 기록 (Firestore: conversations/{uid}_{tutorId}/messages)
create table public.chat_messages (
  id bigint generated always as identity primary key,
  user_id text not null,
  tutor_id text not null,
  sender text not null check (sender in ('user', 'tutor')),
  text text not null,
  created_at timestamptz not null default now()
);
create index chat_messages_conversation_idx on public.chat_messages (user_id, tutor_id, created_at);

-- 오답 노트 (Firestore: mistake_notes)
create table public.mistake_notes (
  id bigint generated always as identity primary key,
  user_id text not null,
  original text,
  wrong_span text,
  fixed text,
  rule_id text,
  explanation_ko text,
  explanation_en text,
  cefr_level text,
  created_at timestamptz not null default now(),
  due_at timestamptz
);
create index mistake_notes_user_due_idx on public.mistake_notes (user_id, due_at);

alter table public.profiles enable row level security;
alter table public.learned enable row level security;
alter table public.sessions enable row level security;
alter table public.tutor_memory enable row level security;
alter table public.chat_messages enable row level security;
alter table public.mistake_notes enable row level security;
