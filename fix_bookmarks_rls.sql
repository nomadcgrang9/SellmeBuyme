-- bookmarks 테이블 RLS 완전 비활성화
ALTER TABLE bookmarks DISABLE ROW LEVEL SECURITY;

-- 모든 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can insert own bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Authenticated users can add bookmarks" ON bookmarks;
DROP POLICY IF EXISTS "Users can delete own bookmarks" ON bookmarks;
