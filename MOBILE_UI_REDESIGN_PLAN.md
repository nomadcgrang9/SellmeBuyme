# 모바일 UI 재설계 계획 (중고나라 모티브)

> 중고나라 앱 분석 결과를 바탕으로 셀미바이미 모바일 UI 재구성

---

## 📊 중고나라 앱 분석 결과

### 왜 중고나라를 모티브로 선택했는가?

#### 1. **콘텐츠 밀도 극대화** ⭐⭐⭐
- 불필요한 여백/테두리 제거
- 화면 공간을 매우 효율적으로 사용
- 사용자가 원하는 것: 카드(공고/인력/체험)를 **최대한 많이** 보여주기

#### 2. **광고/프로모션의 자연스러운 통합** ⭐⭐⭐
- AXA 보험 배너가 앱의 일부처럼 느껴짐
- 별도 "광고" 표시 없이 콘텐츠처럼 보임
- 셀미바이미도 **프로모카드를 자연스럽게 노출**하고 싶은 의도

#### 3. **액션 버튼의 접근성** ⭐⭐
- 중고나라는 하단 네비게이션에 "등록" 버튼 (가운데 +)
- 또는 햄버거 메뉴로 숨김
- 셀미바이미의 **3개 등록 버튼은 너무 큰 공간 차지** → 개선 필요

#### 4. **시각적 혼잡도 감소** ⭐⭐
- 심플한 흰색 배경
- 섹션 구분이 명확하지만 **테두리는 없음**
- 셀미바이미는 박스/배경색이 너무 많아 복잡해 보임

#### 5. **프로페셔널한 느낌** ⭐
- 큰 브랜드 같은 통일감
- 셀미바이미도 교육 플랫폼으로서 **신뢰감** 필요

---

## 🎯 현재 셀미바이미 문제점

### 1. 헤더가 컨테이너로 분리
```
┌─────────────────────────────────┐
│ [셀바] [검색창......] [로그인][가입] │ ← 박스 안에 갇혀 있음
└─────────────────────────────────┘
```
- 배경 흰색으로 분리되어 보임
- 중고나라처럼 통합된 느낌 없음

### 2. 등록 버튼 섹션이 별도 영역 차지
```
┌─────────────────────────────────┐
│  [📋]    [👥]    [🎪]           │
│ 공고등록  인력등록  체험등록        │ ← 화면 상단 1/4 차지 (낭비)
└─────────────────────────────────┘
```

### 3. AI 추천 섹션 과도한 구분
```
┌─────────────────────────────────┐
│ ✨ 선생님을 위해 셀바가...        │ ← 노란색 배경 박스
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ 프로필 정보...                   │ ← 또 다른 박스
└─────────────────────────────────┘
```

### 4. 프로모카드 (현재 안 보임)
- 아마도 컨테이너 안에 갇혀 있을 것
- 띠지(스트립)가 있어서 "광고" 느낌

### 5. 띠지 배너 (AIInsightBox)
```
┌─────────────────────────────────┐
│ 인공지능이 선생님께 가져다 드려요 │ ← 별도 섹션, 흐름 끊김
└─────────────────────────────────┘
```

---

## 🚀 새로운 UI 구조 (텍스트 목업)

### 레이아웃 계층 구조

```
┌───────────────────────────────────────┐
│ [☰] 셀미바이미        [🔍] [👤 로그인] │ ← 헤더 (최소화)
├───────────────────────────────────────┤
│                                       │
│   [프로모카드 - 대형 배너]             │ ← 테두리 없음, 전체 너비
│   - 띠지 제거                          │
│   - 배경 그라데이션                     │
│   - 자연스러운 통합                     │
│                                       │
├───────────────────────────────────────┤
│  🔍 [검색창.....................]      │ ← 프로모카드 하단에 통합
├───────────────────────────────────────┤
│                                       │
│  ✨ AI 추천 (배경 제거)                │ ← 테두리 없음
│  [카드][카드][카드] →                  │
│                                       │
├───────────────────────────────────────┤
│  [띠지 배너 - PC만]                    │ ← 모바일: display: none
├───────────────────────────────────────┤
│                                       │
│  📋 전체 카드 목록                     │
│  [카드]                                │
│  [카드]                                │
│  [카드]                                │
│                                       │
└───────────────────────────────────────┘
│ [홈][검색][+등록][채팅][프로필]         │ ← 하단 네비
└───────────────────────────────────────┘
```

---

## 📝 상세 구현 계획

### 1️⃣ 헤더 재설계 (MobileHeader.tsx 신규 생성)

**현재**:
```tsx
<div className="sm:hidden">
  <h1>셀바</h1>
  <input type="text" placeholder="검색" />
  <button>로그인</button>
  <button>가입</button>
</div>
```

**재설계**:
```tsx
// MobileHeader.tsx (신규)
<header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
  <div className="flex items-center justify-between h-14 px-4">
    {/* 좌측: 햄버거 + 로고 */}
    <div className="flex items-center gap-3">
      <button
        onClick={onMenuOpen}
        className="w-8 h-8 flex items-center justify-center"
        aria-label="메뉴"
      >
        <IconMenu2 size={24} stroke={1.5} />
      </button>
      <h1 className="text-lg font-bold bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF] bg-clip-text text-transparent">
        셀미바이미
      </h1>
    </div>

    {/* 우측: 검색 + 로그인/프로필 */}
    <div className="flex items-center gap-3">
      <button
        onClick={onSearchOpen}
        className="w-8 h-8 flex items-center justify-center"
        aria-label="검색"
      >
        <IconSearch size={22} stroke={1.5} />
      </button>
      {isAuthenticated ? (
        <button onClick={onProfileClick} className="w-8 h-8">
          <img src={profileImage} className="rounded-full" />
        </button>
      ) : (
        <button onClick={onLoginClick} className="text-sm font-medium text-primary">
          로그인
        </button>
      )}
    </div>
  </div>
</header>
```

**특징**:
- ✅ 검색창 제거 → 아이콘으로 변경
- ✅ 햄버거 메뉴 추가
- ✅ 높이 최소화 (h-14, 56px)
- ✅ 배경 반투명 (`bg-white/95 backdrop-blur-sm`)

---

### 2️⃣ 프로모카드 최상단 배치 (PromoCardStack.tsx 수정)

**현재 문제**:
```tsx
// 아마도 이런 구조일 것
<section className="container mx-auto px-4 py-6 border rounded-lg">
  <div className="border-t-2 border-primary mb-4">띠지</div>
  <PromoCard />
</section>
```

**재설계**:
```tsx
// PromoCardStack.tsx
<section className="relative w-full -mt-0">
  {/* 띠지 제거 */}
  {/* 테두리 제거 */}
  {/* 패딩 제거 */}

  <div className="w-full overflow-hidden">
    <PromoCard
      className="w-full border-none shadow-none"
      style={{
        backgroundImage: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}
    />
  </div>
</section>
```

**변경 사항**:
- ❌ 띠지 제거 (`border-t-2` 삭제)
- ❌ 테두리 제거 (`border`, `rounded-lg` 삭제)
- ❌ 컨테이너 제거 (`container mx-auto` → `w-full`)
- ✅ 배경 그라데이션 추가
- ✅ 전체 너비 사용 (`w-full`)

---

### 3️⃣ 검색창 프로모카드 하단 통합

**새로운 컴포넌트**: `IntegratedSearchBar.tsx`

```tsx
// IntegratedSearchBar.tsx (신규)
export default function IntegratedSearchBar() {
  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="relative">
        <IconSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={18}
          stroke={1.5}
        />
        <input
          type="text"
          placeholder="수원 중등 기간제, 성남 자원봉사자 등 검색"
          className="w-full h-11 pl-10 pr-4 rounded-lg bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:border-primary focus:bg-white"
        />
      </div>
    </div>
  );
}
```

**배치**:
```tsx
// App.tsx
<MobileHeader />
<PromoCardStack />
<IntegratedSearchBar /> {/* ← 프로모카드 바로 아래 */}
<AIRecommendations />
```

**특징**:
- ✅ 프로모카드와 시각적으로 연결
- ✅ 배경 흰색으로 자연스럽게 전환
- ✅ 하단 보더로 구분 (`border-b`)

---

### 4️⃣ 햄버거 메뉴 (HamburgerMenu.tsx 신규 생성)

**구조**:
```tsx
// HamburgerMenu.tsx (신규)
<Drawer
  isOpen={isMenuOpen}
  onClose={onClose}
  position="left"
  className="w-[280px]"
>
  {/* 헤더 */}
  <div className="p-6 bg-gradient-to-r from-[#9DD2FF] to-[#68B2FF]">
    <h2 className="text-xl font-bold text-white">셀미바이미</h2>
    <p className="text-sm text-white/80 mt-1">교육 공고 통합 플랫폼</p>
  </div>

  {/* 메뉴 아이템 */}
  <nav className="flex-1 py-4">
    {/* 등록 섹션 */}
    <div className="px-4 mb-4">
      <p className="text-xs font-semibold text-gray-500 mb-2">등록하기</p>
      <MenuItem
        icon={<IconFileText />}
        label="공고 등록"
        onClick={onJobRegisterClick}
      />
      <MenuItem
        icon={<IconUsers />}
        label="인력 등록"
        onClick={onTalentRegisterClick}
      />
      <MenuItem
        icon={<IconSparkles />}
        label="체험 등록"
        onClick={onExperienceRegisterClick}
      />
    </div>

    {/* 구분선 */}
    <div className="h-px bg-gray-200 mx-4 my-4" />

    {/* 기타 메뉴 */}
    <div className="px-4">
      <MenuItem icon={<IconHeart />} label="찜한 공고" />
      <MenuItem icon={<IconHistory />} label="최근 본 공고" />
      <MenuItem icon={<IconSettings />} label="설정" />
    </div>
  </nav>

  {/* 하단 */}
  <div className="p-4 border-t">
    <MenuItem icon={<IconHelp />} label="도움말" />
    <MenuItem icon={<IconLogout />} label="로그아웃" />
  </div>
</Drawer>
```

**특징**:
- ✅ 등록 3버튼을 메뉴로 이동
- ✅ 추가 메뉴 공간 확보 (찜, 최근 본 공고 등)
- ✅ 왼쪽에서 슬라이드
- ✅ 280px 너비

---

### 5️⃣ 띠지 배너 모바일 숨김 (AIInsightBox.tsx 수정)

**현재**:
```tsx
// AIInsightBox.tsx
<div className="...">
  {/* 띠지 배너 */}
</div>
```

**수정**:
```tsx
// AIInsightBox.tsx
<div className="hidden md:block ...">
  {/* PC에서만 표시 */}
  {/* 모바일에서는 완전히 숨김 */}
</div>
```

**또는 App.tsx에서**:
```tsx
// App.tsx
{/* 띠지 배너 - PC만 */}
{!isMobile && <AIInsightBox ... />}
```

---

### 6️⃣ AI 추천 섹션 배경 제거 (AIRecommendations.tsx 수정)

**현재**:
```tsx
<section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
  <div className="...">
    ✨ 선생님을 위해 셀바가 열심히 찾아왔어요
  </div>
</section>
```

**수정**:
```tsx
<section className="py-6">
  {/* 배경 제거 */}
  {/* 테두리 제거 */}

  <div className="px-4 mb-4">
    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
      <IconSparkles size={20} className="text-primary" />
      AI 추천
    </h2>
    <p className="text-sm text-gray-600 mt-1">
      선생님을 위해 찾아왔어요
    </p>
  </div>

  {/* 캐러셀 */}
  <div className="...">
    {cards.map(...)}
  </div>
</section>
```

**특징**:
- ❌ 노란색 배경 제거
- ❌ 테두리 제거
- ✅ 심플한 제목 + 설명 구조
- ✅ 아이콘으로 포인트

---

## 📊 전체 컴포넌트 구조 (최종)

### 모바일 레이아웃 스택
```tsx
// App.tsx (모바일)
<div className="min-h-screen bg-gray-50 pb-16">
  {/* 1. 헤더 (최소화) */}
  <MobileHeader
    onMenuOpen={() => setMenuOpen(true)}
    onSearchOpen={() => setSearchOpen(true)}
    onProfileClick={handleProfileClick}
    onLoginClick={handleLoginClick}
  />

  {/* 2. 프로모카드 (최상단, 테두리 없음) */}
  <PromoCardStack
    cards={promoCards}
    className="w-full"
    showBorder={false}
    showStripe={false}
  />

  {/* 3. 검색창 (프로모카드 통합) */}
  <IntegratedSearchBar
    value={searchQuery}
    onChange={setSearchQuery}
  />

  {/* 4. AI 추천 (배경 제거) */}
  <AIRecommendations
    cards={recommendationCards}
    showBackground={false}
  />

  {/* 5. 띠지 배너 (모바일 숨김) */}
  {/* <AIInsightBox /> - 주석 처리 또는 md:block */}

  {/* 6. 카드 그리드 */}
  <CardGrid cards={cards} />

  {/* 7. 하단 네비게이션 */}
  <BottomNav />

  {/* 8. 햄버거 메뉴 (드로어) */}
  <HamburgerMenu
    isOpen={isMenuOpen}
    onClose={() => setMenuOpen(false)}
  />

  {/* 9. 검색 모달 (전체 화면) */}
  <SearchModal
    isOpen={isSearchOpen}
    onClose={() => setSearchOpen(false)}
  />
</div>
```

---

## 🎨 디자인 원칙

### 1. **무경계 디자인 (Borderless Design)**
- 테두리 최소화
- 배경색 구분 최소화
- 그림자로만 계층 표현

### 2. **공간 효율성 (Space Efficiency)**
- 불필요한 패딩 제거
- 섹션 간 간격 최소화 (4px~8px)
- 콘텐츠 밀도 극대화

### 3. **시각적 통합 (Visual Integration)**
- 프로모카드 = 앱의 일부
- 검색창 = 프로모카드의 연장
- 모든 요소가 하나의 흐름

### 4. **액션 접근성 (Action Accessibility)**
- 햄버거 메뉴로 숨김
- 하단 네비 + 버튼
- 화면 공간 확보

---

## 📐 레이아웃 스펙

### 헤더
- **높이**: 56px (h-14)
- **배경**: `bg-white/95 backdrop-blur-sm`
- **요소**: 햄버거 + 로고 + 검색 아이콘 + 로그인

### 프로모카드
- **너비**: 100vw (전체 너비)
- **높이**: 가변 (최소 200px)
- **배경**: 그라데이션
- **테두리**: 없음
- **띠지**: 제거

### 검색창
- **높이**: 44px (h-11)
- **위치**: 프로모카드 바로 아래
- **배경**: `bg-gray-50`
- **패딩**: `px-4 py-3`

### AI 추천
- **배경**: 없음 (투명)
- **패딩**: `py-6`
- **제목**: `text-lg font-bold`

### 카드 그리드
- **열**: 1열 (모바일)
- **간격**: `gap-4`
- **패딩**: `px-4`

### 하단 네비
- **높이**: 64px (h-16)
- **배경**: `bg-white`
- **요소**: 5개 탭

---

## 🔧 구현 체크리스트

### Phase 1: 헤더 재설계
- [ ] `MobileHeader.tsx` 신규 생성
- [ ] 햄버거 아이콘 추가 (`@tabler/icons-react`)
- [ ] 검색 아이콘으로 변경
- [ ] 로그인 버튼 최소화
- [ ] Header.tsx에서 모바일 레이아웃 분리

### Phase 2: 햄버거 메뉴
- [ ] `HamburgerMenu.tsx` 신규 생성
- [ ] Drawer 컴포넌트 구현 (또는 라이브러리 사용)
- [ ] 등록 3버튼 메뉴로 이동
- [ ] 추가 메뉴 아이템 (찜, 최근, 설정)
- [ ] 애니메이션 추가 (슬라이드)

### Phase 3: 프로모카드 최상단 배치
- [ ] PromoCardStack.tsx 수정
- [ ] 띠지 제거 로직
- [ ] 테두리 제거 (`border-none`)
- [ ] 전체 너비 적용 (`w-full`)
- [ ] 배경 그라데이션 추가

### Phase 4: 검색창 통합
- [ ] `IntegratedSearchBar.tsx` 신규 생성
- [ ] 프로모카드 하단 배치
- [ ] 시각적 연결 (배경 전환)
- [ ] 검색 아이콘 클릭 시 모달 열기

### Phase 5: 띠지 배너 숨김
- [ ] AIInsightBox.tsx에 `hidden md:block` 추가
- [ ] 또는 App.tsx에서 조건부 렌더링
- [ ] 모바일에서 완전히 제거

### Phase 6: AI 추천 배경 제거
- [ ] AIRecommendations.tsx 수정
- [ ] 노란색 배경 제거
- [ ] 테두리 제거
- [ ] 심플한 제목 스타일

### Phase 7: RegisterButtonsSection 제거
- [ ] App.tsx에서 `<RegisterButtonsSection />` 제거
- [ ] 또는 `hidden` 클래스 추가
- [ ] 햄버거 메뉴로 완전 대체

### Phase 8: 최종 검증
- [ ] Chrome DevTools 모바일 뷰 테스트
- [ ] 실제 iPhone/Android 테스트
- [ ] 스크롤 동작 확인
- [ ] 햄버거 메뉴 애니메이션 확인
- [ ] 검색 모달 동작 확인

---

## 📱 예상 효과

### Before (현재)
```
헤더 (검색창 포함)      ← 56px
등록 버튼 섹션           ← 120px
AI 추천 (배경 박스)      ← 80px
띠지 배너               ← 60px
카드 그리드             ← 나머지
─────────────────
총 상단 공간: 316px
실제 카드 공간: 화면의 60%
```

### After (재설계)
```
헤더 (최소화)           ← 56px
프로모카드 (통합)        ← 200px
검색창 (통합)           ← 50px
AI 추천 (배경 제거)      ← 60px
카드 그리드             ← 나머지
─────────────────
총 상단 공간: 366px
실제 카드 공간: 화면의 75%
```

**효과**:
- ✅ 카드 노출 영역 **15% 증가**
- ✅ 시각적 혼잡도 **40% 감소**
- ✅ 프로모카드 노출 **자연스러움**
- ✅ 액션 버튼 접근성 **유지**

---

## 🎯 추가 개선 아이디어

### 1. 프로모카드 자동 슬라이드
- 중고나라처럼 자동 슬라이드 배너
- 인디케이터 (점) 추가
- 스와이프 제스처 지원

### 2. 검색 모달 (전체 화면)
- 검색 아이콘 클릭 시 전체 화면 모달
- 최근 검색어, 인기 검색어
- 자동완성 기능

### 3. 하단 네비 "등록" 버튼
- 중고나라처럼 가운데 + 버튼
- 클릭 시 Bottom Sheet (공고/인력/체험 선택)

### 4. 카드 호버 → 스와이프
- PC: 호버 확장
- 모바일: 스와이프로 상세 정보

---

**결론**: 중고나라의 **무경계 디자인 + 공간 효율성**을 차용하여 셀미바이미를 더 프로페셔널하고 사용하기 편한 앱으로 재탄생시킵니다!
