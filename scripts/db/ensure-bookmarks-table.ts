import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function ensureBookmarksTable() {
  console.log('📊 북마크 테이블 확인 및 생성...\n');
  console.log('='.repeat(60));

  try {
    // 1. 북마크 테이블 존재 여부 확인
    console.log('\n📍 Step 1: 북마크 테이블 존재 확인');

    const { data: tables, error: tableError } = await supabase
      .from('bookmarks')
      .select('id')
      .limit(1);

    if (!tableError) {
      console.log('✅ bookmarks 테이블이 이미 존재합니다');
      console.log('\n테이블 구조 확인 중...');

      const { count, error: countError } = await supabase
        .from('bookmarks')
        .select('*', { count: 'exact', head: true });

      if (!countError) {
        console.log(`✅ 현재 ${count}개의 북마크가 있습니다`);
      }

      console.log('\n✅ 북마크 기능이 정상적으로 설정되어 있습니다!');
      return;
    }

    // 2. 테이블이 없으면 생성
    if (tableError.code === 'PGRST116' || tableError.message.includes('does not exist')) {
      console.log('⚠️  bookmarks 테이블이 없습니다. 생성 중...');

      const createTableSQL = `
-- 북마크 테이블 생성
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
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
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookmarks' AND policyname = 'Users can view own bookmarks'
  ) THEN
    CREATE POLICY "Users can view own bookmarks"
    ON public.bookmarks FOR SELECT
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- RLS 정책: 인증된 사용자만 북마크 추가 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookmarks' AND policyname = 'Authenticated users can add bookmarks'
  ) THEN
    CREATE POLICY "Authenticated users can add bookmarks"
    ON public.bookmarks FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- RLS 정책: 사용자는 자신의 북마크만 삭제 가능
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'bookmarks' AND policyname = 'Users can delete own bookmarks'
  ) THEN
    CREATE POLICY "Users can delete own bookmarks"
    ON public.bookmarks FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END $$;

-- 코멘트 추가 (문서화)
COMMENT ON TABLE public.bookmarks IS '사용자 북마크(좋아요) 테이블 - 공고/인력/체험 카드를 북마크';
COMMENT ON COLUMN public.bookmarks.card_type IS '카드 타입: job(공고), talent(인력), experience(체험)';
COMMENT ON COLUMN public.bookmarks.card_id IS '북마크된 카드의 ID (job_postings, talents, experiences 테이블 참조)';
      `;

      console.log('\n다음 SQL을 Supabase SQL Editor에서 실행하세요:');
      console.log('\n' + '='.repeat(60));
      console.log(createTableSQL);
      console.log('='.repeat(60) + '\n');
    } else {
      console.error('❌ 예상치 못한 에러:', tableError);
    }

  } catch (error) {
    console.error('❌ 오류 발생:', error);
  }

  console.log('\n='.repeat(60));
  console.log('\n✅ 완료!');
}

ensureBookmarksTable().catch(console.error);
