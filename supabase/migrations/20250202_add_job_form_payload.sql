-- Store original user submission payload and attachment path
ALTER TABLE public.job_postings
ADD COLUMN IF NOT EXISTS form_payload JSONB,
ADD COLUMN IF NOT EXISTS attachment_path TEXT;
