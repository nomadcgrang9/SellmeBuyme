// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅 시스템 Supabase 쿼리 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { supabase } from './client';
import type {
  ChatRoom,
  ChatMessage,
  ChatRoomRow,
  ChatMessageRow,
  CreateChatRoomInput,
  SendMessageInput,
  GetMessagesParams,
  FileUploadResult,
  MAX_FILE_SIZE
} from '@/types/chat';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅방 관련 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 현재 사용자의 채팅방 목록 조회
 * @returns 채팅방 목록 (최신 메시지 순)
 */
export async function getChatRooms(): Promise<{ data: ChatRoom[] | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다') };
    }

    const { data: rooms, error } = await supabase
      .from('chat_rooms')
      .select(`
        *,
        chat_messages!room_id (
          content,
          message_type,
          created_at
        )
      `)
      .or(`participant_1_id.eq.${user.id},participant_2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) throw error;

    // 각 채팅방에 대해 상대방 정보와 참여자 정보 조회
    const enrichedRooms = await Promise.all(
      (rooms || []).map(async (room) => {
        const otherId = room.participant_1_id === user.id
          ? room.participant_2_id
          : room.participant_1_id;

        // 상대방 프로필 조회
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, profile_image_url')
          .eq('user_id', otherId)
          .single();

        // 내 참여자 정보 조회
        const { data: participant } = await supabase
          .from('chat_participants')
          .select('unread_count')
          .eq('room_id', room.id)
          .eq('user_id', user.id)
          .single();

        // 마지막 메시지 (이미 조회됨)
        const lastMessage = (room as any).chat_messages?.[0];

        return {
          ...room,
          other_user_id: otherId,
          other_user_name: profile?.display_name || '사용자',
          other_user_profile_image: profile?.profile_image_url || null,
          last_message_content: lastMessage?.content || null,
          last_message_type: lastMessage?.message_type || null,
          my_unread_count: participant?.unread_count || 0,
        } as ChatRoom;
      })
    );

    return { data: enrichedRooms, error: null };
  } catch (err) {
    console.error('getChatRooms error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * 채팅방 생성 또는 기존 채팅방 반환
 * @param input - 상대방 ID, 컨텍스트 정보
 * @returns 채팅방 ID
 */
export async function createOrGetChatRoom(
  input: CreateChatRoomInput
): Promise<{ data: string | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다') };
    }

    // 유틸리티 함수 호출 (PostgreSQL 함수)
    const { data, error } = await supabase.rpc('get_or_create_chat_room', {
      user1_id: user.id,
      user2_id: input.other_user_id,
      ctx_type: input.context_type || null,
      ctx_card_id: input.context_card_id || null,
    });

    if (error) throw error;

    return { data: data as string, error: null };
  } catch (err) {
    console.error('createOrGetChatRoom error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * 특정 채팅방의 상세 정보 조회
 * @param roomId - 채팅방 ID
 * @returns 채팅방 정보
 */
export async function getChatRoom(
  roomId: string
): Promise<{ data: ChatRoom | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다') };
    }

    const { data: room, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .eq('id', roomId)
      .single();

    if (error) throw error;
    if (!room) return { data: null, error: new Error('채팅방을 찾을 수 없습니다') };

    // 상대방 ID
    const otherId = room.participant_1_id === user.id
      ? room.participant_2_id
      : room.participant_1_id;

    // 상대방 프로필
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, profile_image_url')
      .eq('user_id', otherId)
      .single();

    // 내 참여자 정보
    const { data: participant } = await supabase
      .from('chat_participants')
      .select('unread_count')
      .eq('room_id', room.id)
      .eq('user_id', user.id)
      .single();

    return {
      data: {
        ...room,
        other_user_id: otherId,
        other_user_name: profile?.display_name || '사용자',
        other_user_profile_image: profile?.profile_image_url || null,
        last_message_content: null,
        last_message_type: null,
        my_unread_count: participant?.unread_count || 0,
      } as ChatRoom,
      error: null,
    };
  } catch (err) {
    console.error('getChatRoom error:', err);
    return { data: null, error: err as Error };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 메시지 관련 쿼리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 채팅방의 메시지 목록 조회
 * @param params - 채팅방 ID, 페이지네이션 옵션
 * @returns 메시지 목록 (최신순)
 */
export async function getMessages(
  params: GetMessagesParams
): Promise<{ data: ChatMessage[] | null; error: Error | null }> {
  try {
    const { room_id, limit = 50, offset = 0 } = params;

    const { data: messages, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('room_id', room_id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // 발신자 프로필 정보 조회
    const enrichedMessages = await Promise.all(
      (messages || []).map(async (msg) => {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('display_name, profile_image_url')
          .eq('user_id', msg.sender_id)
          .single();

        let fileMetadata = undefined;
        if (msg.message_type === 'file' && msg.file_url) {
          fileMetadata = {
            url: msg.file_url,
            name: msg.file_name || '파일',
            size: msg.file_size || 0,
            type: msg.file_type || 'application/octet-stream',
            size_formatted: formatFileSize(msg.file_size || 0),
          };
        }

        return {
          ...msg,
          sender_name: profile?.display_name || '사용자',
          sender_profile_image: profile?.profile_image_url || null,
          file_metadata: fileMetadata,
        } as ChatMessage;
      })
    );

    // 오래된 순으로 정렬 (UI에서 최신 메시지가 하단에 표시)
    enrichedMessages.reverse();

    return { data: enrichedMessages, error: null };
  } catch (err) {
    console.error('getMessages error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * 메시지 전송
 * @param input - 채팅방 ID, 메시지 내용, 파일 (선택)
 * @returns 생성된 메시지
 */
export async function sendMessage(
  input: SendMessageInput
): Promise<{ data: ChatMessage | null; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다') };
    }

    let fileUrl: string | null = null;
    let fileName: string | null = null;
    let fileSize: number | null = null;
    let fileType: string | null = null;

    // 파일 업로드 처리
    if (input.file) {
      const uploadResult = await uploadChatFile(input.room_id, input.file);
      if (uploadResult.error) {
        return { data: null, error: uploadResult.error };
      }
      if (uploadResult.data) {
        fileUrl = uploadResult.data.url;
        fileName = uploadResult.data.file_name;
        fileSize = uploadResult.data.file_size;
        fileType = uploadResult.data.file_type;
      }
    }

    // 메시지 INSERT
    const { data: message, error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: input.room_id,
        sender_id: user.id,
        content: input.content || null,
        message_type: input.message_type || (fileUrl ? 'file' : 'text'),
        file_url: fileUrl,
        file_name: fileName,
        file_size: fileSize,
        file_type: fileType,
      })
      .select()
      .single();

    if (error) throw error;

    // 발신자 프로필
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('display_name, profile_image_url')
      .eq('user_id', user.id)
      .single();

    let fileMetadata = undefined;
    if (fileUrl) {
      fileMetadata = {
        url: fileUrl,
        name: fileName || '파일',
        size: fileSize || 0,
        type: fileType || 'application/octet-stream',
        size_formatted: formatFileSize(fileSize || 0),
      };
    }

    return {
      data: {
        ...message,
        sender_name: profile?.display_name || '사용자',
        sender_profile_image: profile?.profile_image_url || null,
        file_metadata: fileMetadata,
      } as ChatMessage,
      error: null,
    };
  } catch (err) {
    console.error('sendMessage error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * 채팅방의 모든 메시지를 읽음 처리
 * @param roomId - 채팅방 ID
 */
export async function markRoomAsRead(
  roomId: string
): Promise<{ error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: new Error('로그인이 필요합니다') };
    }

    // PostgreSQL 함수 호출
    const { error } = await supabase.rpc('mark_room_as_read', {
      p_room_id: roomId,
      p_user_id: user.id,
    });

    if (error) throw error;

    return { error: null };
  } catch (err) {
    console.error('markRoomAsRead error:', err);
    return { error: err as Error };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 파일 업로드 관련
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 채팅 파일 업로드 (Supabase Storage)
 * @param roomId - 채팅방 ID
 * @param file - 파일 객체 (최대 20MB)
 * @returns 업로드된 파일 정보
 */
export async function uploadChatFile(
  roomId: string,
  file: File
): Promise<{ data: FileUploadResult | null; error: Error | null }> {
  try {
    // 파일 크기 검증 (20MB)
    const MAX_SIZE = 20 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      return { data: null, error: new Error('파일 크기는 20MB를 초과할 수 없습니다') };
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: null, error: new Error('로그인이 필요합니다') };
    }

    // 파일명 생성: {roomId}/{timestamp}_{원본파일명}
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const filePath = `${roomId}/${timestamp}_${sanitizedFileName}`;

    // Supabase Storage에 업로드
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) throw error;

    // Public URL 생성
    const { data: urlData } = supabase.storage
      .from('chat-files')
      .getPublicUrl(data.path);

    return {
      data: {
        url: urlData.publicUrl,
        path: data.path,
        file_name: file.name,
        file_size: file.size,
        file_type: file.type,
      },
      error: null,
    };
  } catch (err) {
    console.error('uploadChatFile error:', err);
    return { data: null, error: err as Error };
  }
}

/**
 * 파일 삭제 (Storage)
 * @param filePath - Storage 경로
 */
export async function deleteChatFile(
  filePath: string
): Promise<{ error: Error | null }> {
  try {
    const { error } = await supabase.storage
      .from('chat-files')
      .remove([filePath]);

    if (error) throw error;

    return { error: null };
  } catch (err) {
    console.error('deleteChatFile error:', err);
    return { error: err as Error };
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 유틸리티 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 파일 크기 포맷팅
 * @param bytes - 바이트 단위 크기
 * @returns "1.2 MB" 형식 문자열
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * 전체 읽지 않은 메시지 개수 조회
 * @returns 읽지 않은 메시지 총 개수
 */
export async function getTotalUnreadCount(): Promise<{ data: number; error: Error | null }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { data: 0, error: new Error('로그인이 필요합니다') };
    }

    const { data, error } = await supabase
      .from('chat_participants')
      .select('unread_count')
      .eq('user_id', user.id);

    if (error) throw error;

    const total = (data || []).reduce((sum, p) => sum + (p.unread_count || 0), 0);

    return { data: total, error: null };
  } catch (err) {
    console.error('getTotalUnreadCount error:', err);
    return { data: 0, error: err as Error };
  }
}
