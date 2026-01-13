-- 히어로 배너 설정 테이블
CREATE TABLE IF NOT EXISTS hero_banner_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  is_active BOOLEAN DEFAULT true,
  rotation_speed INTEGER DEFAULT 5,  -- 초 단위 (3~10)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 히어로 배너 목록 테이블
CREATE TABLE IF NOT EXISTS hero_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(50) NOT NULL,        -- 1줄 권장
  subtitle VARCHAR(50),              -- 2줄 권장
  icon VARCHAR(20),                  -- 아이콘 키
  bg_color VARCHAR(7) DEFAULT '#3B82F6',
  text_color VARCHAR(7) DEFAULT '#FFFFFF',
  link_url TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 데이터 (설정) - 중복 방지
INSERT INTO hero_banner_config (is_active, rotation_speed)
SELECT true, 5
WHERE NOT EXISTS (SELECT 1 FROM hero_banner_config);

-- 초기 데이터 (배너) - 중복 방지
INSERT INTO hero_banners (title, subtitle, display_order, is_active)
SELECT '공고와 선생님을 찾는', '가장 쉬운 방법 - 쌤찾기', 0, true
WHERE NOT EXISTS (SELECT 1 FROM hero_banners);

-- RLS 정책 설정 (선택 사항 - 보안 강화를 위해 필요)
ALTER TABLE hero_banner_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE hero_banners ENABLE ROW LEVEL SECURITY;

-- 읽기는 누구나 가능
CREATE POLICY "Enable read access for all users" ON hero_banner_config FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON hero_banners FOR SELECT USING (true);

-- 쓰기는 관리자만 가능 (관리자 판별 로직은 프로젝트 설정에 따름. 여기서는 예시로 인증된 사용자만 허용하거나 특정 롤 체크 필요)
-- 간단히 인증된 사용자에게 허용 (실제 운영 시에는 admin check 필요)
CREATE POLICY "Enable insert for authenticated users only" ON hero_banner_config FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON hero_banner_config FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users only" ON hero_banners FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable update for authenticated users only" ON hero_banners FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Enable delete for authenticated users only" ON hero_banners FOR DELETE TO authenticated USING (true);
