# 📌 북마크(좋아요) 기능 구현 계획

## 🎯 프로젝트 현황 분석

### 현재 상태
- **모바일**: 상단 헤더에 하트 아이콘만 있음 (기능 없음, alert만)
- **데스크톱**: 북마크 기능 전혀 없음
- **카드 타입**: 공고(Job), 인력(Talent), 체험(Experience) 3가지
- **모바일 네비**: Home, Toggle, Register, Chat, Profile 5개 탭
- **DB**: job_postings, talents, experiences 테이블 존재

---

## 📋 1단계: 데이터베이스 설계

### 1-1. 북마크 테이블 생성 (필수)

```sql
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  card_type VARCHAR(20) NOT NULL,  -- 'job', 'talent', 'experience'
  card_id UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 복합 유니크 제약: 사용자당 카드당 1개만 북마크
  UNIQUE(user_id, card_type, card_id)
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_card_type ON public.bookmarks(card_type);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at ON public.bookmarks(created_at DESC);
```

### 1-2. RLS 정책

```sql
-- 사용자는 자신의 북마크만 조회 가능
CREATE POLICY "Users can view own bookmarks"
ON public.bookmarks FOR SELECT
USING (auth.uid() = user_id);

-- 인증된 사용자만 북마크 추가 가능
CREATE POLICY "Authenticated users can add bookmarks"
ON public.bookmarks FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 북마크만 삭제 가능
CREATE POLICY "Users can delete own bookmarks"
ON public.bookmarks FOR DELETE
USING (auth.uid() = user_id);
```

---

## 🏗️ 2단계: 프론트엔드 아키텍처

### 2-1. 타입 정의 추가 (`src/types/index.ts`)

```typescript
// 북마크 관련 타입
export interface Bookmark {
  id: string;
  user_id: string;
  card_type: 'job' | 'talent' | 'experience';
  card_id: string;
  created_at: string;
}

// 카드에 북마크 상태 추가
export interface JobPostingCard {
  // ... 기존 필드
  isBookmarked?: boolean;  // 추가
}

export interface TalentCard {
  // ... 기존 필드
  isBookmarked?: boolean;  // 추가
}

export interface ExperienceCard {
  // ... 기존 필드
  isBookmarked?: boolean;  // 추가
}
```

### 2-2. Zustand Store 생성 (`src/stores/bookmarkStore.ts`)

```typescript
interface BookmarkState {
  // 상태
  bookmarkedIds: Set<string>;  // 북마크된 카드 ID 집합
  isLoading: boolean;
  error: string | null;
  
  // 액션
  loadBookmarks: (userId: string) => Promise<void>;
  toggleBookmark: (cardId: string, cardType: 'job' | 'talent' | 'experience') => Promise<void>;
  isBookmarked: (cardId: string) => boolean;
  clearBookmarks: () => void;
}
```

### 2-3. 쿼리 함수 추가 (`src/lib/supabase/queries.ts`)

```typescript
// 사용자의 모든 북마크 조회
export async function fetchUserBookmarks(userId: string): Promise<Bookmark[]>

// 북마크 추가
export async function addBookmark(userId: string, cardId: string, cardType: string): Promise<void>

// 북마크 제거
export async function removeBookmark(userId: string, cardId: string, cardType: string): Promise<void>

// 북마크된 카드 조회 (모든 타입)
export async function fetchBookmarkedCards(userId: string): Promise<Card[]>
```

---

## 📱 3단계: 모바일 UI 구현

### 3-1. 모바일 네비게이션 변경

**현재 구조** (5개 탭):
```
[Home] [Toggle] [Register] [Chat] [Profile]
```

**변경 방안 (2가지 옵션)**:

#### 옵션 A: 새 탭 추가 (6개 탭) ✅ 권장
```
[Home] [Toggle] [Register] [Bookmark] [Chat] [Profile]
```
- 장점: 명확한 기능 분리, 사용자 인식도 높음
- 단점: 네비 공간 부족 (모바일에서 혼잡)

#### 옵션 B: 기존 탭 활용 (5개 탭 유지)
```
[Home] [Toggle] [Register] [Chat] [Profile]
```
- 헤더의 하트 아이콘을 북마크 페이지로 연결
- 장점: 네비 공간 유지, 헤더와 일관성
- 단점: 헤더 아이콘과 네비 탭의 역할 중복

**추천**: **옵션 B** (헤더 하트 아이콘 활용)

### 3-2. 모바일 북마크 페이지 구현

**파일**: `src/components/mobile/MobileBookmarkPage.tsx`

```
┌─────────────────────────────────────┐
│ 셀미바이미  [검색] [알림] [❤️]     │  ← 상단 헤더 유지
├─────────────────────────────────────┤
│                                     │
│  북마크한 공고 (3개)                │
│  ┌─────────────────────────────┐   │
│  │ 기관명                      │   │
│  │ 공고 제목                   │   │
│  │ 태그 | 위치 | 급여         │   │
│  │ [❤️ 제거] [상세보기]       │   │
│  └─────────────────────────────┘   │
│                                     │
│  북마크한 인력 (2개)                │
│  ┌─────────────────────────────┐   │
│  │ 이름 (인력)                 │   │
│  │ 전문분야                    │   │
│  │ 태그 | 위치                 │   │
│  │ [❤️ 제거] [채팅]           │   │
│  └─────────────────────────────┘   │
│                                     │
│  북마크한 체험 (1개)                │
│  ┌─────────────────────────────┐   │
│  │ 프로그램명                  │   │
│  │ 카테고리                    │   │
│  │ 위치 | 대상                 │   │
│  │ [❤️ 제거] [상세보기]       │   │
│  └─────────────────────────────┘   │
│                                     │
├─────────────────────────────────────┤
│ [Home] [Toggle] [+] [💬] [👤]      │  ← 하단 네비 유지
└─────────────────────────────────────┘
```

### 3-3. 카드 리스트 북마크 표시

**각 카드 타입별 북마크 표시 위치**:

#### JobCard 북마크 표시
```
┌─────────────────────────────────────┐
│ 공고                    [❤️ 북마크]  │  ← 우측 상단
├─────────────────────────────────────┤
│ 기관명                              │
│ 공고 제목                           │
│ [태그1] [태그2]                     │
│ 📍 위치 | 💰 급여 | ⏰ 마감일      │
└─────────────────────────────────────┘
```

#### TalentCard 북마크 표시
```
┌─────────────────────────────────────┐
│ 인력                    [❤️ 북마크]  │  ← 우측 상단
├─────────────────────────────────────┤
│ 이름                                │
│ 전문분야                            │
│ [태그1] [태그2]                     │
│ 📍 위치 | ⭐ 평점 | 경력            │
└─────────────────────────────────────┘
```

#### ExperienceCard 북마크 표시
```
┌─────────────────────────────────────┐
│ 체험                    [❤️ 북마크]  │  ← 우측 상단
├─────────────────────────────────────┤
│ 프로그램명                          │
│ 카테고리                            │
│ [태그1] [태그2]                     │
│ 📍 위치 | 👥 대상 | 운영방식        │
└─────────────────────────────────────┘
```

**북마크 버튼 상태**:
- 미북마크: `❤️` (아웃라인, 회색)
- 북마크됨: `❤️` (채워짐, 빨강)

---

## 🖥️ 4단계: 데스크톱 UI 구현

### 4-1. 헤더 변경 (데스크톱)

**현재 헤더** (로그인 상태):
```
[로고] [토글] [검색창] ... [채팅] [프로필]
```

**변경 후**:
```
[로고] [토글] [검색창] ... [❤️ 북마크] [채팅] [프로필]
```

### 4-2. 북마크 모달 구현

**파일**: `src/components/BookmarkModal.tsx`

```
┌─────────────────────────────────────────────────────┐
│ 북마크                                          [X] │
├─────────────────────────────────────────────────────┤
│                                                     │
│ 📌 북마크한 공고 (3개)                             │
│ ┌──────────────────────────────────────────────┐   │
│ │ 기관명                              [❤️ 제거] │   │
│ │ 공고 제목                                    │   │
│ │ 태그 | 위치 | 급여 | D-5                    │   │
│ │ [상세보기] [원문링크]                        │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ 👥 북마크한 인력 (2개)                             │
│ ┌──────────────────────────────────────────────┐   │
│ │ 이름                                [❤️ 제거] │   │
│ │ 전문분야                                    │   │
│ │ 태그 | 위치 | ⭐ 4.5 (10)                   │   │
│ │ [채팅하기] [프로필보기]                      │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ 🎓 북마크한 체험 (1개)                             │
│ ┌──────────────────────────────────────────────┐   │
│ │ 프로그램명                          [❤️ 제거] │   │
│ │ 카테고리                                    │   │
│ │ 위치 | 대상 | 운영방식                      │   │
│ │ [상세보기]                                  │   │
│ └──────────────────────────────────────────────┘   │
│                                                     │
│ 📊 통계: 총 6개 북마크                             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**모달 특징**:
- 고정 너비: 600px
- 최대 높이: 80vh (스크롤 가능)
- 배경: 반투명 검은색 오버레이
- 닫기: X 버튼 또는 배경 클릭

### 4-3. 모달 내 필터링 (선택사항)

```
┌─────────────────────────────────────────────────────┐
│ 북마크                                          [X] │
├─────────────────────────────────────────────────────┤
│ [모두] [공고] [인력] [체험]                        │
├─────────────────────────────────────────────────────┤
│ (필터링된 카드 리스트)                              │
└─────────────────────────────────────────────────────┘
```

---

## 🎨 5단계: 카드 UI 상세 설계

### 5-1. 북마크 버튼 스타일

```typescript
// 미북마크 상태
<button className="text-gray-300 hover:text-red-500 transition-colors">
  ❤️
</button>

// 북마크됨 상태
<button className="text-red-500 hover:text-red-600 transition-colors">
  ❤️
</button>
```

### 5-2. 카드 헤더 레이아웃

```
┌─────────────────────────────────────┐
│ [카드타입] [긴급배지]   [❤️ 북마크] │  ← 플렉스 레이아웃
└─────────────────────────────────────┘
```

**코드 구조**:
```tsx
<div className="flex items-center justify-between mb-3">
  <span className="text-sm font-semibold text-[#68B2FF]">공고</span>
  <div className="flex items-center gap-2">
    {job.isUrgent && <span>🔥 긴급</span>}
    <button onClick={handleBookmarkToggle}>
      <IconHeart 
        size={20} 
        fill={isBookmarked ? 'currentColor' : 'none'}
        className={isBookmarked ? 'text-red-500' : 'text-gray-300'}
      />
    </button>
  </div>
</div>
```

---

## 🔄 6단계: 상호작용 흐름

### 6-1. 북마크 추가 흐름

```
사용자가 카드의 ❤️ 클릭
    ↓
bookmarkStore.toggleBookmark() 호출
    ↓
Supabase에 북마크 추가
    ↓
로컬 상태 업데이트 (isBookmarked = true)
    ↓
UI 업데이트 (하트 채워짐, 빨강)
    ↓
토스트 메시지: "북마크했습니다"
```

### 6-2. 북마크 제거 흐름

```
사용자가 북마크된 카드의 ❤️ 클릭
    ↓
bookmarkStore.toggleBookmark() 호출
    ↓
Supabase에서 북마크 제거
    ↓
로컬 상태 업데이트 (isBookmarked = false)
    ↓
UI 업데이트 (하트 아웃라인, 회색)
    ↓
토스트 메시지: "북마크를 제거했습니다"
```

### 6-3. 북마크 페이지 진입 흐름 (모바일)

```
사용자가 헤더의 ❤️ 클릭
    ↓
MobileBookmarkPage 렌더링
    ↓
bookmarkStore.loadBookmarks() 호출
    ↓
Supabase에서 사용자의 모든 북마크 조회
    ↓
각 북마크된 카드 데이터 로드
    ↓
카드 타입별로 그룹화하여 표시
    ↓
사용자가 ❤️ 클릭하면 제거
```

### 6-4. 북마크 모달 진입 흐름 (데스크톱)

```
사용자가 헤더의 ❤️ 버튼 클릭
    ↓
BookmarkModal 열기
    ↓
bookmarkStore.loadBookmarks() 호출
    ↓
Supabase에서 사용자의 모든 북마크 조회
    ↓
각 북마크된 카드 데이터 로드
    ↓
모달에 카드 리스트 표시
    ↓
사용자가 ❤️ 클릭하면 제거 (모달 내에서)
```

---

## 📊 7단계: 상태 관리 흐름

### 7-1. 북마크 상태 초기화

```typescript
// App.tsx에서 사용자 로그인 시
useEffect(() => {
  if (user?.id) {
    bookmarkStore.loadBookmarks(user.id);
  }
}, [user?.id]);
```

### 7-2. 카드 렌더링 시 북마크 상태 확인

```typescript
// CardGrid.tsx에서
const isBookmarked = bookmarkStore.isBookmarked(card.id);

// JobCard.tsx에서
<button onClick={() => handleBookmarkToggle(job.id, 'job')}>
  <IconHeart 
    fill={isBookmarked ? 'currentColor' : 'none'}
  />
</button>
```

---

## 🔐 8단계: 보안 고려사항

### 8-1. RLS 정책
- 사용자는 자신의 북마크만 조회 가능
- 다른 사용자의 북마크 조회 불가
- 인증되지 않은 사용자는 북마크 불가

### 8-2. 클라이언트 검증
- 로그인하지 않은 사용자가 북마크 클릭 시 로그인 모달 표시
- 토큰 만료 시 자동 재로그인 또는 로그인 모달

### 8-3. 동시성 처리
- 중복 클릭 방지 (isLoading 플래그)
- 낙관적 업데이트 (UI 먼저 업데이트, 서버 요청 후 롤백 가능)

---

## 📝 9단계: 필요한 파일 목록

### 신규 생성 파일
1. `supabase/migrations/[timestamp]_create_bookmarks_table.sql` - DB 마이그레이션
2. `src/stores/bookmarkStore.ts` - Zustand 스토어
3. `src/components/mobile/MobileBookmarkPage.tsx` - 모바일 페이지
4. `src/components/BookmarkModal.tsx` - 데스크톱 모달

### 수정할 파일
1. `src/types/index.ts` - 타입 정의 추가
2. `src/lib/supabase/queries.ts` - 쿼리 함수 추가
3. `src/components/cards/JobCard.tsx` - 북마크 버튼 추가
4. `src/components/cards/TalentCard.tsx` - 북마크 버튼 추가
5. `src/components/cards/ExperienceCard.tsx` - 북마크 버튼 추가
6. `src/components/layout/Header.tsx` - 북마크 버튼 추가 (데스크톱)
7. `src/components/mobile/MobileHeader.tsx` - 북마크 클릭 핸들러 연결
8. `src/components/mobile/IntegratedHeaderPromo.tsx` - 북마크 클릭 핸들러 연결
9. `src/App.tsx` - 상태 관리 및 핸들러 추가

---

## 🎯 10단계: 구현 우선순위

### Phase 1: 기초 (1-2일)
1. ✅ DB 마이그레이션 (bookmarks 테이블)
2. ✅ 타입 정의 추가
3. ✅ Zustand 스토어 생성
4. ✅ 쿼리 함수 구현

### Phase 2: 카드 UI (1-2일)
1. ✅ JobCard에 북마크 버튼 추가
2. ✅ TalentCard에 북마크 버튼 추가
3. ✅ ExperienceCard에 북마크 버튼 추가
4. ✅ 북마크 상태 표시

### Phase 3: 모바일 (1-2일)
1. ✅ MobileBookmarkPage 구현
2. ✅ 헤더 하트 아이콘 연결
3. ✅ 모바일 네비 상태 관리

### Phase 4: 데스크톱 (1일)
1. ✅ BookmarkModal 구현
2. ✅ 헤더 북마크 버튼 추가
3. ✅ 모달 열기/닫기 로직

### Phase 5: 테스트 & 최적화 (1-2일)
1. ✅ 기능 테스트
2. ✅ 성능 최적화
3. ✅ 에러 처리

---

## ❓ 사용자 확인 필요 사항

1. **모바일 네비 변경 방식**: 옵션 A (새 탭 추가) vs 옵션 B (헤더 활용)?
   - 추천: **옵션 B** (헤더 하트 아이콘 활용)

2. **북마크 페이지 필터링**: 필요한가?
   - 추천: 초기 구현에서는 불필요, 추후 추가 가능

3. **북마크 통계**: 모달/페이지에 표시할 것인가?
   - 추천: 표시 (사용자 경험 향상)

4. **북마크 정렬**: 최신순/오래된순 정렬 기능?
   - 추천: 최신순 기본 (추후 추가 가능)

5. **알림 기능**: 북마크한 카드 업데이트 시 알림?
   - 추천: 추후 고려 (현재 알림 기능 미구현)

---

## 📌 추가 고려사항

### 성능 최적화
- 북마크 데이터 캐싱 (localStorage)
- 무한 스크롤 vs 페이지네이션
- 이미지 레이지 로딩

### UX 개선
- 북마크 개수 배지 (헤더 버튼에)
- 북마크 애니메이션 (하트 펄스 효과)
- 북마크 순서 변경 (드래그 앤 드롭)

### 향후 기능
- 북마크 폴더/컬렉션
- 북마크 공유
- 북마크 내보내기
- 북마크 알림

---

## 🚀 다음 단계

1. 사용자 확인 사항 검토
2. DB 마이그레이션 작성
3. 타입 정의 및 스토어 구현
4. 카드 UI 수정
5. 모바일/데스크톱 페이지/모달 구현
6. 통합 테스트
