-- Create regions reference table for regional crawl board management
-- Supports hierarchical structure: province > city > district

CREATE TABLE IF NOT EXISTS public.regions (
  code TEXT PRIMARY KEY,                            -- 'KR-41', '4136025'
  name TEXT NOT NULL,                               -- '경기도', '남양주시'
  level TEXT NOT NULL CHECK (level IN ('province', 'city', 'district')),
  parent_code TEXT REFERENCES public.regions(code),
  display_order INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_regions_parent_code ON public.regions(parent_code);
CREATE INDEX IF NOT EXISTS idx_regions_level ON public.regions(level);
CREATE INDEX IF NOT EXISTS idx_regions_display_order ON public.regions(display_order);

-- Comments
COMMENT ON TABLE public.regions IS '크롤링 게시판 지역 관리 참조 테이블 (ISO 3166-2 기반)';
COMMENT ON COLUMN public.regions.code IS '지역 코드 (ISO 3166-2 또는 행정구역 코드)';
COMMENT ON COLUMN public.regions.name IS '지역명 (한글)';
COMMENT ON COLUMN public.regions.level IS '지역 레벨 (province=광역자치단체, city=시군구, district=읍면동)';
COMMENT ON COLUMN public.regions.parent_code IS '상위 지역 코드 (계층 구조)';

-- ============================================================================
-- Initial Data: 17개 광역자치단체 (시도)
-- ============================================================================
INSERT INTO public.regions (code, name, level, parent_code, display_order) VALUES
  ('KR-11', '서울특별시', 'province', NULL, 1),
  ('KR-26', '부산광역시', 'province', NULL, 2),
  ('KR-27', '대구광역시', 'province', NULL, 3),
  ('KR-28', '인천광역시', 'province', NULL, 4),
  ('KR-29', '광주광역시', 'province', NULL, 5),
  ('KR-30', '대전광역시', 'province', NULL, 6),
  ('KR-31', '울산광역시', 'province', NULL, 7),
  ('KR-50', '세종특별자치시', 'province', NULL, 8),
  ('KR-41', '경기도', 'province', NULL, 9),
  ('KR-42', '강원특별자치도', 'province', NULL, 10),
  ('KR-43', '충청북도', 'province', NULL, 11),
  ('KR-44', '충청남도', 'province', NULL, 12),
  ('KR-45', '전북특별자치도', 'province', NULL, 13),
  ('KR-46', '전라남도', 'province', NULL, 14),
  ('KR-47', '경상북도', 'province', NULL, 15),
  ('KR-48', '경상남도', 'province', NULL, 16),
  ('KR-49', '제주특별자치도', 'province', NULL, 17)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- Initial Data: 경기도 주요 시군구
-- ============================================================================
INSERT INTO public.regions (code, name, level, parent_code, display_order) VALUES
  -- 경기도 시 (인구 많은 순서)
  ('4131025', '수원시', 'city', 'KR-41', 1),
  ('4113025', '성남시', 'city', 'KR-41', 2),
  ('4117025', '용인시', 'city', 'KR-41', 3),
  ('4119025', '부천시', 'city', 'KR-41', 4),
  ('4128025', '안산시', 'city', 'KR-41', 5),
  ('4129025', '안양시', 'city', 'KR-41', 6),
  ('4136025', '남양주시', 'city', 'KR-41', 7),
  ('4141025', '화성시', 'city', 'KR-41', 8),
  ('4115025', '평택시', 'city', 'KR-41', 9),
  ('4127025', '의정부시', 'city', 'KR-41', 10),  -- 수정: 4111025 → 4127025
  ('4145025', '시흥시', 'city', 'KR-41', 11),
  ('4121025', '광명시', 'city', 'KR-41', 12),
  ('4146025', '김포시', 'city', 'KR-41', 13),
  ('4122025', '광주시', 'city', 'KR-41', 14),
  ('4148025', '군포시', 'city', 'KR-41', 15),
  ('4150025', '하남시', 'city', 'KR-41', 16),
  ('4125025', '오산시', 'city', 'KR-41', 17),
  ('4137025', '이천시', 'city', 'KR-41', 18),
  ('4143025', '양주시', 'city', 'KR-41', 19),
  ('4139025', '안성시', 'city', 'KR-41', 20),
  ('4123025', '구리시', 'city', 'KR-41', 21),
  ('4147025', '파주시', 'city', 'KR-41', 22),
  ('4149025', '의왕시', 'city', 'KR-41', 23),
  ('KR-41-170', '여주시', 'city', 'KR-41', 24),
  ('4135025', '동두천시', 'city', 'KR-41', 25),
  ('4180025', '양평군', 'city', 'KR-41', 26),
  ('4157025', '포천시', 'city', 'KR-41', 27),
  ('4183025', '가평군', 'city', 'KR-41', 28),
  ('4167025', '연천군', 'city', 'KR-41', 29)
ON CONFLICT (code) DO NOTHING;

-- ============================================================================
-- RLS Policies (읽기 전용, 공개)
-- ============================================================================
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view regions" ON public.regions;
CREATE POLICY "Anyone can view regions"
  ON public.regions FOR SELECT
  TO public
  USING (true);
