-- Extend talents with contact/profile fields
ALTER TABLE public.talents
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS license TEXT,
  ADD COLUMN IF NOT EXISTS introduction TEXT;

COMMENT ON COLUMN public.talents.phone IS 'Contact phone of the talent (may be private per app policy)';
COMMENT ON COLUMN public.talents.email IS 'Contact email of the talent';
COMMENT ON COLUMN public.talents.license IS 'License/certificate summary';
COMMENT ON COLUMN public.talents.introduction IS 'Self introduction';

