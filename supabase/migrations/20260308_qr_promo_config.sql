-- QR 홍보페이지 설정 테이블
CREATE TABLE IF NOT EXISTS qr_promo_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '학교일자리 한번 등록해보세요',
    body TEXT DEFAULT '',
    image_urls TEXT[] DEFAULT '{}',
    rotation_speed INTEGER NOT NULL DEFAULT 3 CHECK (rotation_speed BETWEEN 1 AND 10),
    is_active BOOLEAN NOT NULL DEFAULT true,
    updated_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 초기 데이터 삽입
INSERT INTO qr_promo_config (title, body, is_active)
VALUES (
    '학교일자리 한번 등록해보세요',
    '방과후, 정규시간 협력수업 등
학생 대상 교육으로 일자리를 구하는 선생님들

에듀테크, 학급세우기 등
교직원, 학부모 대상 연수를 하실 수 있는 정규교원이나 강사 선생님들',
    true
)
ON CONFLICT DO NOTHING;

-- RLS 정책
ALTER TABLE qr_promo_config ENABLE ROW LEVEL SECURITY;

-- 누구나 읽기 가능 (공개 홍보 페이지)
CREATE POLICY "qr_promo_config_public_read"
    ON qr_promo_config FOR SELECT
    USING (true);

-- 인증된 사용자만 수정 가능 (관리자)
CREATE POLICY "qr_promo_config_auth_update"
    ON qr_promo_config FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "qr_promo_config_auth_insert"
    ON qr_promo_config FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Storage bucket (이미 popup-banners 버킷 공유 사용)
-- 별도 버킷이 필요하면 아래 주석 해제
-- INSERT INTO storage.buckets (id, name, public) VALUES ('qr-promo', 'qr-promo', true) ON CONFLICT DO NOTHING;
