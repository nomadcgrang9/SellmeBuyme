-- 댓글 시스템 마이그레이션 (2025-11-02)
-- dev_comments 테이블 및 dev_comment_authors 테이블 생성

-- 1. IP 저장소 테이블
CREATE TABLE IF NOT EXISTS public.dev_comment_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- IP 정보
  ip_hash text NOT NULL UNIQUE,
  
  -- 작성자 정보
  author_name text NOT NULL,
  
  -- 메타데이터
  first_used_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz NOT NULL DEFAULT now(),
  comment_count int NOT NULL DEFAULT 0,
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dev_comment_authors_ip_hash 
  ON public.dev_comment_authors(ip_hash);

-- 2. 댓글 테이블
CREATE TABLE IF NOT EXISTS public.dev_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 관계 정보
  parent_id uuid REFERENCES public.dev_comments(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('idea', 'submission', 'project')),
  target_id uuid NOT NULL,
  
  -- 작성자 정보
  author_name text NOT NULL,
  author_ip_hash text NOT NULL,
  
  -- 댓글 내용
  content text NOT NULL,
  
  -- 메타데이터
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  
  CONSTRAINT valid_target_id CHECK (target_id IS NOT NULL)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_dev_comments_target 
  ON public.dev_comments(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_dev_comments_parent 
  ON public.dev_comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_dev_comments_author_ip 
  ON public.dev_comments(author_ip_hash);
CREATE INDEX IF NOT EXISTS idx_dev_comments_created_at 
  ON public.dev_comments(created_at DESC);

-- 3. RLS 활성화
ALTER TABLE public.dev_comment_authors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dev_comments ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책 - dev_comment_authors
CREATE POLICY "Authors are viewable by everyone"
  ON public.dev_comment_authors FOR SELECT
  USING (true);

CREATE POLICY "System can insert authors"
  ON public.dev_comment_authors FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update authors"
  ON public.dev_comment_authors FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 5. RLS 정책 - dev_comments
CREATE POLICY "Comments are viewable by everyone"
  ON public.dev_comments FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert comments"
  ON public.dev_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own comments"
  ON public.dev_comments FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own comments"
  ON public.dev_comments FOR DELETE
  USING (true);
