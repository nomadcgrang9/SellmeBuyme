-- 북마크 테이블 생성
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL CHECK (card_type IN ('job', 'talent', 'experience')),
  card_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 복합 유니크 제약: 사용자당 카드당 1개만 북마크
  CONSTRAINT bookmarks_user_card_unique UNIQUE(user_id, card_type, card_id)
);

-- 인덱스 생성 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_card_type ON public.bookmarks(card_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.bookmarks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookmarks_composite ON public.bookmarks(user_id, created_at DESC);

-- Row Level Security (RLS) 활성화
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 사용자는 자신의 북마크만 조회 가능
CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- RLS 정책: 인증된 사용자만 북마크 추가 가능
CREATE POLICY "Authenticated users can add bookmarks"
ON public.bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS 정책: 사용자는 자신의 북마크만 삭제 가능
CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks FOR DELETE
USING (auth.uid() = user_id);

-- 코멘트 추가 (문서화)
COMMENT ON TABLE public.bookmarks IS '사용자 북마크(좋아요) 테이블 - 공고/인력/체험 카드를 북마크';
COMMENT ON COLUMN public.bookmarks.card_type IS '카드 타입: job(공고), talent(인력), experience(체험)';
COMMENT ON COLUMN public.bookmarks.card_id IS '북마크된 카드의 ID (job_postings, talents, experiences 테이블 참조)';
