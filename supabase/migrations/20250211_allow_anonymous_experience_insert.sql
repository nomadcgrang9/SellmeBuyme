-- 비인증 사용자도 체험 등록 가능하도록 RLS 정책 수정

-- 기존 정책 삭제
drop policy if exists "Users can insert own experiences" on public.experiences;

-- 새로운 정책: 비인증 사용자도 insert 가능
create policy "Anyone can insert experiences"
  on public.experiences for insert
  with check (
    (auth.uid() is not null and auth.uid() = user_id) or
    (auth.uid() is null and user_id is null)
  );

-- user_id를 nullable로 변경
alter table public.experiences alter column user_id drop not null;
