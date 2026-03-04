-- 전화번호 노출 제어를 위한 컬럼 추가
-- 플랜: docs/260216_구직강사등록_및_로그인회원가입_통합플랜.md

-- teacher_markers 테이블에 전화번호 컬럼 추가
ALTER TABLE teacher_markers
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_public BOOLEAN DEFAULT false;

COMMENT ON COLUMN teacher_markers.phone_number IS '연락처 (선택 입력)';
COMMENT ON COLUMN teacher_markers.phone_public IS '전화번호 공개 허용 여부 - 체크하면 로그인한 사용자에게만 노출';

-- instructor_markers 테이블에 전화번호 컬럼 추가
ALTER TABLE instructor_markers
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(20),
ADD COLUMN IF NOT EXISTS phone_public BOOLEAN DEFAULT false;

COMMENT ON COLUMN instructor_markers.phone_number IS '연락처 (선택 입력)';
COMMENT ON COLUMN instructor_markers.phone_public IS '전화번호 공개 허용 여부 - 체크하면 로그인한 사용자에게만 노출';
