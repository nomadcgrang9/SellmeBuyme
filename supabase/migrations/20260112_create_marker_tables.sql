-- ============================================================================
-- 마커 기반 마켓플레이스 테이블 스키마
-- 작성일: 2026-01-12
-- 설명: 구직 교사 마커, 프로그램 마커, 마커 코멘트 테이블 생성
-- ============================================================================

-- 1. 구직 교사 마커 테이블 (teacher_markers)
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
  introduction TEXT,
  profile_image_url TEXT,
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_teacher_markers_location ON teacher_markers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_teacher_markers_user ON teacher_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_teacher_markers_subjects ON teacher_markers USING GIN(subjects);
CREATE INDEX IF NOT EXISTS idx_teacher_markers_active ON teacher_markers(is_active) WHERE is_active = true;

-- RLS 정책
ALTER TABLE teacher_markers ENABLE ROW LEVEL SECURITY;

-- 누구나 활성 마커 조회 가능
CREATE POLICY "teacher_markers_select_active" ON teacher_markers
  FOR SELECT USING (is_active = true);

-- 본인 마커만 생성 가능
CREATE POLICY "teacher_markers_insert_own" ON teacher_markers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 마커만 수정 가능
CREATE POLICY "teacher_markers_update_own" ON teacher_markers
  FOR UPDATE USING (auth.uid() = user_id);

-- 본인 마커만 삭제 가능
CREATE POLICY "teacher_markers_delete_own" ON teacher_markers
  FOR DELETE USING (auth.uid() = user_id);


-- 2. 프로그램 마커 테이블 (program_markers)
CREATE TABLE IF NOT EXISTS program_markers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- 위치 정보
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  
  -- 필수 정보
  program_title VARCHAR(200) NOT NULL,
  target_grades TEXT[] NOT NULL,
  contact_email VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  
  -- 선택 정보
  contact_phone VARCHAR(20),
  categories TEXT[],
  custom_tags TEXT[],
  price_info VARCHAR(100),
  portfolio_url TEXT,
  image_urls TEXT[],
  
  -- 메타 정보
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_program_markers_location ON program_markers(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_program_markers_user ON program_markers(user_id);
CREATE INDEX IF NOT EXISTS idx_program_markers_categories ON program_markers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_program_markers_active ON program_markers(is_active) WHERE is_active = true;

-- RLS 정책
ALTER TABLE program_markers ENABLE ROW LEVEL SECURITY;

-- 누구나 활성 마커 조회 가능
CREATE POLICY "program_markers_select_active" ON program_markers
  FOR SELECT USING (is_active = true);

-- 본인 마커만 생성 가능
CREATE POLICY "program_markers_insert_own" ON program_markers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 본인 마커만 수정 가능
CREATE POLICY "program_markers_update_own" ON program_markers
  FOR UPDATE USING (auth.uid() = user_id);

-- 본인 마커만 삭제 가능
CREATE POLICY "program_markers_delete_own" ON program_markers
  FOR DELETE USING (auth.uid() = user_id);


-- 3. 마커 코멘트 테이블 (marker_comments)
CREATE TABLE IF NOT EXISTS marker_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 대상 마커 (다형성)
  marker_type VARCHAR(20) NOT NULL CHECK (marker_type IN ('teacher', 'program')),
  marker_id UUID NOT NULL,
  
  -- 작성자 (로그인 불필요하므로 nullable)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(50) DEFAULT '익명',
  
  -- 코멘트 내용
  content TEXT NOT NULL,
  
  -- 메타 정보
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_marker_comments_target ON marker_comments(marker_type, marker_id);
CREATE INDEX IF NOT EXISTS idx_marker_comments_visible ON marker_comments(is_visible) WHERE is_visible = true;

-- RLS 정책
ALTER TABLE marker_comments ENABLE ROW LEVEL SECURITY;

-- 누구나 보이는 코멘트 조회 가능
CREATE POLICY "marker_comments_select_visible" ON marker_comments
  FOR SELECT USING (is_visible = true);

-- 누구나 코멘트 작성 가능 (로그인 불필요)
CREATE POLICY "marker_comments_insert_anyone" ON marker_comments
  FOR INSERT WITH CHECK (true);

-- 본인 코멘트만 수정 가능 (로그인한 경우)
CREATE POLICY "marker_comments_update_own" ON marker_comments
  FOR UPDATE USING (auth.uid() = user_id);

-- 관리자 또는 본인만 삭제 가능
CREATE POLICY "marker_comments_delete_own" ON marker_comments
  FOR DELETE USING (auth.uid() = user_id);


-- 4. job_postings 테이블에 좌표 필드 추가
ALTER TABLE job_postings
ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- 좌표 인덱스
CREATE INDEX IF NOT EXISTS idx_job_postings_location 
ON job_postings(latitude, longitude);


-- 5. 이미지 업로드를 위한 스토리지 버킷 생성 (markers)
INSERT INTO storage.buckets (id, name, public)
VALUES ('markers', 'markers', true)
ON CONFLICT (id) DO NOTHING;

-- 마커 이미지 업로드 정책
CREATE POLICY "markers_images_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'markers' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "markers_images_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'markers');

CREATE POLICY "markers_images_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'markers' AND
    auth.uid() IS NOT NULL
  );


-- 6. updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_marker_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_markers_updated_at
  BEFORE UPDATE ON teacher_markers
  FOR EACH ROW
  EXECUTE FUNCTION update_marker_updated_at();

CREATE TRIGGER program_markers_updated_at
  BEFORE UPDATE ON program_markers
  FOR EACH ROW
  EXECUTE FUNCTION update_marker_updated_at();
