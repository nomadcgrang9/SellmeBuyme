-- Fix github_deployments INSERT policy
-- Problem: No INSERT policy exists, preventing GitHub Actions from recording deployments
-- Solution: Add INSERT policy for service role

-- =============================================================================
-- Add INSERT policy for github_deployments
-- =============================================================================

-- Service role can insert deployment records (for GitHub Actions)
DROP POLICY IF EXISTS "Service role can insert deployments" ON github_deployments;
CREATE POLICY "Service role can insert deployments"
  ON github_deployments FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Also allow authenticated admins to manually insert if needed
DROP POLICY IF EXISTS "Admins can insert deployments" ON github_deployments;
CREATE POLICY "Admins can insert deployments"
  ON github_deployments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND 'admin' = ANY(user_profiles.roles)
    )
  );

-- =============================================================================
-- Add UPDATE policy (for correcting deployment records)
-- =============================================================================

DROP POLICY IF EXISTS "Service role can update deployments" ON github_deployments;
CREATE POLICY "Service role can update deployments"
  ON github_deployments FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update deployments" ON github_deployments;
CREATE POLICY "Admins can update deployments"
  ON github_deployments FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND 'admin' = ANY(user_profiles.roles)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND 'admin' = ANY(user_profiles.roles)
    )
  );

-- =============================================================================
-- Comments
-- =============================================================================
COMMENT ON POLICY "Service role can insert deployments" ON github_deployments
  IS 'GitHub Actions이 service_role_key로 배포 기록을 삽입할 수 있음';

COMMENT ON POLICY "Admins can insert deployments" ON github_deployments
  IS '관리자는 수동으로 배포 기록을 삽입할 수 있음';

COMMENT ON POLICY "Service role can update deployments" ON github_deployments
  IS 'GitHub Actions이 service_role_key로 배포 기록을 수정할 수 있음';

COMMENT ON POLICY "Admins can update deployments" ON github_deployments
  IS '관리자는 배포 기록을 수정할 수 있음';
