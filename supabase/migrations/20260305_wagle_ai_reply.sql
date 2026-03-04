-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 와글와글 AI 자동답변 시스템 테이블
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1) AI 페르소나 풀
CREATE TABLE IF NOT EXISTS wagle_ai_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  profile_image_url TEXT,
  persona_background JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMPTZ,
  total_replies INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wagle_ai_personas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only_personas" ON wagle_ai_personas;
CREATE POLICY "admin_only_personas" ON wagle_ai_personas
  FOR ALL USING (is_admin());

-- 2) AI 답변 로그
CREATE TABLE IF NOT EXISTS wagle_ai_reply_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES wagle_threads(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES wagle_replies(id) ON DELETE SET NULL,
  persona_id UUID NOT NULL REFERENCES wagle_ai_personas(id),
  classification TEXT NOT NULL CHECK (classification IN ('safe','unsafe','skipped')),
  classification_reason TEXT,
  generated_content TEXT,
  gemini_model TEXT DEFAULT 'gemini-2.0-flash',
  token_usage JSONB,
  scheduled_at TIMESTAMPTZ,
  posted_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','posted','cancelled','error')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wagle_ai_reply_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only_reply_log" ON wagle_ai_reply_log;
CREATE POLICY "admin_only_reply_log" ON wagle_ai_reply_log
  FOR ALL USING (is_admin());

CREATE INDEX idx_ai_reply_log_thread ON wagle_ai_reply_log(thread_id);
CREATE INDEX idx_ai_reply_log_status ON wagle_ai_reply_log(status);
CREATE INDEX idx_ai_reply_log_scheduled ON wagle_ai_reply_log(scheduled_at)
  WHERE status = 'pending';

-- 3) AI 전역 설정 (킬스위치 등)
CREATE TABLE IF NOT EXISTS wagle_ai_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE wagle_ai_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only_config" ON wagle_ai_config;
CREATE POLICY "admin_only_config" ON wagle_ai_config
  FOR ALL USING (is_admin());

-- 기본 설정 삽입
INSERT INTO wagle_ai_config (key, value) VALUES
  ('enabled', 'true'),
  ('max_replies_per_run', '5'),
  ('max_replies_per_day', '10'),
  ('min_delay_minutes', '30'),
  ('max_delay_minutes', '360'),
  ('active_hours', '{"start": 7, "end": 23}'),
  ('reply_probability', '0.4')
ON CONFLICT (key) DO NOTHING;
