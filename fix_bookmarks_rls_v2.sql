-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- bookmarks 테이블 RLS 완전 비활성화 및 모든 정책 제거
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. RLS 비활성화
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;

-- 2. 모든 가능한 정책 삭제
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON bookmarks;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON bookmarks;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON bookmarks;
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Authenticated users can add bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can read their own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can manage own bookmarks" ON bookmarks;

-- 3. 확인
SELECT
  schemaname,
  tablename,
  policyname
FROM pg_policies
WHERE tablename = 'bookmarks';
