CREATE TABLE IF NOT EXISTS public.recommendations_cache (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  cards JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_comment JSONB,
  profile_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  card_source_hash TEXT,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recommendations_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own recommendations"
ON public.recommendations_cache FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recommendations"
ON public.recommendations_cache FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recommendations"
ON public.recommendations_cache FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION update_recommendations_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_recommendations_cache_updated_at
  BEFORE UPDATE ON public.recommendations_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_recommendations_cache_updated_at();
