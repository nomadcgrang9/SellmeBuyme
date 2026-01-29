-- ============================================================================
-- job_postings 테이블의 user_id 외래키 수정
-- 작성일: 2026-01-29
-- 설명: public.users 대신 auth.users를 직접 참조하도록 변경
--       (OAuth 로그인 시 public.users에 레코드가 없어서 insert 실패 문제 해결)
-- ============================================================================

-- 1. 기존 외래키 제약 삭제 (이름 확인 필요 - 기본 이름 사용)
ALTER TABLE public.job_postings
DROP CONSTRAINT IF EXISTS job_postings_user_id_fkey;

-- 2. 새로운 외래키 추가 (auth.users 참조)
ALTER TABLE public.job_postings
ADD CONSTRAINT job_postings_user_id_fkey
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
