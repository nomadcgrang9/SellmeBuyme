-- 랜딩페이지 비회원 인력카드 등록 지원
-- 작성일: 2025-11-05

-- talents 테이블에 비회원 등록 지원 컬럼 추가
ALTER TABLE talents ADD COLUMN IF NOT EXISTS temp_identifier TEXT;
ALTER TABLE talents ADD COLUMN IF NOT EXISTS is_guest_registered BOOLEAN DEFAULT false;
ALTER TABLE talents ADD COLUMN IF NOT EXISTS registered_via TEXT DEFAULT 'form';

-- temp_identifier 인덱스 추가 (비회원 중복 체크용)
CREATE INDEX IF NOT EXISTS idx_talents_temp_identifier ON talents(temp_identifier);

-- 기존 RLS 정책 확인 및 비회원 INSERT 허용 정책 추가
DROP POLICY IF EXISTS "Anyone can insert talents" ON talents;
CREATE POLICY "Anyone can insert talents"
  ON talents FOR INSERT
  WITH CHECK (true);

-- 기존 SELECT 정책 확인 (모든 사용자 조회 가능 유지)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'talents'
    AND policyname = 'Anyone can read talents'
  ) THEN
    CREATE POLICY "Anyone can read talents"
      ON talents FOR SELECT
      USING (true);
  END IF;
END$$;

-- 비회원 등록 데이터 정리를 위한 함수 (선택사항)
-- 30일 이상 지난 비회원 등록 데이터 중 user_id가 null인 경우 삭제
CREATE OR REPLACE FUNCTION cleanup_old_guest_talents()
RETURNS void AS $$
BEGIN
  DELETE FROM talents
  WHERE is_guest_registered = true
    AND user_id IS NULL
    AND created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 정기 정리 작업은 pg_cron 등으로 설정 가능 (선택사항)
-- 예: SELECT cron.schedule('cleanup-guest-talents', '0 3 * * 0', 'SELECT cleanup_old_guest_talents()');

COMMENT ON COLUMN talents.temp_identifier IS '비회원 식별자 (전화번호 해시)';
COMMENT ON COLUMN talents.is_guest_registered IS '비회원 등록 여부';
COMMENT ON COLUMN talents.registered_via IS '등록 경로 (landing, form, etc.)';
