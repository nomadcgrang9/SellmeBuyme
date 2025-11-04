-- Add DELETE policy for dev_board_submissions
-- Allows anyone to delete board submissions (for testing and development)

DROP POLICY IF EXISTS "Anyone can delete submissions" ON public.dev_board_submissions;

CREATE POLICY "Anyone can delete submissions"
  ON public.dev_board_submissions
  FOR DELETE
  TO public
  USING (true);

-- Comment
COMMENT ON POLICY "Anyone can delete submissions" ON public.dev_board_submissions IS
  '누구나 게시판 제출을 삭제할 수 있습니다 (개발/테스트 환경용)';
