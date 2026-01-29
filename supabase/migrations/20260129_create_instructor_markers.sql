-- 교원연수 강사등록 테이블 생성
-- 작성일: 2026-01-29

-- ============================================
-- 1. 테이블 생성
-- ============================================
CREATE TABLE IF NOT EXISTS public.instructor_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- 기본 정보 (이메일만, 전화번호 X)
  display_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,

  -- 전문분야 (복수 선택)
  specialties TEXT[] NOT NULL,  -- 20개 중 복수 선택
  custom_specialty TEXT,  -- 기타 직접 입력

  -- 활동 정보
  available_regions TEXT[] NOT NULL,  -- 활동 가능 지역
  experience_years VARCHAR(20),

  -- 연수 대상 (복수 선택): 교원, 학부모, 교직원, 기타
  target_audience TEXT[] NOT NULL,

  -- 상세 정보
  activity_history TEXT,  -- 그동안의 활동내용 (자유양식)
  profile_image_url TEXT,

  -- 메타
  privacy_agreed BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 테이블 코멘트
COMMENT ON TABLE public.instructor_markers IS '교원연수 강사 마커 (성인 대상 연수 전문가)';
COMMENT ON COLUMN public.instructor_markers.specialties IS '전문분야 배열 (20개 중 복수 선택)';
COMMENT ON COLUMN public.instructor_markers.target_audience IS '연수 대상 (교원, 학부모, 교직원, 기타)';
COMMENT ON COLUMN public.instructor_markers.activity_history IS '그동안의 활동내용 (자유양식)';

-- ============================================
-- 2. 인덱스 생성
-- ============================================
CREATE INDEX IF NOT EXISTS idx_instructor_markers_user_id
  ON public.instructor_markers(user_id);

CREATE INDEX IF NOT EXISTS idx_instructor_markers_specialties
  ON public.instructor_markers USING GIN(specialties);

CREATE INDEX IF NOT EXISTS idx_instructor_markers_available_regions
  ON public.instructor_markers USING GIN(available_regions);

CREATE INDEX IF NOT EXISTS idx_instructor_markers_is_active
  ON public.instructor_markers(is_active);

CREATE INDEX IF NOT EXISTS idx_instructor_markers_created_at
  ON public.instructor_markers(created_at DESC);

-- ============================================
-- 3. RLS 활성화
-- ============================================
ALTER TABLE public.instructor_markers ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. RLS 정책 (5개)
-- ============================================

-- 4-1. SELECT: 활성화된 마커는 누구나 조회 가능
CREATE POLICY "instructor_markers_select_active"
ON public.instructor_markers
FOR SELECT
USING (is_active = true);

-- 4-2. SELECT: 본인 데이터는 비활성화여도 조회 가능
CREATE POLICY "instructor_markers_select_own"
ON public.instructor_markers
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 4-3. INSERT: 로그인 사용자만, 본인 user_id로만 삽입
CREATE POLICY "instructor_markers_insert_own"
ON public.instructor_markers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- 4-4. UPDATE: 본인 데이터만 수정 가능
CREATE POLICY "instructor_markers_update_own"
ON public.instructor_markers
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 4-5. DELETE: 본인 데이터만 삭제 가능
CREATE POLICY "instructor_markers_delete_own"
ON public.instructor_markers
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 5. updated_at 자동 갱신 트리거
-- ============================================
CREATE OR REPLACE FUNCTION update_instructor_markers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_instructor_markers_updated_at
  BEFORE UPDATE ON public.instructor_markers
  FOR EACH ROW
  EXECUTE FUNCTION update_instructor_markers_updated_at();
