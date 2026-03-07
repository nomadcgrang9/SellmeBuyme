// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 커뮤니티 쓰레드 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━ 리액션 ━━━

export interface ReactionCounts {
  like: number;
  cheer: number;
  curious: number;
  thanks: number;
}

export type ReactionType = 'like' | 'cheer' | 'curious' | 'thanks';

// ━━━ DB 테이블 Row 타입 ━━━

export interface WagleThreadRow {
  id: string;
  author_id: string;
  content: string;
  hashtags: string[];
  reply_count: number;
  reaction_counts: ReactionCounts;
  is_deleted: boolean;
  is_ai_generated: boolean;
  ai_persona_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WagleReplyRow {
  id: string;
  thread_id: string;
  parent_id: string | null;
  author_id: string;
  content: string;
  depth: 1 | 2 | 3;
  mention_user_id: string | null;
  reaction_counts: ReactionCounts;
  is_deleted: boolean;
  created_at: string;
}

export interface WagleReactionRow {
  id: string;
  user_id: string;
  target_type: 'thread' | 'reply';
  target_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

export interface WagleNotificationRow {
  id: string;
  user_id: string;
  thread_id: string;
  reply_id: string | null;
  actor_id: string;
  type: 'reply' | 'reaction';
  is_read: boolean;
  created_at: string;
}

// ━━━ UI 확장 타입 (프로필 조인) ━━━

export interface WagleThread extends WagleThreadRow {
  author_name: string;
  author_profile_image: string | null;
  my_reaction: ReactionType | null;
}

export interface WagleReply extends WagleReplyRow {
  author_name: string;
  author_profile_image: string | null;
  mention_user_name: string | null;
  my_reaction: ReactionType | null;
  children: WagleReply[];
}

export interface WagleNotification extends WagleNotificationRow {
  actor_name: string;
  actor_profile_image: string | null;
  thread_preview: string;
}

// ━━━ 관리자 AI 관리용 타입 ━━━

export interface AdminAiReplyLog {
  id: string;
  thread_id: string;
  reply_id: string | null;
  persona_id: string;
  classification: 'safe' | 'unsafe' | 'skipped';
  classification_reason: string | null;
  generated_content: string | null;
  gemini_model: string;
  scheduled_at: string | null;
  posted_at: string | null;
  status: 'pending' | 'posted' | 'cancelled' | 'error';
  error_message: string | null;
  created_at: string;
  // JOIN 필드
  persona_name: string;
  thread_preview: string;
}

export interface AdminAiPersona {
  id: string;
  auth_user_id: string;
  display_name: string;
  persona_background: {
    role: string;
    experience_years: number;
    tone: string;
    specialties: string[];
  };
  is_active: boolean;
  last_used_at: string | null;
  total_replies: number;
  created_at: string;
}

export interface WagleAiConfig {
  enabled: boolean;
  max_replies_per_run: number;
  max_replies_per_day: number;
  min_delay_minutes: number;
  max_delay_minutes: number;
  active_hours: { start: number; end: number };
  reply_probability: number;
}
