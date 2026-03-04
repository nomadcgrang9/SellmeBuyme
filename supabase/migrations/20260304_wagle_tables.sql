-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 와글와글 (Wagle) 커뮤니티 쓰레드 시스템
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ━━━ 1. wagle_threads (원글) ━━━
CREATE TABLE IF NOT EXISTS wagle_threads (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL,
  hashtags      TEXT[] DEFAULT '{}',
  reply_count   INTEGER DEFAULT 0,
  reaction_counts JSONB DEFAULT '{"like":0,"cheer":0,"curious":0,"thanks":0}',
  is_deleted    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wagle_threads_created ON wagle_threads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wagle_threads_author ON wagle_threads(author_id);
CREATE INDEX IF NOT EXISTS idx_wagle_threads_hashtags ON wagle_threads USING GIN(hashtags);

-- ━━━ 2. wagle_replies (댓글/대댓글) ━━━
CREATE TABLE IF NOT EXISTS wagle_replies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id       UUID NOT NULL REFERENCES wagle_threads(id) ON DELETE CASCADE,
  parent_id       UUID REFERENCES wagle_replies(id) ON DELETE CASCADE,
  author_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content         TEXT NOT NULL,
  depth           SMALLINT NOT NULL DEFAULT 1 CHECK (depth BETWEEN 1 AND 3),
  mention_user_id UUID REFERENCES auth.users(id),
  reaction_counts JSONB DEFAULT '{"like":0,"cheer":0,"curious":0,"thanks":0}',
  is_deleted      BOOLEAN DEFAULT FALSE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wagle_replies_thread ON wagle_replies(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_wagle_replies_parent ON wagle_replies(parent_id);

-- ━━━ 3. wagle_reactions (리액션) ━━━
CREATE TABLE IF NOT EXISTS wagle_reactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type   TEXT NOT NULL CHECK (target_type IN ('thread', 'reply')),
  target_id     UUID NOT NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('like', 'cheer', 'curious', 'thanks')),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, target_type, target_id)
);

CREATE INDEX IF NOT EXISTS idx_wagle_reactions_target ON wagle_reactions(target_type, target_id);

-- ━━━ 4. wagle_notifications (알림) ━━━
CREATE TABLE IF NOT EXISTS wagle_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  thread_id     UUID NOT NULL REFERENCES wagle_threads(id) ON DELETE CASCADE,
  reply_id      UUID REFERENCES wagle_replies(id) ON DELETE CASCADE,
  actor_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN ('reply', 'reaction')),
  is_read       BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wagle_notifications_user ON wagle_notifications(user_id, is_read, created_at DESC);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- RLS 정책
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- wagle_threads
ALTER TABLE wagle_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wagle_threads_select" ON wagle_threads
  FOR SELECT USING (true);

CREATE POLICY "wagle_threads_insert" ON wagle_threads
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "wagle_threads_update" ON wagle_threads
  FOR UPDATE USING (auth.uid() = author_id);

-- wagle_replies
ALTER TABLE wagle_replies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wagle_replies_select" ON wagle_replies
  FOR SELECT USING (true);

CREATE POLICY "wagle_replies_insert" ON wagle_replies
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "wagle_replies_update" ON wagle_replies
  FOR UPDATE USING (auth.uid() = author_id);

-- wagle_reactions
ALTER TABLE wagle_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wagle_reactions_select" ON wagle_reactions
  FOR SELECT USING (true);

CREATE POLICY "wagle_reactions_insert" ON wagle_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "wagle_reactions_delete" ON wagle_reactions
  FOR DELETE USING (auth.uid() = user_id);

-- wagle_notifications
ALTER TABLE wagle_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wagle_notifications_select" ON wagle_notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "wagle_notifications_update" ON wagle_notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 트리거: reaction_counts 자동 업데이트
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION update_wagle_reaction_counts()
RETURNS TRIGGER AS $$
DECLARE
  counts JSONB;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- 삭제된 리액션의 타겟 카운트 재계산
    SELECT jsonb_build_object(
      'like', COALESCE(SUM(CASE WHEN reaction_type = 'like' THEN 1 ELSE 0 END), 0),
      'cheer', COALESCE(SUM(CASE WHEN reaction_type = 'cheer' THEN 1 ELSE 0 END), 0),
      'curious', COALESCE(SUM(CASE WHEN reaction_type = 'curious' THEN 1 ELSE 0 END), 0),
      'thanks', COALESCE(SUM(CASE WHEN reaction_type = 'thanks' THEN 1 ELSE 0 END), 0)
    ) INTO counts
    FROM wagle_reactions
    WHERE target_type = OLD.target_type AND target_id = OLD.target_id;

    IF OLD.target_type = 'thread' THEN
      UPDATE wagle_threads SET reaction_counts = counts WHERE id = OLD.target_id;
    ELSIF OLD.target_type = 'reply' THEN
      UPDATE wagle_replies SET reaction_counts = counts WHERE id = OLD.target_id;
    END IF;

    RETURN OLD;
  ELSE
    -- INSERT 시 카운트 재계산
    SELECT jsonb_build_object(
      'like', COALESCE(SUM(CASE WHEN reaction_type = 'like' THEN 1 ELSE 0 END), 0),
      'cheer', COALESCE(SUM(CASE WHEN reaction_type = 'cheer' THEN 1 ELSE 0 END), 0),
      'curious', COALESCE(SUM(CASE WHEN reaction_type = 'curious' THEN 1 ELSE 0 END), 0),
      'thanks', COALESCE(SUM(CASE WHEN reaction_type = 'thanks' THEN 1 ELSE 0 END), 0)
    ) INTO counts
    FROM wagle_reactions
    WHERE target_type = NEW.target_type AND target_id = NEW.target_id;

    IF NEW.target_type = 'thread' THEN
      UPDATE wagle_threads SET reaction_counts = counts WHERE id = NEW.target_id;
    ELSIF NEW.target_type = 'reply' THEN
      UPDATE wagle_replies SET reaction_counts = counts WHERE id = NEW.target_id;
    END IF;

    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wagle_reaction_counts_insert
  AFTER INSERT ON wagle_reactions
  FOR EACH ROW EXECUTE FUNCTION update_wagle_reaction_counts();

CREATE TRIGGER trg_wagle_reaction_counts_delete
  AFTER DELETE ON wagle_reactions
  FOR EACH ROW EXECUTE FUNCTION update_wagle_reaction_counts();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 트리거: reply_count 자동 업데이트
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION update_wagle_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE wagle_threads
    SET reply_count = (
      SELECT COUNT(*) FROM wagle_replies
      WHERE thread_id = NEW.thread_id AND is_deleted = FALSE
    )
    WHERE id = NEW.thread_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE wagle_threads
    SET reply_count = (
      SELECT COUNT(*) FROM wagle_replies
      WHERE thread_id = OLD.thread_id AND is_deleted = FALSE
    )
    WHERE id = OLD.thread_id;
    RETURN OLD;
  ELSIF TG_OP = 'UPDATE' AND OLD.is_deleted != NEW.is_deleted THEN
    UPDATE wagle_threads
    SET reply_count = (
      SELECT COUNT(*) FROM wagle_replies
      WHERE thread_id = NEW.thread_id AND is_deleted = FALSE
    )
    WHERE id = NEW.thread_id;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wagle_reply_count
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON wagle_replies
  FOR EACH ROW EXECUTE FUNCTION update_wagle_reply_count();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 트리거: 답글/리액션 알림 자동 생성
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION create_wagle_reply_notification()
RETURNS TRIGGER AS $$
DECLARE
  thread_author_id UUID;
  parent_author_id UUID;
BEGIN
  -- 쓰레드 작성자에게 알림
  SELECT author_id INTO thread_author_id
  FROM wagle_threads WHERE id = NEW.thread_id;

  IF thread_author_id IS NOT NULL AND thread_author_id != NEW.author_id THEN
    INSERT INTO wagle_notifications (user_id, thread_id, reply_id, actor_id, type)
    VALUES (thread_author_id, NEW.thread_id, NEW.id, NEW.author_id, 'reply');
  END IF;

  -- 부모 댓글 작성자에게 알림
  IF NEW.parent_id IS NOT NULL THEN
    SELECT author_id INTO parent_author_id
    FROM wagle_replies WHERE id = NEW.parent_id;

    IF parent_author_id IS NOT NULL
       AND parent_author_id != NEW.author_id
       AND parent_author_id != thread_author_id THEN
      INSERT INTO wagle_notifications (user_id, thread_id, reply_id, actor_id, type)
      VALUES (parent_author_id, NEW.thread_id, NEW.id, NEW.author_id, 'reply');
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_wagle_reply_notification
  AFTER INSERT ON wagle_replies
  FOR EACH ROW EXECUTE FUNCTION create_wagle_reply_notification();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- updated_at 자동 갱신
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE OR REPLACE FUNCTION update_wagle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_wagle_threads_updated_at
  BEFORE UPDATE ON wagle_threads
  FOR EACH ROW EXECUTE FUNCTION update_wagle_updated_at();

-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Realtime 활성화
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER PUBLICATION supabase_realtime ADD TABLE wagle_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE wagle_replies;
ALTER PUBLICATION supabase_realtime ADD TABLE wagle_notifications;
