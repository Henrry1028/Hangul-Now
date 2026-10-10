-- Firebase 데이터 이전 지원
-- - 회원 ID 대응표: Firebase uid → Supabase 사용자 ID. Data API에 노출되지 않는 hn_internal 스키마에 둔다.
-- - source_id: 이전해 온 채팅·오답 노트의 원본 Firestore 문서 ID. 이전 스크립트를 다시 돌려도 중복되지 않게 한다.
--   (전환 이후 새로 쌓이는 행은 null)

create schema if not exists hn_internal;

create table hn_internal.user_id_map (
  firebase_uid text primary key,
  user_id uuid not null unique,
  migrated_at timestamptz not null default now()
);

alter table public.chat_messages add column source_id text unique;
alter table public.mistake_notes add column source_id text unique;
