-- instructor_markers 테이블에 latitude, longitude 컬럼 추가
-- 다른 마커 테이블들과 동일하게 위치 기반 마커로 전환

-- 위도 컬럼 추가
ALTER TABLE public.instructor_markers
ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;

-- 경도 컬럼 추가
ALTER TABLE public.instructor_markers
ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 기존 데이터는 삭제 (lat/lng 없이 생성된 데이터)
-- 사용자가 새로 등록해야 함
DELETE FROM public.instructor_markers WHERE latitude IS NULL;

-- NOT NULL 제약조건 추가
ALTER TABLE public.instructor_markers
ALTER COLUMN latitude SET NOT NULL,
ALTER COLUMN longitude SET NOT NULL;

-- 인덱스 추가 (지도 영역 쿼리 최적화)
CREATE INDEX IF NOT EXISTS idx_instructor_markers_location
ON public.instructor_markers(latitude, longitude);

COMMENT ON COLUMN public.instructor_markers.latitude IS '마커 위도';
COMMENT ON COLUMN public.instructor_markers.longitude IS '마커 경도';
