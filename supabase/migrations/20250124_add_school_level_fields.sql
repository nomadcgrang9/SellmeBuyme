-- 공고 테이블에 학교급, 과목, 라이센스 필드 추가
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS school_level TEXT, -- '유치원', '초등', '중등', '고등', '특수', NULL
ADD COLUMN IF NOT EXISTS subject TEXT, -- '담임', '과학', '영어', '음악', '체육', '미술', '실과', '국어', '수학', '사회', '도덕', '기술가정', NULL
ADD COLUMN IF NOT EXISTS required_license TEXT;
-- '초등담임', '중등과학', '유치원' 등, NULL

-- 인덱스 추가 (검색 성능 향상)
CREATE INDEX IF NOT EXISTS idx_job_postings_school_level ON public.job_postings(school_level) WHERE school_level IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_subject ON public.job_postings(subject) WHERE subject IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_postings_required_license ON public.job_postings(required_license) WHERE required_license IS NOT NULL;
-- 복합 인덱스 (학교급 + 과목 조합 검색)
CREATE INDEX IF NOT EXISTS idx_job_postings_school_subject ON public.job_postings(school_level, subject) 
WHERE school_level IS NOT NULL AND subject IS NOT NULL;
COMMENT ON COLUMN public.job_postings.school_level IS '학교급: 유치원, 초등, 중등, 고등, 특수';
COMMENT ON COLUMN public.job_postings.subject IS '과목/담당: 담임, 과학, 영어, 음악, 체육, 미술, 실과, 국어, 수학, 사회, 도덕, 기술가정';
COMMENT ON COLUMN public.job_postings.required_license IS '필요 라이센스: 초등담임, 중등과학, 유치원 등';
