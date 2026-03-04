// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 커뮤니티 쓰레드 Supabase 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { supabase } from './client';
import type {
  WagleThread,
  WagleThreadRow,
  WagleReply,
  WagleReplyRow,
  WagleNotification,
  ReactionType,
} from '@/types/wagle';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 프로필 조회 헬퍼
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface ProfileInfo {
  display_name: string | null;
  profile_image_url: string | null;
}

interface CachedProfile {
  info: ProfileInfo;
  cachedAt: number;
}

const PROFILE_CACHE_TTL = 5 * 60 * 1000; // 5분
const profileCache = new Map<string, CachedProfile>();

function isCacheValid(cached: CachedProfile): boolean {
  return Date.now() - cached.cachedAt < PROFILE_CACHE_TTL;
}

async function getProfileInfo(userId: string): Promise<ProfileInfo> {
  const cached = profileCache.get(userId);
  if (cached && isCacheValid(cached)) return cached.info;

  const { data } = await supabase
    .from('user_profiles')
    .select('display_name, profile_image_url')
    .eq('user_id', userId)
    .single();

  const info: ProfileInfo = {
    display_name: data?.display_name || null,
    profile_image_url: data?.profile_image_url || null,
  };
  profileCache.set(userId, { info, cachedAt: Date.now() });
  return info;
}

async function getProfileInfoBatch(userIds: string[]): Promise<Map<string, ProfileInfo>> {
  const unique = [...new Set(userIds)];
  const missing = unique.filter((id) => {
    const cached = profileCache.get(id);
    return !cached || !isCacheValid(cached);
  });

  if (missing.length > 0) {
    const { data } = await supabase
      .from('user_profiles')
      .select('user_id, display_name, profile_image_url')
      .in('user_id', missing);

    const fetched = new Map((data || []).map((p) => [p.user_id, p]));
    for (const id of missing) {
      const info = fetched.get(id) || { display_name: null, profile_image_url: null };
      profileCache.set(id, { info, cachedAt: Date.now() });
    }
  }

  const result = new Map<string, ProfileInfo>();
  for (const id of unique) {
    result.set(id, profileCache.get(id)!.info);
  }
  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 쓰레드 (원글) 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const THREADS_PER_PAGE = 15;

export async function getThreads(params: {
  cursor?: string;
  hashtag?: string | null;
  limit?: number;
}): Promise<{ data: WagleThread[]; error: Error | null }> {
  try {
    const { cursor, hashtag, limit = THREADS_PER_PAGE } = params;

    let query = supabase
      .from('wagle_threads')
      .select('*')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (cursor) {
      query = query.lt('created_at', cursor);
    }

    if (hashtag) {
      query = query.contains('hashtags', [hashtag]);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return { data: [], error: null };

    // 현재 유저
    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;

    // 프로필 일괄 조회
    const authorIds = rows.map((r: WagleThreadRow) => r.author_id);
    const profiles = await getProfileInfoBatch(authorIds);

    // 내 리액션 일괄 조회
    let myReactions = new Map<string, ReactionType>();
    if (userId) {
      const threadIds = rows.map((r: WagleThreadRow) => r.id);
      const { data: reactions } = await supabase
        .from('wagle_reactions')
        .select('target_id, reaction_type')
        .eq('user_id', userId)
        .eq('target_type', 'thread')
        .in('target_id', threadIds);

      myReactions = new Map(
        (reactions || []).map((r) => [r.target_id, r.reaction_type as ReactionType])
      );
    }

    const threads: WagleThread[] = rows.map((row: WagleThreadRow) => {
      const profile = profiles.get(row.author_id);
      return {
        ...row,
        author_name: profile?.display_name || '알 수 없음',
        author_profile_image: profile?.profile_image_url || null,
        my_reaction: myReactions.get(row.id) || null,
      };
    });

    return { data: threads, error: null };
  } catch (err) {
    console.error('[wagle] getThreads error:', err);
    return { data: [], error: err as Error };
  }
}

export async function getThread(threadId: string): Promise<{ data: WagleThread | null; error: Error | null }> {
  try {
    const { data: row, error } = await supabase
      .from('wagle_threads')
      .select('*')
      .eq('id', threadId)
      .single();

    if (error) throw error;
    if (!row) return { data: null, error: null };

    const profile = await getProfileInfo(row.author_id);

    const { data: { user } } = await supabase.auth.getUser();
    let myReaction: ReactionType | null = null;
    if (user) {
      const { data: reaction } = await supabase
        .from('wagle_reactions')
        .select('reaction_type')
        .eq('user_id', user.id)
        .eq('target_type', 'thread')
        .eq('target_id', threadId)
        .maybeSingle();
      myReaction = (reaction?.reaction_type as ReactionType) || null;
    }

    return {
      data: {
        ...row,
        author_name: profile.display_name || '알 수 없음',
        author_profile_image: profile.profile_image_url || null,
        my_reaction: myReaction,
      },
      error: null,
    };
  } catch (err) {
    console.error('[wagle] getThread error:', err);
    return { data: null, error: err as Error };
  }
}

export async function createThread(params: {
  content: string;
  hashtags: string[];
}): Promise<{ data: WagleThread | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('로그인이 필요합니다') };

    const { data: row, error } = await supabase
      .from('wagle_threads')
      .insert({
        author_id: user.id,
        content: params.content,
        hashtags: params.hashtags,
      })
      .select()
      .single();

    if (error) throw error;

    const profile = await getProfileInfo(user.id);

    return {
      data: {
        ...row,
        author_name: profile.display_name || '알 수 없음',
        author_profile_image: profile.profile_image_url || null,
        my_reaction: null,
      },
      error: null,
    };
  } catch (err) {
    console.error('[wagle] createThread error:', err);
    return { data: null, error: err as Error };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 답글 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getReplies(threadId: string): Promise<{ data: WagleReply[]; error: Error | null }> {
  try {
    const { data: rows, error } = await supabase
      .from('wagle_replies')
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!rows || rows.length === 0) return { data: [], error: null };

    // 프로필 일괄 조회
    const userIds = [
      ...rows.map((r: WagleReplyRow) => r.author_id),
      ...rows.filter((r: WagleReplyRow) => r.mention_user_id).map((r: WagleReplyRow) => r.mention_user_id!),
    ];
    const profiles = await getProfileInfoBatch(userIds);

    // 내 리액션 일괄 조회
    const { data: { user } } = await supabase.auth.getUser();
    let myReactions = new Map<string, ReactionType>();
    if (user) {
      const replyIds = rows.map((r: WagleReplyRow) => r.id);
      const { data: reactions } = await supabase
        .from('wagle_reactions')
        .select('target_id, reaction_type')
        .eq('user_id', user.id)
        .eq('target_type', 'reply')
        .in('target_id', replyIds);

      myReactions = new Map(
        (reactions || []).map((r) => [r.target_id, r.reaction_type as ReactionType])
      );
    }

    // flat → tree 변환
    const flatReplies: WagleReply[] = rows.map((row: WagleReplyRow) => {
      const authorProfile = profiles.get(row.author_id);
      const mentionProfile = row.mention_user_id ? profiles.get(row.mention_user_id) : null;
      return {
        ...row,
        author_name: authorProfile?.display_name || '알 수 없음',
        author_profile_image: authorProfile?.profile_image_url || null,
        mention_user_name: mentionProfile?.display_name || null,
        my_reaction: myReactions.get(row.id) || null,
        children: [],
      };
    });

    // 트리 구성
    const replyMap = new Map<string, WagleReply>();
    const rootReplies: WagleReply[] = [];

    for (const reply of flatReplies) {
      replyMap.set(reply.id, reply);
    }

    for (const reply of flatReplies) {
      if (reply.parent_id && replyMap.has(reply.parent_id)) {
        replyMap.get(reply.parent_id)!.children.push(reply);
      } else {
        rootReplies.push(reply);
      }
    }

    return { data: rootReplies, error: null };
  } catch (err) {
    console.error('[wagle] getReplies error:', err);
    return { data: [], error: err as Error };
  }
}

export async function createReply(params: {
  threadId: string;
  parentId: string | null;
  content: string;
  depth: number;
  mentionUserId?: string;
}): Promise<{ data: WagleReply | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('로그인이 필요합니다') };

    const { data: row, error } = await supabase
      .from('wagle_replies')
      .insert({
        thread_id: params.threadId,
        parent_id: params.parentId,
        author_id: user.id,
        content: params.content,
        depth: Math.min(params.depth, 3),
        mention_user_id: params.mentionUserId || null,
      })
      .select()
      .single();

    if (error) throw error;

    const profile = await getProfileInfo(user.id);

    return {
      data: {
        ...row,
        author_name: profile.display_name || '알 수 없음',
        author_profile_image: profile.profile_image_url || null,
        mention_user_name: null,
        my_reaction: null,
        children: [],
      },
      error: null,
    };
  } catch (err) {
    console.error('[wagle] createReply error:', err);
    return { data: null, error: err as Error };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 리액션 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function toggleReaction(params: {
  targetType: 'thread' | 'reply';
  targetId: string;
  reactionType: ReactionType;
}): Promise<{ action: 'added' | 'removed' | 'changed'; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { action: 'added', error: new Error('로그인이 필요합니다') };

    // 기존 리액션 조회
    const { data: existing } = await supabase
      .from('wagle_reactions')
      .select('id, reaction_type')
      .eq('user_id', user.id)
      .eq('target_type', params.targetType)
      .eq('target_id', params.targetId)
      .maybeSingle();

    if (existing) {
      if (existing.reaction_type === params.reactionType) {
        // 같은 리액션 → 제거 (토글)
        const { error } = await supabase
          .from('wagle_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed', error: null };
      } else {
        // 다른 리액션 → 변경 (삭제 후 삽입)
        await supabase.from('wagle_reactions').delete().eq('id', existing.id);
        const { error } = await supabase
          .from('wagle_reactions')
          .insert({
            user_id: user.id,
            target_type: params.targetType,
            target_id: params.targetId,
            reaction_type: params.reactionType,
          });
        if (error) throw error;
        return { action: 'changed', error: null };
      }
    } else {
      // 새 리액션 추가
      const { error } = await supabase
        .from('wagle_reactions')
        .insert({
          user_id: user.id,
          target_type: params.targetType,
          target_id: params.targetId,
          reaction_type: params.reactionType,
        });
      if (error) throw error;
      return { action: 'added', error: null };
    }
  } catch (err) {
    console.error('[wagle] toggleReaction error:', err);
    return { action: 'added', error: err as Error };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 알림 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export async function getNotifications(): Promise<{ data: WagleNotification[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: new Error('로그인이 필요합니다') };

    const { data: rows, error } = await supabase
      .from('wagle_notifications')
      .select('*, wagle_threads!thread_id(content)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!rows || rows.length === 0) return { data: [], error: null };

    const actorIds = rows.map((r: any) => r.actor_id);
    const profiles = await getProfileInfoBatch(actorIds);

    const notifications: WagleNotification[] = rows.map((row: any) => {
      const profile = profiles.get(row.actor_id);
      return {
        id: row.id,
        user_id: row.user_id,
        thread_id: row.thread_id,
        reply_id: row.reply_id,
        actor_id: row.actor_id,
        type: row.type,
        is_read: row.is_read,
        created_at: row.created_at,
        actor_name: profile?.display_name || '알 수 없음',
        actor_profile_image: profile?.profile_image_url || null,
        thread_preview: row.wagle_threads?.content?.substring(0, 50) || '',
      };
    });

    return { data: notifications, error: null };
  } catch (err) {
    console.error('[wagle] getNotifications error:', err);
    return { data: [], error: err as Error };
  }
}

export async function getUnreadNotificationCount(): Promise<{ data: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: 0, error: null };

    const { count, error } = await supabase
      .from('wagle_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;

    return { data: count || 0, error: null };
  } catch (err) {
    console.error('[wagle] getUnreadNotificationCount error:', err);
    return { data: 0, error: err as Error };
  }
}

export async function markNotificationRead(notificationId: string): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase
      .from('wagle_notifications')
      .update({ is_read: true })
      .eq('id', notificationId);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[wagle] markNotificationRead error:', err);
    return { error: err as Error };
  }
}

export async function markAllNotificationsRead(): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('로그인이 필요합니다') };

    const { error } = await supabase
      .from('wagle_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[wagle] markAllNotificationsRead error:', err);
    return { error: err as Error };
  }
}
