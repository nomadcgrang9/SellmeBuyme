-- Fix RLS policies for dev_board_submissions to allow admin approval
-- Problem: Current policy only allows updating when status remains 'pending'
-- Solution: Add separate policy for admins to approve/reject submissions

-- =============================================================================
-- Drop old restrictive UPDATE policy
-- =============================================================================
DROP POLICY IF EXISTS "Anyone can update submissions" ON dev_board_submissions;

-- =============================================================================
-- New policies: Separate regular users and admins
-- =============================================================================

-- 1. Regular users can only update their own pending submissions
CREATE POLICY "Users can update own pending submissions"
  ON dev_board_submissions FOR UPDATE
  TO authenticated
  USING (
    status = 'pending'
    AND (submitter_id = auth.uid() OR submitter_id IS NULL)
  )
  WITH CHECK (
    status = 'pending'
    AND (submitter_id = auth.uid() OR submitter_id IS NULL)
  );

-- 2. Admins can update any submission (including approval/rejection)
-- Note: Requires user_profiles.roles to contain 'admin'
CREATE POLICY "Admins can update any submission"
  ON dev_board_submissions FOR UPDATE
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
COMMENT ON POLICY "Users can update own pending submissions" ON dev_board_submissions
  IS '일반 사용자는 자신의 대기 중인 제출만 수정 가능';

COMMENT ON POLICY "Admins can update any submission" ON dev_board_submissions
  IS '관리자는 모든 제출을 승인/거부할 수 있음 (roles에 admin 포함 필요)';
