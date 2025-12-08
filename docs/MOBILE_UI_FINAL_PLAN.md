# 모바일 UI 최종 설계 (수정안)

> 중고나라 모티브 + 사용자 맞춤 요구사항 반영

---

## 📋 최종 요구사항 정리

### ✅ 확정된 UI 구조

1. **헤더 (최상단)**
   - 로고: 좌측 "셀미바이미" (현행 유지)
   - 우측: 검색 아이콘 + 알림 아이콘 + 북마크 아이콘
   - ❌ 햄버거 메뉴 제거 (필요 없음)

2. **헤더-프로모카드 통합**
   - 헤더와 프로모카드 **같은 그라데이션 배경**
   - 시각적으로 하나의 카드처럼 보이게
   - 실제로 통합 가능

3. **검색**
   - 검색창 ❌ 독립 안 함
   - 검색 아이콘 클릭 → 전체 화면 검색 모달
   - 검색에 집중할 수 있는 전용 화면

4. **프로모카드 하단**
   - AI 추천 카드 슬롯

5. **띠지 배너**
   - 보이지 않음 (숨김 처리)

6. **전체 카드**
   - 추천 카드 아래에 노출 (현행 유지)

7. **하단 네비게이션 (5버튼)**
   - **홈**: 전체 보기
   - **전환 토글**: 공고 ↔ 체험 ↔ 인력 (로테이션)
   - **등록 (+)**: 플로팅 메뉴 (공고/인력/체험 선택)
   - **채팅**: 채팅 기능 (장기)
   - **마이페이지**: 프로필

### 🔮 장기 계획 (PC 연동)

- **북마크 (좋아요)**: 찜한 공고 저장
- **채팅 기능**: 문의, 상담
- **알림 기능**: 푸시 알림

→ **DB 구조**, **함수**, **API** 설계 중요

---

## 🎨 UI 구조 (텍스트 목업)

```
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐  │
│  │ [셀미바이미]     [🔍] [🔔] [❤️]       │  │ ← 헤더 (그라데이션 배경)
│  ├───────────────────────────────────────┤  │
│  │                                       │  │
│  │   [프로모카드 배너]                    │  │ ← 같은 그라데이션 배경
│  │   - 이미지 또는 콘텐츠                │  │   (헤더와 통합된 느낌)
│  │                                       │  │
│  └───────────────────────────────────────┘  │
├─────────────────────────────────────────────┤
│                                             │
│  ✨ AI 추천                                 │ ← 추천 카드 슬롯
│  [카드] [카드] [카드] →                     │
│                                             │
├─────────────────────────────────────────────┤
│  [띠지 배너 - HIDDEN]                        │ ← 숨김 처리
├─────────────────────────────────────────────┤
│                                             │
│  📋 전체 카드 목록                          │
│  [카드]                                     │
│  [카드]                                     │
│  [카드]                                     │
│                                             │
└─────────────────────────────────────────────┘
│ [🏠] [🔄] [➕] [💬] [👤]                    │ ← 하단 네비 (5버튼)
└─────────────────────────────────────────────┘
```

---

## 📐 상세 레이아웃 설계

### 1️⃣ 통합 헤더-프로모카드 섹션

**구조**:
```
┌─────────────────────────────────────┐
│  그라데이션 배경 (통합)               │
│  ┌─────────────────────────────┐    │
│  │ 셀미바이미  [🔍] [🔔] [❤️]  │    │ ← 헤더 (56px)
│  └─────────────────────────────┘    │
│                                     │
│  [프로모카드 콘텐츠]                 │ ← 프로모카드 (200px)
│  - 이미지/텍스트                     │
│  - 슬라이드 (선택)                   │
│                                     │
└─────────────────────────────────────┘
```

**코드 구조**:
```tsx
// Option A: 실제로 통합 (추천)
<section className="relative bg-gradient-to-br from-[#9DD2FF] to-[#68B2FF]">
  {/* 헤더 */}
  <div className="flex items-center justify-between h-14 px-4">
    <h1 className="text-lg font-bold text-white">셀미바이미</h1>
    <div className="flex items-center gap-3">
      <IconButton icon={<IconSearch />} onClick={onSearchClick} />
      <IconButton icon={<IconBell />} onClick={onNotificationClick} />
      <IconButton icon={<IconHeart />} onClick={onBookmarkClick} />
    </div>
  </div>

  {/* 프로모카드 */}
  <PromoCardContent />
</section>

// Option B: 별도 컴포넌트 (같은 배경색)
<div className="bg-gradient-to-br from-[#9DD2FF] to-[#68B2FF]">
  <MobileHeader />
  <PromoCardStack />
</div>
```

**특징**:
- ✅ 헤더와 프로모카드가 **같은 그라데이션 배경**
- ✅ 경계선 없음 (완전히 통합된 느낌)
- ✅ 헤더 아이콘 흰색 (배경 대비)

---

### 2️⃣ 검색 전용 화면 (Full-Screen Modal)

**UI 구조**:
```
┌─────────────────────────────────────┐
│ [← 뒤로]          검색         [×]   │ ← 헤더
├─────────────────────────────────────┤
│  🔍 [검색어 입력................]    │ ← 검색창 (자동 포커스)
├─────────────────────────────────────┤
│  📌 최근 검색어                      │
│  • 수원 중등 기간제                  │
│  • 성남 방과후                       │
│  • 판교 영어 강사                    │
├─────────────────────────────────────┤
│  🔥 인기 검색어                      │
│  1. 수원                             │
│  2. 중등                             │
│  3. 기간제                           │
├─────────────────────────────────────┤
│                                     │
│  [검색 결과 카드 목록]               │ ← 검색 시 노출
│  [카드]                              │
│  [카드]                              │
│                                     │
└─────────────────────────────────────┘
```

**컴포넌트**: `SearchModal.tsx` (신규)

```tsx
interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SearchModal({ isOpen, onClose }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Card[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      // 자동 포커스
      inputRef.current?.focus();
      // 최근 검색어 로드
      loadRecentSearches();
    }
  }, [isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} fullScreen>
      {/* 헤더 */}
      <div className="flex items-center h-14 px-4 border-b">
        <button onClick={onClose}>
          <IconArrowLeft />
        </button>
        <h2 className="flex-1 text-center font-bold">검색</h2>
        <button onClick={onClose}>
          <IconX />
        </button>
      </div>

      {/* 검색창 */}
      <div className="p-4">
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleSearch}
            placeholder="수원 중등 기간제, 성남 방과후 등 검색"
            className="w-full h-12 pl-10 pr-4 rounded-lg bg-gray-100"
          />
        </div>
      </div>

      {/* 최근 검색어 / 인기 검색어 */}
      {!query && (
        <div className="px-4">
          <RecentSearches searches={recentSearches} onSelect={setQuery} />
          <PopularKeywords keywords={popularKeywords} onSelect={setQuery} />
        </div>
      )}

      {/* 검색 결과 */}
      {query && (
        <div className="flex-1 overflow-y-auto">
          <CardGrid cards={results} />
        </div>
      )}
    </Modal>
  );
}
```

**특징**:
- ✅ 전체 화면 모달
- ✅ 자동 포커스 (입력 즉시 가능)
- ✅ 최근 검색어 저장/표시
- ✅ 인기 검색어 표시
- ✅ 실시간 검색 결과

---

### 3️⃣ 하단 네비게이션 (5버튼)

**UI 구조**:
```
┌───────────────────────────────────────┐
│  [🏠]    [🔄]    [➕]    [💬]    [👤]  │
│  홈      전환     등록    채팅   프로필│
└───────────────────────────────────────┘
```

**버튼 기능**:

| 아이콘 | 라벨 | 기능 | 상태 |
|--------|------|------|------|
| 🏠 | 홈 | 전체 보기 (all) | ✅ 구현 |
| 🔄 | 전환 | 공고 ↔ 체험 ↔ 인력 로테이션 | 🆕 신규 |
| ➕ | 등록 | 플로팅 메뉴 (3버튼) | 🆕 신규 |
| 💬 | 채팅 | 채팅 기능 | 🔮 장기 |
| 👤 | 프로필 | 마이페이지 | ✅ 구현 |

**컴포넌트**: `BottomNav.tsx` (수정)

```tsx
export default function BottomNav() {
  const { viewType, setViewType } = useSearchStore();
  const [showRegisterMenu, setShowRegisterMenu] = useState(false);

  // 전환 토글 (공고 → 체험 → 인력 → 공고)
  const handleToggle = () => {
    const sequence: ViewType[] = ['job', 'experience', 'talent'];
    const currentIndex = sequence.indexOf(viewType as any);
    const nextIndex = (currentIndex + 1) % sequence.length;
    setViewType(sequence[nextIndex]);
  };

  const tabs = [
    {
      id: 'home',
      icon: <IconHome size={24} />,
      label: '홈',
      onClick: () => setViewType('all')
    },
    {
      id: 'toggle',
      icon: <IconRefresh size={24} />,
      label: '전환',
      onClick: handleToggle,
      active: viewType !== 'all'
    },
    {
      id: 'register',
      icon: <IconPlus size={28} />,
      label: '등록',
      onClick: () => setShowRegisterMenu(true),
      special: true // 강조 스타일
    },
    {
      id: 'chat',
      icon: <IconMessageCircle size={24} />,
      label: '채팅',
      onClick: () => alert('채팅 기능 준비 중'),
      disabled: true
    },
    {
      id: 'profile',
      icon: <IconUser size={24} />,
      label: '프로필',
      onClick: onProfileClick
    }
  ];

  return (
    <>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t z-50">
        <div className="flex h-full">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={tab.onClick}
              disabled={tab.disabled}
              className={`
                flex-1 flex flex-col items-center justify-center gap-1
                ${tab.special ? 'text-primary' : 'text-gray-600'}
                ${tab.active ? 'text-primary' : ''}
                ${tab.disabled ? 'opacity-40' : ''}
              `}
            >
              {tab.icon}
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 등록 플로팅 메뉴 */}
      <RegisterFloatingMenu
        isOpen={showRegisterMenu}
        onClose={() => setShowRegisterMenu(false)}
      />
    </>
  );
}
```

**전환 토글 동작**:
```
현재: job (공고) → 클릭 → experience (체험)
현재: experience (체험) → 클릭 → talent (인력)
현재: talent (인력) → 클릭 → job (공고)
```

---

### 4️⃣ 등록 플로팅 메뉴 (Bottom Sheet)

**UI 구조**:
```
┌───────────────────────────────────────┐
│                                       │
│  [배경 어두운 오버레이]                │
│                                       │
│  ┌─────────────────────────────────┐ │
│  │   어떤 종류를 등록하시겠어요?    │ │
│  ├─────────────────────────────────┤ │
│  │  [📋 공고 등록]                  │ │
│  │  교육 기관의 강사 모집 공고      │ │
│  ├─────────────────────────────────┤ │
│  │  [👥 인력 등록]                  │ │
│  │  강사/교사 프로필 등록           │ │
│  ├─────────────────────────────────┤ │
│  │  [🎪 체험 등록]                  │ │
│  │  체험 활동 프로그램 등록         │ │
│  ├─────────────────────────────────┤ │
│  │  [취소]                          │ │
│  └─────────────────────────────────┘ │
└───────────────────────────────────────┘
```

**컴포넌트**: `RegisterFloatingMenu.tsx` (신규)

```tsx
interface RegisterFloatingMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function RegisterFloatingMenu({ isOpen, onClose }: RegisterFloatingMenuProps) {
  const [activeForm, setActiveForm] = useState<'job' | 'talent' | 'experience' | null>(null);

  const menuItems = [
    {
      id: 'job',
      icon: <IconFileText size={24} className="text-[#7aa3cc]" />,
      title: '공고 등록',
      description: '교육 기관의 강사 모집 공고',
      color: 'bg-[#a8c5e0]/10'
    },
    {
      id: 'talent',
      icon: <IconUsers size={24} className="text-[#7db8a3]" />,
      title: '인력 등록',
      description: '강사/교사 프로필 등록',
      color: 'bg-[#c5e3d8]/10'
    },
    {
      id: 'experience',
      icon: <IconSparkles size={24} className="text-[#f4c96b]" />,
      title: '체험 등록',
      description: '체험 활동 프로그램 등록',
      color: 'bg-[#ffd98e]/10'
    }
  ];

  return (
    <>
      {/* Bottom Sheet */}
      <BottomSheet isOpen={isOpen} onClose={onClose}>
        <div className="p-6">
          <h3 className="text-lg font-bold text-center mb-6">
            어떤 종류를 등록하시겠어요?
          </h3>

          <div className="space-y-3">
            {menuItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveForm(item.id as any)}
                className={`w-full flex items-center gap-4 p-4 rounded-lg border ${item.color} hover:bg-opacity-50 transition-colors`}
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-full bg-white">
                  {item.icon}
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
                <IconChevronRight className="text-gray-400" />
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 py-3 text-gray-600 font-medium"
          >
            취소
          </button>
        </div>
      </BottomSheet>

      {/* 등록 폼 모달 */}
      {activeForm === 'job' && (
        <JobPostingForm onClose={() => setActiveForm(null)} />
      )}
      {activeForm === 'talent' && (
        <TalentRegistrationForm onClose={() => setActiveForm(null)} />
      )}
      {activeForm === 'experience' && (
        <ExperienceRegistrationForm onClose={() => setActiveForm(null)} />
      )}
    </>
  );
}
```

---

### 5️⃣ 알림/북마크 버튼 (프론트엔드만)

**현재 동작** (임시):
```tsx
// MobileHeader.tsx
<button onClick={() => alert('알림 기능 준비 중')}>
  <IconBell size={22} className="text-white" />
  {/* 뱃지 (알림 개수) */}
  {notificationCount > 0 && (
    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
      {notificationCount}
    </span>
  )}
</button>

<button onClick={() => alert('북마크 기능 준비 중')}>
  <IconHeart size={22} className="text-white" />
</button>
```

---

## 🗄️ DB 구조 설계 (장기 계획)

### 1️⃣ 북마크 (좋아요) 테이블

```sql
-- bookmarks 테이블
CREATE TABLE bookmarks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL, -- 'job', 'talent', 'experience'
  target_id UUID NOT NULL,   -- job_postings.id, talents.id, experiences.id
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 방지
  CONSTRAINT unique_bookmark UNIQUE (user_id, target_type, target_id)
);

-- 인덱스
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_bookmarks_target ON bookmarks(target_type, target_id);
```

**쿼리 함수**:
```typescript
// lib/supabase/bookmarks.ts
export async function addBookmark(
  userId: string,
  targetType: 'job' | 'talent' | 'experience',
  targetId: string
) {
  const { data, error } = await supabase
    .from('bookmarks')
    .insert({ user_id: userId, target_type: targetType, target_id: targetId })
    .select()
    .single();

  return { data, error };
}

export async function removeBookmark(
  userId: string,
  targetType: 'job' | 'talent' | 'experience',
  targetId: string
) {
  const { error } = await supabase
    .from('bookmarks')
    .delete()
    .match({ user_id: userId, target_type: targetType, target_id: targetId });

  return { error };
}

export async function getUserBookmarks(userId: string) {
  const { data, error } = await supabase
    .from('bookmarks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function isBookmarked(
  userId: string,
  targetType: 'job' | 'talent' | 'experience',
  targetId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('bookmarks')
    .select('id')
    .match({ user_id: userId, target_type: targetType, target_id: targetId })
    .single();

  return !!data;
}
```

---

### 2️⃣ 채팅 테이블

```sql
-- chat_rooms 테이블 (채팅방)
CREATE TABLE chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID REFERENCES job_postings(id) ON DELETE SET NULL,
  talent_id UUID REFERENCES talents(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- chat_participants 테이블 (참여자)
CREATE TABLE chat_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'employer', 'applicant'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  last_read_at TIMESTAMPTZ,

  CONSTRAINT unique_participant UNIQUE (room_id, user_id)
);

-- chat_messages 테이블 (메시지)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  attachments JSONB, -- 첨부 파일
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_read BOOLEAN DEFAULT FALSE
);

-- 인덱스
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id, created_at DESC);
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);
```

**실시간 구독**:
```typescript
// lib/supabase/chat.ts
export function subscribeToChatRoom(roomId: string, onMessage: (message: any) => void) {
  const subscription = supabase
    .channel(`chat:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`
      },
      (payload) => {
        onMessage(payload.new);
      }
    )
    .subscribe();

  return subscription;
}
```

---

### 3️⃣ 알림 테이블

```sql
-- notifications 테이블
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'new_job', 'bookmark_deadline', 'chat_message', 'application_update'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_url TEXT, -- 클릭 시 이동할 URL
  metadata JSONB, -- 추가 데이터 (job_id, sender_name 등)
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- 중복 알림 방지 (선택)
  dedup_key TEXT UNIQUE
);

-- 인덱스
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
```

**푸시 알림 연동**:
```typescript
// lib/supabase/notifications.ts
export async function createNotification(
  userId: string,
  type: string,
  title: string,
  message: string,
  linkUrl?: string,
  metadata?: any
) {
  const { data, error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      link_url: linkUrl,
      metadata
    })
    .select()
    .single();

  // Capacitor Push Notification과 연동 (장기)
  if (data) {
    await sendPushNotification(userId, title, message);
  }

  return { data, error };
}

export async function getUnreadNotifications(userId: string) {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  return { data, error };
}

export async function markAsRead(notificationId: string) {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);

  return { error };
}
```

---

## 🔗 PC-모바일 연동 전략

### 공통 API/함수 레이어

```typescript
// lib/supabase/universal.ts
// PC와 모바일이 공통으로 사용하는 함수

// 북마크
export { addBookmark, removeBookmark, getUserBookmarks, isBookmarked } from './bookmarks';

// 채팅
export { createChatRoom, sendMessage, subscribeToChatRoom } from './chat';

// 알림
export { createNotification, getUnreadNotifications, markAsRead } from './notifications';
```

### 반응형 컴포넌트 전략

```tsx
// components/common/BookmarkButton.tsx
export default function BookmarkButton({ targetType, targetId }: Props) {
  const [isBookmarked, setIsBookmarked] = useState(false);

  // 공통 로직
  const handleToggle = async () => {
    if (isBookmarked) {
      await removeBookmark(user.id, targetType, targetId);
    } else {
      await addBookmark(user.id, targetType, targetId);
    }
    setIsBookmarked(!isBookmarked);
  };

  return (
    <button onClick={handleToggle} className="...">
      {/* PC: 텍스트 포함 */}
      {/* 모바일: 아이콘만 */}
      <IconHeart fill={isBookmarked ? 'currentColor' : 'none'} />
      <span className="hidden md:inline ml-2">
        {isBookmarked ? '찜 해제' : '찜하기'}
      </span>
    </button>
  );
}
```

### RLS (Row Level Security) 정책

```sql
-- bookmarks 테이블 RLS
ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookmarks"
  ON bookmarks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own bookmarks"
  ON bookmarks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own bookmarks"
  ON bookmarks FOR DELETE
  USING (auth.uid() = user_id);

-- chat_messages 테이블 RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages in their rooms"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.room_id = chat_messages.room_id
        AND chat_participants.user_id = auth.uid()
    )
  );

-- notifications 테이블 RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
```

---

## 📋 구현 체크리스트

### Phase 1: 헤더-프로모카드 통합 ⭐⭐⭐
- [ ] `IntegratedHeaderPromo.tsx` 신규 생성 또는
- [ ] `MobileHeader.tsx` + `PromoCardStack.tsx` 같은 배경색 적용
- [ ] 그라데이션 배경: `bg-gradient-to-br from-[#9DD2FF] to-[#68B2FF]`
- [ ] 헤더 아이콘: 검색, 알림, 북마크 (흰색)
- [ ] 프로모카드 테두리/띠지 제거

### Phase 2: 검색 전용 화면 ⭐⭐⭐
- [ ] `SearchModal.tsx` 신규 생성
- [ ] 전체 화면 모달 (`fullScreen` prop)
- [ ] 자동 포커스 (`useRef` + `useEffect`)
- [ ] 최근 검색어 로직 (LocalStorage)
- [ ] 인기 검색어 로직 (DB 또는 하드코딩)
- [ ] 실시간 검색 결과

### Phase 3: 하단 네비 재설계 ⭐⭐⭐
- [ ] `BottomNav.tsx` 수정
- [ ] 5버튼 구조: 홈, 전환, 등록, 채팅, 프로필
- [ ] 전환 토글 로직 (`job → experience → talent → job`)
- [ ] 등록 버튼 클릭 → 플로팅 메뉴 열기
- [ ] 채팅 버튼 비활성화 (임시)

### Phase 4: 등록 플로팅 메뉴 ⭐⭐
- [ ] `RegisterFloatingMenu.tsx` 신규 생성
- [ ] Bottom Sheet 컴포넌트 (또는 라이브러리)
- [ ] 3개 옵션: 공고/인력/체험
- [ ] 각 옵션 클릭 → 해당 등록 폼 모달

### Phase 5: 띠지 배너 숨김 ⭐
- [ ] `AIInsightBox.tsx`에 `hidden` 클래스 또는
- [ ] `App.tsx`에서 조건부 렌더링 제거

### Phase 6: DB 구조 (장기) 🔮
- [ ] `bookmarks` 테이블 생성
- [ ] `chat_rooms`, `chat_participants`, `chat_messages` 테이블 생성
- [ ] `notifications` 테이블 생성
- [ ] RLS 정책 설정
- [ ] 쿼리 함수 작성 (`lib/supabase/`)

### Phase 7: 프론트엔드 기능 (장기) 🔮
- [ ] 북마크 토글 기능
- [ ] 북마크 목록 페이지
- [ ] 채팅 UI (채팅방 목록, 메시지)
- [ ] 실시간 채팅 구독
- [ ] 알림 목록 모달
- [ ] 알림 뱃지 (읽지 않은 개수)

### Phase 8: 푸시 알림 연동 (Capacitor 이후) 🔮
- [ ] Capacitor Push Notifications 플러그인
- [ ] FCM/APNs 토큰 저장
- [ ] Supabase Edge Function: 푸시 전송
- [ ] 알림 클릭 → 딥링크

---

## 🎨 디자인 스펙

### 색상
- **헤더-프로모카드 배경**: `linear-gradient(to bottom right, #9DD2FF, #68B2FF)`
- **헤더 아이콘**: 흰색 (`text-white`)
- **하단 네비 배경**: 흰색 (`bg-white`)
- **등록 버튼 강조**: Primary 색상 (`text-primary`)

### 높이
- **헤더**: 56px (`h-14`)
- **프로모카드**: 가변 (최소 200px)
- **하단 네비**: 64px (`h-16`)

### 간격
- **헤더 패딩**: `px-4`
- **프로모카드 패딩**: `p-0` (테두리 없음)
- **하단 네비 간격**: `gap-0` (버튼 5개 균등 분할)

---

## 📊 최종 컴포넌트 구조

```
src/
├── components/
│   ├── layout/
│   │   ├── MobileHeader.tsx (수정 - 그라데이션 배경)
│   │   └── IntegratedHeaderPromo.tsx (신규 - 통합 옵션)
│   ├── mobile/
│   │   ├── BottomNav.tsx (수정 - 5버튼)
│   │   ├── RegisterFloatingMenu.tsx (신규 - 플로팅 메뉴)
│   │   └── SearchModal.tsx (신규 - 검색 전용 화면)
│   ├── promo/
│   │   └── PromoCardStack.tsx (수정 - 테두리/띠지 제거)
│   └── common/
│       └── BookmarkButton.tsx (신규 - 북마크 토글)
├── lib/
│   └── supabase/
│       ├── bookmarks.ts (신규 - 북마크 쿼리)
│       ├── chat.ts (신규 - 채팅 쿼리)
│       ├── notifications.ts (신규 - 알림 쿼리)
│       └── universal.ts (신규 - 공통 API)
└── stores/
    ├── bookmarkStore.ts (신규 - 북마크 상태)
    └── notificationStore.ts (신규 - 알림 상태)
```

---

## 🚀 다음 단계

### 즉시 시작 가능 (Phase 1~5)
1. 헤더-프로모카드 통합
2. 검색 모달
3. 하단 네비 재설계
4. 등록 플로팅 메뉴
5. 띠지 배너 숨김

### 중기 계획 (Phase 6~7)
6. DB 구조 설계
7. 북마크/알림 기능 구현

### 장기 계획 (Phase 8)
8. 채팅 기능
9. 푸시 알림 (Capacitor 이후)

---

**결론**: 중고나라의 **통합 디자인**과 **공간 효율성**을 차용하면서도, 셀미바이미만의 **3가지 핵심 기능** (북마크, 채팅, 알림)을 장기적으로 준비합니다!
