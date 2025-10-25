-- 중등 과목 업데이트 마이그레이션
-- 작성일: 2025-01-27
-- 목적: 기존 중등 과목 명칭 변경 및 신규 과목 추가

-- 1. 중등 도덕 → 중등 윤리
UPDATE user_profiles
SET capable_subjects = array_replace(capable_subjects, '중등 도덕', '중등 윤리')
WHERE '중등 도덕' = ANY(capable_subjects);

-- 2. 중등 생활지도 → 중등 상담
UPDATE user_profiles
SET capable_subjects = array_replace(capable_subjects, '중등 생활지도', '중등 상담')
WHERE '중등 생활지도' = ANY(capable_subjects);

-- 3. 중등 과학 선택한 사용자에 대한 처리
-- 주의: 중등 과학은 물리/화학/생물/지구과학으로 세분화되었으나
-- 기존 데이터는 유지하여 사용자가 재선택할 수 있도록 함
-- (자동 변환 안 함 - 사용자 재선택 필요)

COMMENT ON TABLE user_profiles IS '사용자 프로필 테이블 - 2025-01-27 중등 과목 업데이트: 도덕→윤리, 생활지도→상담, 과학 세분화(물리/화학/생물/지구과학), 신규 과목(진로/역사) 추가';
