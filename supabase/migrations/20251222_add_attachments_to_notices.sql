-- 공지사항 테이블에 첨부파일 컬럼 추가
-- 2024-12-22

-- attachments 컬럼 추가 (TEXT 배열, nullable, 기본값 빈 배열)
ALTER TABLE dev_notices
ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';

-- 기존 데이터에 빈 배열 설정 (NULL인 경우)
UPDATE dev_notices
SET attachments = '{}'
WHERE attachments IS NULL;

-- 인덱스 추가 (첨부파일 있는 공지 필터링용, 선택적)
-- CREATE INDEX IF NOT EXISTS idx_dev_notices_has_attachments
-- ON dev_notices ((COALESCE(array_length(attachments, 1), 0) > 0));

COMMENT ON COLUMN dev_notices.attachments IS '첨부파일 URL 배열 (Supabase Storage)';
