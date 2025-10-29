-- Job Posting Attachments Storage 버킷 생성
-- RLS 정책은 Supabase 대시보드에서 설정해야 합니다.

-- 1. 버킷 생성 (이미 존재하면 무시)
INSERT INTO storage.buckets (id, name, public)
VALUES ('job-posting-attachments', 'job-posting-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Supabase 대시보드에서 수동으로 설정할 RLS 정책:
-- 
-- 1. Storage > job-posting-attachments 선택
-- 2. Policies 탭 클릭
-- 3. 다음 정책들을 추가:
--
-- 정책 1: 공개 읽기 (모든 사용자가 다운로드 가능)
--   - 이름: Allow public read
--   - 타겟 역할: anon, authenticated
--   - 권한: SELECT
--   - 조건: bucket_id = 'job-posting-attachments'
--
-- 정책 2: 인증된 사용자만 업로드
--   - 이름: Allow authenticated upload
--   - 타겟 역할: authenticated
--   - 권한: INSERT
--   - 조건: bucket_id = 'job-posting-attachments'
--
-- 정책 3: 소유자만 삭제
--   - 이름: Allow owner delete
--   - 타겟 역할: authenticated
--   - 권한: DELETE
--   - 조건: bucket_id = 'job-posting-attachments' AND owner_id = auth.uid()
--
-- 정책 4: 소유자만 수정
--   - 이름: Allow owner update
--   - 타겟 역할: authenticated
--   - 권한: UPDATE
--   - 조건: bucket_id = 'job-posting-attachments' AND owner_id = auth.uid()
