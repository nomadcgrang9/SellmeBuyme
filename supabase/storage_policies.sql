-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Supabase Storage RLS Policies for chat-files bucket
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- 파일 경로 구조: {room_id}/{filename}
-- 예: "550e8400-e29b-41d4-a716-446655440000/document.pdf"
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. 인증된 사용자는 자신이 참여한 채팅방에 파일 업로드 가능
CREATE POLICY "Users can upload chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id::text = split_part(name, '/', 1)
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- 2. 인증된 사용자는 자신이 참여한 채팅방의 파일 조회 가능
CREATE POLICY "Users can view chat files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-files'
  AND EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id::text = split_part(name, '/', 1)
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);

-- 3. 인증된 사용자는 자신이 업로드한 파일 삭제 가능
CREATE POLICY "Users can delete their chat files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'chat-files'
  AND owner = auth.uid()
  AND EXISTS (
    SELECT 1 FROM chat_rooms
    WHERE id::text = split_part(name, '/', 1)
    AND (participant_1_id = auth.uid() OR participant_2_id = auth.uid())
  )
);
