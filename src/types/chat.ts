// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 채팅 시스템 타입 정의
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type MessageType = 'text' | 'system' | 'file';
export type ContextType = 'talent' | 'experience';

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 데이터베이스 테이블 타입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ChatRoomRow {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string | null;

  participant_1_id: string;
  participant_2_id: string;

  context_type: ContextType | null;
  context_card_id: string | null;

  is_archived: boolean;
}

export interface ChatMessageRow {
  id: string;
  created_at: string;

  room_id: string;
  sender_id: string;

  content: string | null;
  message_type: MessageType;

  file_url: string | null;
  file_name: string | null;
  file_size: number | null; // bytes
  file_type: string | null; // MIME type

  is_read: boolean;
  read_at: string | null;
}

export interface ChatParticipantRow {
  id: string;
  room_id: string;
  user_id: string;

  joined_at: string;
  last_read_message_id: string | null;
  last_read_at: string | null;
  unread_count: number;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UI에서 사용할 확장 타입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface ChatRoom extends ChatRoomRow {
  // 상대방 정보 (조인)
  other_user_id: string;
  other_user_name: string;
  other_user_profile_image: string | null;

  // 마지막 메시지 (조인)
  last_message_content: string | null;
  last_message_type: MessageType | null;

  // 내 참여자 정보 (조인)
  my_unread_count: number;
}

export interface ChatMessage extends ChatMessageRow {
  // 발신자 정보 (조인)
  sender_name: string;
  sender_profile_image: string | null;

  // 파일 메타데이터
  file_metadata?: {
    url: string;
    name: string;
    size: number;
    type: string;
    size_formatted: string; // "1.2 MB"
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// API 요청/응답 타입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface CreateChatRoomInput {
  other_user_id: string;
  context_type?: ContextType;
  context_card_id?: string;
}

export interface SendMessageInput {
  room_id: string;
  content?: string;
  message_type?: MessageType;
  file?: File;
}

export interface GetMessagesParams {
  room_id: string;
  limit?: number;
  offset?: number;
  before_message_id?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Realtime 이벤트 타입
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TypingEventPayload {
  room_id: string;
  user_id: string;
  user_name: string;
  is_typing: boolean;
}

export interface PresenceState {
  user_id: string;
  user_name: string;
  online_at: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 파일 업로드 관련
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB in bytes

export interface FileUploadProgress {
  file_name: string;
  loaded: number;
  total: number;
  percentage: number;
}

export interface FileUploadResult {
  url: string;
  path: string;
  file_name: string;
  file_size: number;
  file_type: string;
}
