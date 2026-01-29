-- ============================================================================
-- 공고 첨부파일 스토리지 버킷 설정
-- 작성일: 2026-01-29
-- 설명: 직접 공고등록 시 첨부파일 업로드를 위한 Storage 버킷 및 RLS 정책
-- ============================================================================

-- 1. 버킷 생성 (job-attachments)
-- 30MB 제한, PDF/HWP/DOC/XLS/이미지 허용
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-attachments',
  'job-attachments',
  true,  -- 공개 접근 허용 (다운로드)
  31457280,  -- 30MB (30 * 1024 * 1024)
  ARRAY[
    'application/pdf',
    'application/x-hwp',
    'application/vnd.hancom.hwp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'image/gif'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. RLS 정책 - 기존 정책 삭제 후 재생성
-- (정책 이름 충돌 방지를 위해 고유한 이름 사용)

-- 기존 정책 삭제 (있으면) - 이전 버전 이름도 포함
DROP POLICY IF EXISTS "job_attachments_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "job_attachments_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "job_attachments_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "job_attachments_update_policy" ON storage.objects;
-- 이전 실행에서 생성된 정책들
DROP POLICY IF EXISTS "Users can upload to own job attachments folder" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view job attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own job attachments" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own job attachments" ON storage.objects;

-- 업로드: 인증된 사용자만 자신의 폴더에
-- 경로 형식: {user_id}/{posting_id}/{filename}
CREATE POLICY "job_attachments_insert_policy"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'job-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 조회: 모든 사람 가능
CREATE POLICY "job_attachments_select_policy"
ON storage.objects
FOR SELECT
USING (bucket_id = 'job-attachments');

-- 삭제: 본인만
CREATE POLICY "job_attachments_delete_policy"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'job-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 업데이트: 본인만 (파일 덮어쓰기)
CREATE POLICY "job_attachments_update_policy"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'job-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- ============================================================================
-- job_postings 테이블 컬럼 추가 (직접 등록용)
-- ============================================================================

-- 1차 분류 (8개 카테고리)
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS primary_category VARCHAR(50);

-- 2차 분류 (복수 선택)
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS sub_categories TEXT[];

-- 담당자 연락처
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20);

-- 첨부파일 스토리지 경로
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS attachment_bucket_path TEXT;

-- 컬럼 코멘트
COMMENT ON COLUMN job_postings.primary_category IS '1차 분류 (유치원/초등담임/교과과목/비교과/특수교육/방과후돌봄/행정교육지원/기타)';
COMMENT ON COLUMN job_postings.sub_categories IS '2차 분류 (복수 선택 가능)';
COMMENT ON COLUMN job_postings.contact_phone IS '담당자 연락처';
COMMENT ON COLUMN job_postings.attachment_bucket_path IS '첨부파일 Storage 경로';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_job_postings_primary_category
ON job_postings(primary_category);

CREATE INDEX IF NOT EXISTS idx_job_postings_sub_categories
ON job_postings USING GIN(sub_categories);

-- deadline 인덱스 (만료 필터링 성능)
CREATE INDEX IF NOT EXISTS idx_job_postings_deadline
ON job_postings(deadline);

-- source + deadline 복합 인덱스 (직접등록 공고 필터링)
CREATE INDEX IF NOT EXISTS idx_job_postings_source_deadline
ON job_postings(source, deadline)
WHERE source = 'user_posted';
