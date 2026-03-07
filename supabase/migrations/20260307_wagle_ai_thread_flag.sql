-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- wagle_threads에 AI 식별 컬럼 추가
-- AI 생성 글을 일반 사용자 글과 분리 관리하기 위한 FLAG 방식
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE wagle_threads
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_persona_id UUID REFERENCES wagle_ai_personas(id) ON DELETE SET NULL;

-- AI 글 전용 부분 인덱스 (is_ai_generated = true인 행만 인덱싱)
CREATE INDEX IF NOT EXISTS idx_wagle_threads_ai
  ON wagle_threads(is_ai_generated)
  WHERE is_ai_generated = TRUE;

-- 기존 AI 페르소나가 작성한 글 백필 (seed-personas 실행 후에만 유효)
UPDATE wagle_threads t
SET is_ai_generated = TRUE, ai_persona_id = p.id
FROM wagle_ai_personas p
WHERE t.author_id = p.auth_user_id
  AND t.is_ai_generated = FALSE;
