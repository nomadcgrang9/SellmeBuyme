-- ============================================================================
-- teacher_markers 테이블 수정 및 RLS 정책 재설정
-- 작성일: 2026-01-29
-- 설명: 403 에러 해결을 위한 테이블 및 RLS 정책 수정
-- ============================================================================

-- 1. teacher_markers 테이블 생성 (존재하지 않는 경우)
CREATE TABLE IF NOT EXISTS teacher_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 위치 정보
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,

  -- 필수 정보
  nickname VARCHAR(50) NOT NULL,
  email VARCHAR(255) NOT NULL,

  -- 선택 정보
  subjects TEXT[],
  other_subject VARCHAR(100),
  school_levels TEXT[],
  experience_years VARCHAR(20),
  available_regions TEXT[],  -- 활동 가능 지역
  introduction TEXT,
  profile_image_url TEXT,

  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. available_regions 컬럼 추가 (누락된 경우)
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS available_regions TEXT[];

-- 3. 인덱스 생성 (존재하지 않는 경우)
CREATE INDEX IF NOT EXISTS idx_teacher_markers_location ON teacher_markers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_teacher_markers_user ON teacher_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_markers_subjects ON teacher_markers USING GIN(subjects);
CREATE INDEX IF NOT EXISTS idx_teacher_markers_active ON teacher_markers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_teacher_markers_regions ON teacher_markers USING GIN(available_regions);

-- 4. RLS 활성화
ALTER TABLE teacher_markers ENABLE ROW LEVEL SECURITY;

-- 5. 기존 RLS 정책 삭제 (존재하는 경우)
DROP POLICY IF EXISTS "teacher_markers_select_active" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_insert_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_update_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_delete_own" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_select_all" ON teacher_markers;
DROP POLICY IF EXISTS "teacher_markers_select_public" ON teacher_markers;

-- 6. 새로운 RLS 정책 생성

-- 누구나 활성 마커 조회 가능 (익명 사용자 포함)
CREATE POLICY "teacher_markers_select_public" ON teacher_markers
  FOR SELECT
  TO public
  USING (is_active = true);

-- 인증된 사용자만 INSERT 가능 (본인 user_id만)
CREATE POLICY "teacher_markers_insert_own" ON teacher_markers
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 본인 마커만 UPDATE 가능
CREATE POLICY "teacher_markers_update_own" ON teacher_markers
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 본인 마커만 DELETE 가능
CREATE POLICY "teacher_markers_delete_own" ON teacher_markers
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 7. updated_at 트리거 (존재하지 않는 경우)
CREATE OR REPLACE FUNCTION update_teacher_marker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS teacher_markers_updated_at ON teacher_markers;
CREATE TRIGGER teacher_markers_updated_at
  BEFORE UPDATE ON teacher_markers
  FOR EACH ROW
  EXECUTE FUNCTION update_teacher_marker_updated_at();

-- 8. 마커 이미지 스토리지 버킷 (존재하지 않는 경우)
INSERT INTO storage.buckets (id, name, public)
VALUES ('markers', 'markers', true)
ON CONFLICT (id) DO NOTHING;

-- 마커 이미지 업로드 정책 (존재하지 않는 경우 생성)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'markers_images_insert_auth'
  ) THEN
    CREATE POLICY "markers_images_insert_auth" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (bucket_id = 'markers');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'markers_images_select_public'
  ) THEN
    CREATE POLICY "markers_images_select_public" ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'markers');
  END IF;
END
$$;
