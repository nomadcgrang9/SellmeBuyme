// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1:1 채팅 Supabase 쿼리 레이어
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { supabase } from './client';
import type {
  ChatRoomRow,
  ChatMessageRow,
  ChatRoom,
  ChatMessage,
  CreateChatRoomInput,
  SendMessageInput,
  GetMessagesParams,
  MessageType,
} from '@/types/chat';

// ━━━ 프로필 캐시 (와글와글과 동일 패턴, 독립 인스턴스) ━━━

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

// ━━━ 채팅방 쿼리 ━━━

const MESSAGES_PER_PAGE = 50;

export async function getChatRooms(): Promise<{ data: ChatRoom[]; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: [], error: new Error('로그인이 필요합니다') };

    // 내가 참여한 방 조회
    const { data: participants, error: pErr } = await supabase
      .from('chat_participants')
      .select('room_id, unread_count')
      .eq('user_id', user.id);

    if (pErr) throw pErr;
    if (!participants || participants.length === 0) return { data: [], error: null };

    const roomIds = participants.map((p) => p.room_id);
    const unreadMap = new Map(participants.map((p) => [p.room_id, p.unread_count || 0]));

    const { data: rooms, error: rErr } = await supabase
      .from('chat_rooms')
      .select('*')
      .in('id', roomIds)
      .eq('is_archived', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (rErr) throw rErr;
    if (!rooms || rooms.length === 0) return { data: [], error: null };

    // 상대방 프로필 일괄 조회
    const otherUserIds = rooms.map((r: ChatRoomRow) =>
      r.participant_1_id === user.id ? r.participant_2_id : r.participant_1_id
    );
    const profiles = await getProfileInfoBatch(otherUserIds);

    const chatRooms: ChatRoom[] = rooms.map((r: ChatRoomRow) => {
      const otherUserId = r.participant_1_id === user.id ? r.participant_2_id : r.participant_1_id;
      const profile = profiles.get(otherUserId);
      return {
        ...r,
        other_user_id: otherUserId,
        other_user_name: profile?.display_name || '알 수 없음',
        other_user_profile_image: profile?.profile_image_url || null,
        unread_count: unreadMap.get(r.id) || 0,
      };
    });

    return { data: chatRooms, error: null };
  } catch (err) {
    console.error('[chat] getChatRooms error:', err);
    return { data: [], error: err as Error };
  }
}

export async function createOrGetChatRoom(
  input: CreateChatRoomInput
): Promise<{ data: ChatRoom | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('로그인이 필요합니다') };

    const { data, error } = await supabase.rpc('get_or_create_chat_room', {
      user1_id: user.id,
      user2_id: input.targetUserId,
      ctx_type: input.contextType || null,
      ctx_card_id: input.contextCardId || null,
    });

    if (error) throw error;

    const roomId = data as string;

    // 방 정보 조회
    const { data: room, error: rErr } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (rErr) throw rErr;

    const otherUserId = room.participant_1_id === user.id
      ? room.participant_2_id
      : room.participant_1_id;

    const profiles = await getProfileInfoBatch([otherUserId]);
    const profile = profiles.get(otherUserId);

    // unread_count 조회
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('unread_count')
      .eq('room_id', roomId)
      .eq('user_id', user.id)
      .single();

    return {
      data: {
        ...room,
        other_user_id: otherUserId,
        other_user_name: profile?.display_name || '알 수 없음',
        other_user_profile_image: profile?.profile_image_url || null,
        unread_count: participant?.unread_count || 0,
      },
      error: null,
    };
  } catch (err) {
    console.error('[chat] createOrGetChatRoom error:', err);
    return { data: null, error: err as Error };
  }
}

// ━━━ 메시지 쿼리 ━━━

export async function getMessages(
  params: GetMessagesParams
): Promise<{ data: ChatMessage[]; error: Error | null }> {
  try {
    const { roomId, limit = MESSAGES_PER_PAGE, before } = params;

    let query = supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt('created_at', before);
    }

    const { data: rows, error } = await query;
    if (error) throw error;
    if (!rows || rows.length === 0) return { data: [], error: null };

    // 발신자 프로필 일괄 조회
    const senderIds = rows.map((r: ChatMessageRow) => r.sender_id);
    const profiles = await getProfileInfoBatch(senderIds);

    // reply_to 미리보기 조회
    const replyToIds = rows
      .filter((r: ChatMessageRow) => r.reply_to_id)
      .map((r: ChatMessageRow) => r.reply_to_id!);

    let replyPreviews = new Map<string, string>();
    if (replyToIds.length > 0) {
      const { data: replyRows } = await supabase
        .from('chat_messages')
        .select('id, content, message_type, file_name')
        .in('id', replyToIds);

      replyPreviews = new Map(
        (replyRows || []).map((r) => [
          r.id,
          r.message_type === 'file'
            ? `[파일] ${r.file_name || '첨부파일'}`
            : (r.content?.substring(0, 50) || ''),
        ])
      );
    }

    const messages: ChatMessage[] = rows.map((row: ChatMessageRow) => {
      const profile = profiles.get(row.sender_id);
      return {
        ...row,
        sender_name: profile?.display_name || '알 수 없음',
        sender_profile_image: profile?.profile_image_url || null,
        reply_to_preview: row.reply_to_id ? (replyPreviews.get(row.reply_to_id) || null) : null,
      };
    });

    // 시간순 정렬 (오래된 것 먼저)
    messages.reverse();

    return { data: messages, error: null };
  } catch (err) {
    console.error('[chat] getMessages error:', err);
    return { data: [], error: err as Error };
  }
}

export async function getMessagesSince(
  roomId: string,
  since: string
): Promise<{ data: ChatMessage[]; error: Error | null }> {
  try {
    const { data: rows, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', roomId)
      .gt('created_at', since)
      .order('created_at', { ascending: true });

    if (error) throw error;
    if (!rows || rows.length === 0) return { data: [], error: null };

    const senderIds = rows.map((r: ChatMessageRow) => r.sender_id);
    const profiles = await getProfileInfoBatch(senderIds);

    const messages: ChatMessage[] = rows.map((row: ChatMessageRow) => {
      const profile = profiles.get(row.sender_id);
      return {
        ...row,
        sender_name: profile?.display_name || '알 수 없음',
        sender_profile_image: profile?.profile_image_url || null,
        reply_to_preview: null,
      };
    });

    return { data: messages, error: null };
  } catch (err) {
    console.error('[chat] getMessagesSince error:', err);
    return { data: [], error: err as Error };
  }
}

// ━━━ 메시지 전송 ━━━

export async function sendMessage(
  input: SendMessageInput
): Promise<{ data: ChatMessage | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: new Error('로그인이 필요합니다') };

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;
    let messageType: MessageType = input.messageType || 'text';

    // 파일 업로드
    if (input.file) {
      const uploaded = await uploadChatFile(input.roomId, input.file);
      if (uploaded.error) throw uploaded.error;
      fileUrl = uploaded.url;
      fileName = input.file.name;
      fileSize = input.file.size;
      fileType = input.file.type;
      messageType = 'file';
    }

    const { data: row, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: input.roomId,
        sender_id: user.id,
        content: input.content || null,
        message_type: messageType,
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
        reply_to_id: input.replyToId || null,
      })
      .select()
      .single();

    if (error) throw error;

    const profiles = await getProfileInfoBatch([user.id]);
    const profile = profiles.get(user.id);

    return {
      data: {
        ...row,
        sender_name: profile?.display_name || '알 수 없음',
        sender_profile_image: profile?.profile_image_url || null,
        reply_to_preview: null,
      },
      error: null,
    };
  } catch (err) {
    console.error('[chat] sendMessage error:', err);
    return { data: null, error: err as Error };
  }
}

// ━━━ 읽음 처리 ━━━

export async function markRoomAsRead(roomId: string): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: new Error('로그인이 필요합니다') };

    const { error } = await supabase.rpc('mark_room_as_read', {
      p_room_id: roomId,
      p_user_id: user.id,
    });

    if (error) throw error;
    return { error: null };
  } catch (err) {
    console.error('[chat] markRoomAsRead error:', err);
    return { error: err as Error };
  }
}

// ━━━ 파일 업로드 ━━━

async function uploadChatFile(
  roomId: string,
  file: File
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `${roomId}/${crypto.randomUUID()}.${ext}`;

    const { error } = await supabase.storage
      .from('chat-files')
      .upload(path, file, { contentType: file.type });

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from('chat-files')
      .getPublicUrl(path);

    return { url: publicUrl, error: null };
  } catch (err) {
    console.error('[chat] uploadChatFile error:', err);
    return { url: null, error: err as Error };
  }
}

// ━━━ 총 안읽은 수 ━━━

export async function getTotalUnreadCount(): Promise<{ data: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: 0, error: null };

    const { data, error } = await supabase
      .from('chat_participants')
      .select('unread_count')
      .eq('user_id', user.id);

    if (error) throw error;

    const total = (data || []).reduce((sum, p) => sum + (p.unread_count || 0), 0);
    return { data: total, error: null };
  } catch (err) {
    console.error('[chat] getTotalUnreadCount error:', err);
    return { data: 0, error: err as Error };
  }
}

// ━━━ 사용자 검색 (새 채팅 시작용) ━━━

export interface ChatSearchResult {
  user_id: string;
  display_name: string;
  profile_image_url: string | null;
  source: 'profile' | 'teacher' | 'instructor' | 'talent';
  subtitle?: string;
}

export async function searchUsers(
  query: string
): Promise<{ data: ChatSearchResult[]; error: Error | null }> {
  try {
    if (!query.trim()) return { data: [], error: null };

    // 4개 테이블 병렬 검색 (개별 .ilike → URL 인코딩 안전)
    const [profileRes, teacherRes, instructorRes, talentRes] = await Promise.allSettled([
      // 1) user_profiles
      supabase.from('user_profiles')
        .select('user_id, display_name, profile_image_url')
        .ilike('display_name', `%${query}%`)
        .limit(10),
      // 2) teacher_markers (구직교사)
      supabase.from('teacher_markers')
        .select('user_id, nickname, profile_image_url, sub_categories')
        .eq('is_active', true)
        .ilike('nickname', `%${query}%`)
        .limit(10),
      // 3) instructor_markers (연수강사)
      supabase.from('instructor_markers')
        .select('user_id, display_name, profile_image_url, specialties')
        .eq('is_active', true)
        .ilike('display_name', `%${query}%`)
        .limit(10),
      // 4) talents (인력풀, 계정 연결된 것만)
      supabase.from('talents')
        .select('user_id, name, specialty')
        .not('user_id', 'is', null)
        .ilike('name', `%${query}%`)
        .limit(10),
    ]);

    const results: ChatSearchResult[] = [];
    const seenUserIds = new Set<string>();

    // 안전하게 데이터 추출하는 헬퍼
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = (res: PromiseSettledResult<any>): any[] =>
      res.status === 'fulfilled' && !res.value.error ? (res.value.data || []) : [];

    // 1) 프로필
    for (const p of rows(profileRes)) {
      if (seenUserIds.has(p.user_id)) continue;
      seenUserIds.add(p.user_id);
      results.push({
        user_id: p.user_id,
        display_name: p.display_name || '이름 없음',
        profile_image_url: p.profile_image_url,
        source: 'profile',
      });
    }

    // 2) 구직교사
    for (const t of rows(teacherRes)) {
      if (seenUserIds.has(t.user_id)) continue;
      seenUserIds.add(t.user_id);
      results.push({
        user_id: t.user_id,
        display_name: t.nickname || '이름 없음',
        profile_image_url: t.profile_image_url,
        source: 'teacher',
        subtitle: t.sub_categories?.join(', ') || undefined,
      });
    }

    // 3) 연수강사
    for (const i of rows(instructorRes)) {
      if (seenUserIds.has(i.user_id)) continue;
      seenUserIds.add(i.user_id);
      results.push({
        user_id: i.user_id,
        display_name: i.display_name || '이름 없음',
        profile_image_url: i.profile_image_url,
        source: 'instructor',
        subtitle: i.specialties?.join(', ') || undefined,
      });
    }

    // 4) 인력풀
    for (const t of rows(talentRes)) {
      if (!t.user_id || seenUserIds.has(t.user_id)) continue;
      seenUserIds.add(t.user_id);
      results.push({
        user_id: t.user_id,
        display_name: t.name || '이름 없음',
        profile_image_url: null,
        source: 'talent',
        subtitle: t.specialty || undefined,
      });
    }

    return { data: results.slice(0, 10), error: null };
  } catch (err) {
    console.error('[chat] searchUsers error:', err);
    return { data: [], error: err as Error };
  }
}

// ━━━ 유틸 ━━━

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
