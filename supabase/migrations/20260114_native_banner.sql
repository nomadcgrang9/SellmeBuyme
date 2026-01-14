-- 1. 네이티브 배너 설정 테이블
CREATE TABLE IF NOT EXISTS public.native_banner_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    is_active BOOLEAN DEFAULT true,
    insertion_interval INTEGER CHECK (insertion_interval >= 1) DEFAULT 5,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 초기 설정값 주입 (없으면 생성)
INSERT INTO public.native_banner_config (is_active, insertion_interval)
SELECT true, 5
WHERE NOT EXISTS (SELECT 1 FROM public.native_banner_config);

-- 2. 네이티브 배너 목록 테이블
CREATE TABLE IF NOT EXISTS public.native_banners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    image_url TEXT NOT NULL,
    link_url TEXT,
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS 설정 (Row Level Security)
-- 테이블 RLS 활성화
ALTER TABLE public.native_banner_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_banners ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제 (중복 방지)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.native_banner_config;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.native_banner_config;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.native_banners;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON public.native_banners;

-- 정책 생성: 읽기는 누구나 가능
CREATE POLICY "Enable read access for all users" ON public.native_banner_config FOR SELECT USING (true);
CREATE POLICY "Enable read access for all users" ON public.native_banners FOR SELECT USING (true);

-- 정책 생성: 쓰기는 인증된 사용자만 가능 (관리자만 허용하려면 추가 조건 필요)
CREATE POLICY "Enable all access for authenticated users" ON public.native_banner_config FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all access for authenticated users" ON public.native_banners FOR ALL USING (auth.role() = 'authenticated');

-- 4. Storage 버킷 설정 (native-banners)
-- 버킷 생성 (이미 존재하면 건너뜀)
INSERT INTO storage.buckets (id, name, public)
VALUES ('native-banners', 'native-banners', true)
ON CONFLICT (id) DO NOTHING;

-- Storage 정책 (기존 정책 삭제 후 재생성)
DROP POLICY IF EXISTS "Give accessibility to public for native-banners" ON storage.objects;
DROP POLICY IF EXISTS "Enable upload for authenticated users for native-banners" ON storage.objects;
DROP POLICY IF EXISTS "Enable update for authenticated users for native-banners" ON storage.objects;
DROP POLICY IF EXISTS "Enable delete for authenticated users for native-banners" ON storage.objects;

-- 정책 생성
CREATE POLICY "Give accessibility to public for native-banners" ON storage.objects FOR SELECT USING (bucket_id = 'native-banners');
CREATE POLICY "Enable upload for authenticated users for native-banners" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'native-banners' AND auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users for native-banners" ON storage.objects FOR UPDATE USING (bucket_id = 'native-banners' AND auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users for native-banners" ON storage.objects FOR DELETE USING (bucket_id = 'native-banners' AND auth.role() = 'authenticated');
