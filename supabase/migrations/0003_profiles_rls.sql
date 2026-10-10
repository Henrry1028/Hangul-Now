-- 프로필은 브라우저가 로그인 토큰으로 직접 읽고 쓴다 (Firestore 규칙 users/{userId} 와 같은 범위).
-- 본인 행만 읽기·만들기·고치기가 가능하고 삭제는 없다. 나머지 테이블은 정책이 없어 서버만 접근한다.
-- auth.uid()를 (select …)로 감싸면 행마다가 아니라 질의당 한 번만 계산된다.

create policy profiles_select_own on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid())::text);

create policy profiles_insert_own on public.profiles
  for insert to authenticated
  with check (user_id = (select auth.uid())::text);

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid())::text)
  with check (user_id = (select auth.uid())::text);
