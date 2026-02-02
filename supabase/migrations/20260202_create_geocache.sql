-- Geocache 테이블: 학교/기관명 → 좌표 캐싱
-- 목적: Kakao Places API 호출량 감소

CREATE TABLE IF NOT EXISTS geocache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization VARCHAR(255) NOT NULL UNIQUE,  -- 학교/기관명 (고유)
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  source VARCHAR(50) DEFAULT 'kakao',  -- 출처 (kakao, neis, manual)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스: 학교명 검색 최적화
CREATE INDEX IF NOT EXISTS idx_geocache_organization ON geocache(organization);

-- RLS 활성화
ALTER TABLE geocache ENABLE ROW LEVEL SECURITY;

-- 정책: 누구나 읽기 가능
CREATE POLICY "Anyone can read geocache"
  ON geocache FOR SELECT
  USING (true);

-- 정책: 누구나 삽입 가능 (익명 사용자도 캐시 저장 가능)
CREATE POLICY "Anyone can insert geocache"
  ON geocache FOR INSERT
  WITH CHECK (true);

-- 코멘트
COMMENT ON TABLE geocache IS '학교/기관명 → 좌표 캐싱 테이블 (Kakao API 호출 최소화)';
COMMENT ON COLUMN geocache.organization IS '학교/기관명 (UNIQUE)';
COMMENT ON COLUMN geocache.latitude IS '위도';
COMMENT ON COLUMN geocache.longitude IS '경도';
COMMENT ON COLUMN geocache.source IS '좌표 출처 (kakao, neis, manual)';
