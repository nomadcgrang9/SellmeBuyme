-- Temporary testing policies for stripe banner tables
-- These should be removed in production

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Admins can manage stripe banner config" ON public.stripe_banner_config;
DROP POLICY IF EXISTS "Admins can manage stripe banners" ON public.stripe_banners;
DROP POLICY IF EXISTS "Admins can manage stripe statistics" ON public.stripe_statistics;
DROP POLICY IF EXISTS "Admins can manage popular keywords" ON public.popular_keywords;

-- Create temporary permissive policies for testing
-- WARNING: These are for development/testing only!

CREATE POLICY "Temporary: Anyone can manage stripe banner config"
ON public.stripe_banner_config FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Temporary: Anyone can manage stripe banners"
ON public.stripe_banners FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Temporary: Anyone can manage stripe statistics"
ON public.stripe_statistics FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Temporary: Anyone can manage popular keywords"
ON public.popular_keywords FOR ALL
USING (true)
WITH CHECK (true);

-- Note: Remember to restore proper admin-only policies before production!
-- You can do this by running the original migration again or creating a new one.