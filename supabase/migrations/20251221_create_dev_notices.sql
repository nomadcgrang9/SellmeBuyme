-- Create dev_notices table for developer page notice board
-- Migration: 20251221_create_dev_notices.sql

-- Create notice category enum type
DO $$ BEGIN
  CREATE TYPE notice_category AS ENUM ('notice', 'update', 'event', 'important');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create dev_notices table
CREATE TABLE IF NOT EXISTS dev_notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name VARCHAR(100) NOT NULL DEFAULT '관리자',
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category notice_category NOT NULL DEFAULT 'notice',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dev_notices_is_pinned ON dev_notices(is_pinned DESC);
CREATE INDEX IF NOT EXISTS idx_dev_notices_created_at ON dev_notices(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dev_notices_category ON dev_notices(category);

-- Enable Row Level Security
ALTER TABLE dev_notices ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- 1. Anyone can read notices (public read)
CREATE POLICY "dev_notices_public_read"
  ON dev_notices
  FOR SELECT
  USING (true);

-- 2. Anyone can create notices (for dev team collaboration)
CREATE POLICY "dev_notices_public_insert"
  ON dev_notices
  FOR INSERT
  WITH CHECK (true);

-- 3. Anyone can update notices (for dev team collaboration)
CREATE POLICY "dev_notices_public_update"
  ON dev_notices
  FOR UPDATE
  USING (true);

-- 4. Anyone can delete notices (for dev team collaboration)
CREATE POLICY "dev_notices_public_delete"
  ON dev_notices
  FOR DELETE
  USING (true);

-- Add comment for documentation
COMMENT ON TABLE dev_notices IS '개발자노트 공지사항 테이블';
COMMENT ON COLUMN dev_notices.id IS '공지사항 고유 ID';
COMMENT ON COLUMN dev_notices.user_id IS '작성자 사용자 ID (NULL 가능)';
COMMENT ON COLUMN dev_notices.author_name IS '작성자 표시 이름';
COMMENT ON COLUMN dev_notices.title IS '공지사항 제목';
COMMENT ON COLUMN dev_notices.content IS '공지사항 내용';
COMMENT ON COLUMN dev_notices.category IS '공지 카테고리 (notice, update, event, important)';
COMMENT ON COLUMN dev_notices.is_pinned IS '상단 고정 여부';
COMMENT ON COLUMN dev_notices.created_at IS '생성 일시';
COMMENT ON COLUMN dev_notices.updated_at IS '수정 일시';
