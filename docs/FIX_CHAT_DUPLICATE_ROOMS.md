# 🔧 채팅방 중복 생성 문제 해결 가이드

## 🔴 현재 상태
- **cgrang (Kakao) ↔ l3041 (Google)** 사이에 **5개의 중복 채팅방** 존재
- 새로운 채팅 시작할 때마다 계속 새 채팅방이 생성됨

## ✅ 해결 방법

### 1단계: Supabase SQL Editor에서 함수 수정

1. **Supabase Dashboard 열기**
   - https://supabase.com/dashboard → 프로젝트 선택

2. **SQL Editor 열기**
   - 좌측 메뉴 → "SQL Editor" 클릭

3. **다음 SQL 복사하여 실행:**

```sql
CREATE OR REPLACE FUNCTION get_or_create_chat_room(
  user1_id UUID,
  user2_id UUID,
  ctx_type TEXT DEFAULT NULL,
  ctx_card_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  room_id UUID;
  smaller_id UUID;
  larger_id UUID;
BEGIN
  -- participant_1_id가 항상 작은 UUID가 되도록 정렬
  IF user1_id < user2_id THEN
    smaller_id := user1_id;
    larger_id := user2_id;
  ELSE
    smaller_id := user2_id;
    larger_id := user1_id;
  END IF;

  -- ✅ 같은 두 사용자 간에는 항상 하나의 채팅방만 반환
  -- context_card_id와 관계없이 기존 채팅방 재사용
  SELECT id INTO room_id
  FROM chat_rooms
  WHERE participant_1_id = smaller_id
    AND participant_2_id = larger_id
  ORDER BY created_at ASC
  LIMIT 1;  -- 가장 오래된 채팅방 사용

  -- 없으면 새로 생성
  IF room_id IS NULL THEN
    INSERT INTO chat_rooms (
      participant_1_id,
      participant_2_id,
      context_type,
      context_card_id
    ) VALUES (
      smaller_id,
      larger_id,
      ctx_type,
      ctx_card_id
    ) RETURNING id INTO room_id;

    -- 참여자 정보 생성
    INSERT INTO chat_participants (room_id, user_id) VALUES (room_id, smaller_id);
    INSERT INTO chat_participants (room_id, user_id) VALUES (room_id, larger_id);
  END IF;

  RETURN room_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

4. **"Run" 버튼 클릭** → "Success. No rows returned" 확인

### 2단계: 브라우저 새로고침

- **Firefox (cgrang)**: Ctrl+Shift+R (강제 새로고침)
- **Edge (l3041)**: Ctrl+Shift+R (강제 새로고침)

### 3단계: 테스트

1. 두 계정 모두 채팅 목록 열기
2. **5개의 채팅방이 여전히 보이지만**, 이제부터는 **모두 같은 채팅방(가장 오래된 것)으로 연결됨**
3. 새로운 채팅 시작해도 **기존 채팅방 재사용**

---

## 📊 기대 효과

### Before (현재)
```
cgrang (Kakao) ↔ l3041 (Google)
├── 채팅방 1 (11/14 오전)
├── 채팅방 2 (11/14 오전)  ← 중복!
├── 채팅방 3 (11/14 오후)  ← 중복!
├── 채팅방 4 (11/15 새벽)  ← 중복!
└── 채팅방 5 (11/15 오전)  ← 중복!
```

### After (수정 후)
```
cgrang (Kakao) ↔ l3041 (Google)
└── 채팅방 1 (11/14 오전)  ✅ 항상 이것만 사용
    (나머지 4개는 무시됨)
```

---

## 🎯 중복 채팅방 목록 (참고용)

**유지될 방**: `21f1438b-4244-4613-955e-896b99e40b22` (가장 오래됨)
**무시될 방**:
- `8cad1507...` (11/14 04:14)
- `3788c81a...` (11/14 06:57)
- `1487a411...` (11/15 00:54)
- `9300564e...` (11/15 03:08)

---

## ⚠️ 주의사항

- 중복 채팅방의 메시지는 **각 방에 남아있음**
- 하지만 이제부터는 **가장 오래된 채팅방만 사용**됨
- 나중에 수동으로 중복 채팅방을 삭제할 수 있지만, **지금은 필수 아님**

---

## ✅ 완료 확인

SQL 실행 후:
1. [ ] 브라우저 강제 새로고침 (Ctrl+Shift+R)
2. [ ] 채팅 목록 열기
3. [ ] 메시지 주고받기 테스트
4. [ ] Alt+Tab 후 돌아와서 메시지 유지 확인

---

**진행 상황을 알려주세요!**
