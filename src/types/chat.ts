// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1:1 채팅 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ━━━ DB Row 타입 (Supabase 테이블 직접 대응) ━━━

export type MessageType = 'text' | 'file' | 'system';
export type ContextType = 'talent' | 'experience';

export interface ChatRoomRow {
  id: string;
  participant_1_id: string;
  participant_2_id: string;
  context_type: ContextType | null;
  context_card_id: string | null;
  last_message_at: string | null;
  last_message_preview: string | null;
  last_message_type: MessageType | null;
  is_archived: boolean;
  created_at: string;
}

export interface ChatMessageRow {
  id: string;
  room_id: string;
  sender_id: string;
  content: string | null;
  message_type: MessageType;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  file_type: string | null;
  reply_to_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ChatParticipantRow {
  id: string;
  room_id: string;
  user_id: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
  unread_count: number;
}

export interface ChatNotificationRow {
  id: string;
  user_id: string;
  room_id: string;
  message_id: string | null;
  sender_id: string;
  type: MessageType;
  preview: string | null;
  is_read: boolean;
  created_at: string;
}

// ━━━ UI 확장 타입 (프로필 정보 포함) ━━━

export interface ChatRoom extends ChatRoomRow {
  other_user_id: string;
  other_user_name: string;
  other_user_profile_image: string | null;
  unread_count: number;
}

export interface ChatMessage extends ChatMessageRow {
  sender_name: string;
  sender_profile_image: string | null;
  reply_to_preview: string | null;
}

// ━━━ 입력/요청 타입 ━━━

export interface CreateChatRoomInput {
  targetUserId: string;
  contextType?: ContextType;
  contextCardId?: string;
}

export interface SendMessageInput {
  roomId: string;
  content?: string;
  messageType?: MessageType;
  file?: File;
  replyToId?: string;
}

export interface GetMessagesParams {
  roomId: string;
  limit?: number;
  before?: string;
}

// ━━━ Realtime 이벤트 타입 ━━━

export interface TypingPayload {
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface PresenceState {
  [userId: string]: {
    online_at: string;
    user_id: string;
  }[];
}

// ━━━ 파일 업로드 ━━━

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export interface FileUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'done' | 'error';
}
