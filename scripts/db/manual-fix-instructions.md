# RLS 정책 수동 수정 가이드

## 문제 상황
`chat_participants` 테이블의 RLS INSERT 정책이 `WITH CHECK (false)`로 설정되어 있어, SECURITY DEFINER 함수조차도 INSERT를 할 수 없는 상황입니다.

## 해결 방법

### Supabase Dashboard에서 SQL 실행

1. https://supabase.com/dashboard/project/qpwnsvsiduvvqdijyxio/sql/new 접속
2. 아래 SQL 복사하여 붙여넣기:

```sql
-- 기존 INSERT 정책 삭제
DROP POLICY IF EXISTS "Only functions can create participant info" ON chat_participants;
DROP POLICY IF EXISTS "Users can create own participant info" ON chat_participants;
```

3. "Run" 버튼 클릭
4. 성공 메시지 확인

## 원리

RLS가 활성화되어 있지만 INSERT 정책이 **아예 없으면**:
- ✅ SECURITY DEFINER 함수: INSERT 가능 (RLS 우회)
- ❌ 일반 사용자: INSERT 불가 (정책 없음 = 거부)

이것이 `WITH CHECK (false)`보다 올바른 접근 방식입니다.

## 검증

정책 삭제 후, 아래 명령어로 확인:

```bash
npx tsx scripts/db/check-chat-state.ts
```

이제 채팅방이 생성되고 메시지가 저장되는지 확인하세요.
