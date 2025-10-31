-- 공고 테이블에 필드 추가
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS job_type TEXT, -- 'teacher', 'contract_teacher', 'after_school'
ADD COLUMN IF NOT EXISTS detail_content TEXT, -- 상세 본문
ADD COLUMN IF NOT EXISTS attachment_url TEXT, -- HWP 파일 링크
ADD COLUMN IF NOT EXISTS source_url TEXT;
-- 원본 공고 URL

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_job_postings_job_type ON public.job_postings(job_type);
CREATE INDEX IF NOT EXISTS idx_job_postings_source_url ON public.job_postings(source_url);
