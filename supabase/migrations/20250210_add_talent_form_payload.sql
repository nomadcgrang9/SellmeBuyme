-- Add form_payload to talents to preserve original form structure for editing
ALTER TABLE public.talents
ADD COLUMN IF NOT EXISTS form_payload JSONB;

COMMENT ON COLUMN public.talents.form_payload IS 'Original talent registration form snapshot';

