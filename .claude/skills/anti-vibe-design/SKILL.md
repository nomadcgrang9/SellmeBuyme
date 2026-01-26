---
name: anti-vibe-design
description: SellmeBuyme (학교일자리) 프로젝트 디자인 시스템 및 지침. 모든 UI/UX 작업 시 반드시 참조. Keywords: design, ui, component, 디자인, 컴포넌트, 깔끔, clean, vibe, anti-vibe, 이모지, 아이콘, icon, emoji, tailwind, styling, modal, button, card, map
---

# SellmeBuyme Design System

> **모든 프론트엔드 디자인 작업 시 반드시 이 파일을 먼저 읽고 시작하세요.**

## 🚨 절대규칙 (Absolute Rules)

**아래 규칙은 어떤 상황에서도 예외 없이 적용됩니다. 사용자가 명시적으로 허락한 경우에만 예외를 둘 수 있습니다.**

### Rule 1: 이모지 금지
```tsx
// ❌ 절대 금지
<h2>📢 공고 목록</h2>
<button>🎯 검색하기 ✨</button>
<p>✅ 저장되었습니다!</p>

// ✅ 허용
<h2>공고 목록</h2>
<button>검색하기</button>
<p>저장되었습니다</p>
```

**예외 없음**: 이모지는 절대 사용하지 않습니다.

### Rule 2: 글자 뒤 배경색 금지
```tsx
// ❌ 절대 금지 - 형광펜 스타일
<span className="bg-yellow-200 px-2">긴급</span>
<div className="bg-blue-100 p-2">중요한 공고</div>
<p className="bg-green-50">알림</p>

// ✅ 허용 - 폰트 굵기/색상으로 강조
<span className="font-bold text-red-600">긴급</span>
<span className="font-semibold text-gray-800">중요한 공고</span>
```

### Rule 3: 과도한 원색 사용 금지
```tsx
// ❌ 금지 - 촌스러운 원색 조합
<div className="bg-yellow-300 text-red-500">
<p className="text-pink-500">안녕하세요</p>
<button className="bg-purple-600 text-yellow-300">

// ✅ 허용 - 프로젝트 컬러 팔레트 사용
<div className="bg-blue-500 text-white">
<p className="text-gray-700">안녕하세요</p>
<button className="bg-[#3B82F6] text-white">
```

### Rule 4: 컨셉 일관성 유지
- **파란색 계열**: 메인 색상 (#3B82F6)
- **소프트 레드**: 강조 포인트 (#F87171)
- **회색 계열**: 중립 UI 요소
- **미니멀**: 불필요한 장식 요소 배제

### Rule 5: 바이브코딩 냄새 금지
```tsx
// ❌ 절대 금지 - 어디서 가져온 듯한 스타일
<div className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500">
<button className="shadow-2xl rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
<div className="border-8 border-yellow-400 rounded-xl animate-bounce">

// ✅ 허용 - 프로젝트 고유 스타일
<div className="bg-white border border-gray-200 rounded-lg">
<button className="bg-[#3B82F6] text-white rounded-lg hover:bg-blue-600">
<div className="border border-gray-100 rounded-xl">
```

---

## 🎨 디자인 토큰

### 컬러 팔레트

#### Primary Colors (주요 색상)
| 용도 | Tailwind Class | HEX | 사용처 |
|------|---------------|-----|--------|
| 메인 파랑 | `bg-[#3B82F6]` | #3B82F6 | 배너, 주요 버튼 |
| 소프트 레드 | `bg-[#F87171]` | #F87171 | BETA 배지, 긴급 공고 |
| 보라 | `bg-[#5B6EF7]` | #5B6EF7 | 특정 강조 (제한적) |
| 기본 배경 | `bg-white` | #FFFFFF | 카드, 모달, 패널 |
| 연한 배경 | `bg-gray-50` | #F9FAFB | 메인 영역 |

#### Text Colors (텍스트 색상)
| 용도 | Tailwind Class | 사용처 |
|------|---------------|--------|
| 본문 텍스트 | `text-gray-800` | 제목, 중요 텍스트 |
| 보조 텍스트 | `text-gray-600` | 설명, 레이블 |
| 힌트/약한 | `text-gray-500` | 부가 정보, 날짜 |
| 비활성 | `text-gray-400` | 플레이스홀더 |
| 링크 | `text-blue-600` | 클릭 가능한 텍스트 |
| 에러 | `text-red-600` | 경고, 에러 메시지 |

#### Border/Divider Colors (테두리 색상)
| 용도 | Tailwind Class | 사용처 |
|------|---------------|--------|
| 일반 테두리 | `border-gray-200` | 카드, 모달 |
| 약한 테두리 | `border-gray-100` | 구분선 |
| 호버 테두리 | `border-gray-300` | 마우스 오버 시 |

#### Functional Colors (기능 색상)
| 용도 | Tailwind Class | HEX | 사용처 |
|------|---------------|-----|--------|
| 긴급 공고 | `text-red-600` | #DC2626 | is_urgent 태그 |
| 성공 | `text-green-600` | #16A34A | 저장 완료 |
| 경고 | `text-yellow-600` | #CA8A04 | 주의 메시지 |
| 정보 | `text-blue-600` | #2563EB | 안내 메시지 |

### 타이포그래피

#### 폰트 패밀리
| 용도 | Tailwind Class | 폰트 | 사용처 |
|------|---------------|------|--------|
| 본문 | `font-sans` | KakaoSmallSans, esamanru | 일반 텍스트 |

#### 폰트 사이즈 패턴
```tsx
// 대형 제목
className="text-2xl font-bold"            // 24px
className="text-3xl font-bold"            // 30px

// 섹션 제목
className="text-xl font-semibold"         // 20px
className="text-lg font-medium"           // 18px

// 본문/UI
className="text-base"                     // 16px
className="text-sm"                       // 14px
className="text-xs"                       // 12px
```

### Border Radius (둥근 모서리)

| 용도 | Tailwind Class | 픽셀 | 사용처 |
|------|---------------|------|--------|
| 작은 요소 | `rounded-md` | 6px | 태그, 작은 버튼 |
| 일반 | `rounded-lg` | 8px | 버튼, 입력 필드 |
| 카드/모달 | `rounded-xl` | 12px | 카드, 모달 |
| 대형 카드 | `rounded-2xl` | 16px | 메인 패널 |

### Shadow (그림자)

```tsx
// ✅ 허용되는 그림자
className="shadow-sm"                          // 미세한 그림자
className="shadow-md"                          // 일반 카드
className="shadow-lg"                          // 모달, 드롭다운
className="shadow-xl"                          // 패널

// ❌ 금지 - 과한 그림자
className="shadow-2xl"
className="shadow-[0_0_50px_rgba(0,0,0,0.5)]"
```

### Spacing (간격)

#### 카드/모달 내부 패딩
```tsx
className="p-3"     // 12px - 작은 카드
className="p-4"     // 16px - 일반 카드
className="p-6"     // 24px - 모달, 큰 카드
className="p-8"     // 32px - 대형 패널
```

#### 섹션 간격
```tsx
className="mb-2"       // 8px - 작은 요소 간
className="mb-3"       // 12px - 버튼/아이템 리스트
className="mb-4"       // 16px - 카드 리스트
className="mb-6"       // 24px - 섹션 제목 하단
className="space-y-2"  // 8px - 리스트 아이템
className="space-y-3"  // 12px - 카드 리스트
className="gap-2"      // 8px - 플렉스/그리드
className="gap-3"      // 12px - 플렉스/그리드
```

---

## 🧩 컴포넌트 패턴

### 모달 (Modal)
```tsx
// 표준 모달 구조
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
  {/* 배경 클릭으로 닫기 */}
  <div className="absolute inset-0" onClick={onClose} />

  {/* 모달 본체 */}
  <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-md mx-4 animate-scaleIn">
    {/* 제목 */}
    <div className="text-center mb-6">
      <h2 className="text-xl font-bold text-gray-800 mb-2">
        제목
      </h2>
      <div className="w-32 h-0.5 bg-[#F87171] mx-auto" />
    </div>

    {/* 내용 */}
    <div className="text-center text-gray-600 mb-6">
      <p>설명 텍스트</p>
    </div>

    {/* 버튼 */}
    <div className="space-y-3">
      <button className="w-full bg-gradient-to-r from-[#5B6EF7] to-[#3B82F6] text-white font-medium py-3 rounded-lg hover:brightness-95 transition-all">
        확인
      </button>
      <button className="w-full bg-gray-100 text-gray-600 font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-all">
        취소
      </button>
    </div>
  </div>
</div>
```

### 버튼 (Button)
```tsx
// Primary 버튼 (메인 액션)
<button className="bg-[#3B82F6] text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors">
  검색
</button>

// Secondary 버튼 (보조 액션)
<button className="bg-white border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
  취소
</button>

// Danger 버튼 (삭제 등)
<button className="bg-red-500 text-white font-medium px-4 py-2 rounded-lg hover:bg-red-600 transition-colors">
  삭제
</button>

// Ghost 버튼 (최소화)
<button className="text-gray-600 hover:text-gray-800 font-medium transition-colors">
  더보기
</button>
```

### 카드 (Card)
```tsx
// 공고 카드 (일반)
<div className="bg-white p-4 rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all cursor-pointer">
  <h3 className="text-base font-semibold text-gray-800 mb-2">
    공고 제목
  </h3>
  <p className="text-sm text-gray-600">
    학교명
  </p>
  <div className="mt-3 flex items-center gap-2">
    <span className="text-xs text-gray-500">마감일</span>
  </div>
</div>

// 공고 카드 (긴급)
<div className="bg-white p-4 rounded-lg border-2 border-red-200 shadow-sm">
  <div className="flex items-center gap-2 mb-2">
    <span className="px-2 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded">
      긴급
    </span>
    <h3 className="text-base font-semibold text-gray-800">
      공고 제목
    </h3>
  </div>
  {/* ... */}
</div>
```

### 배너 (Banner)
```tsx
// HeroCard 배너
<div className="bg-[#3B82F6] text-white p-4 rounded-lg cursor-pointer hover:brightness-95 transition-all">
  <p className="text-sm font-semibold">
    설문참여해서 커피쿠폰 받기 →
  </p>
</div>
```

### 입력 필드 (Input)
```tsx
// 검색 입력
<input
  className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
  placeholder="검색어 입력"
/>

// 드롭다운 버튼
<button className="px-3 py-2 text-xs rounded-lg border flex items-center justify-between gap-1 transition-all bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50">
  <span>선택</span>
  <ChevronDown size={16} />
</button>
```

### 토스트 (Toast)
```tsx
<div className="fixed top-20 left-1/2 -translate-x-1/2 z-50">
  <div className="flex items-center gap-3 px-5 py-3 bg-white border border-gray-200 rounded-lg shadow-lg">
    <p className="text-sm font-medium text-gray-800">메시지</p>
  </div>
</div>
```

---

## 🎯 프로젝트 특화 패턴

### 지도 마커
```tsx
// 일반 공고 마커
<div className="w-6 h-6 rounded-full bg-[#3B82F6] border-2 border-white shadow-lg" />

// 긴급 공고 마커
<div className="w-8 h-8 rounded-full bg-red-500 border-2 border-white shadow-xl animate-pulse" />
```

### 필터 버튼
```tsx
// 비활성
<button className="px-3 py-2 text-xs rounded-lg border bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50">
  학교급
</button>

// 활성
<button className="px-3 py-2 text-xs rounded-lg border bg-blue-50 border-blue-500 text-blue-600">
  학교급 ✓
</button>
```

### BETA 배지
```tsx
<span className="px-2 py-0.5 text-[10px] font-bold bg-[#F87171] text-white rounded shadow-sm">
  BETA
</span>
```

---

## 🔍 작업 전 체크리스트

모든 UI 작업 시작 전 확인:

```
□ 이모지 사용 안 함
□ 글자 뒤 배경색 사용 안 함 (형광펜 금지)
□ 프로젝트 컬러 팔레트 사용 (원색 지양)
□ 바이브코딩 냄새 나는 스타일 사용 안 함
□ 그라디언트는 메인 버튼에만 제한적 사용
□ 기존 컴포넌트 패턴과 일관성 확인
□ 데스크톱/모바일 반응형 확인
```

---

## 📂 참조 파일

디자인 작업 시 참조할 파일:

| 파일 | 설명 |
|------|------|
| `tailwind.config.ts` | 컬러, 애니메이션 정의 |
| `src/pages/new-landing/components/Hero.tsx` | 메인 레이아웃 패턴 |
| `src/pages/new-landing/components/HeroCard.tsx` | 배너 디자인 |
| `src/components/survey/WelcomeModal.tsx` | 모달 디자인 패턴 |
| `src/components/common/BetaBadge.tsx` | 배지 디자인 |
| `src/components/cards/JobCard.tsx` | 카드 디자인 패턴 |

---

## ⚡ Quick Reference

### 자주 쓰는 클래스 조합

```tsx
// 카드
"bg-white p-4 rounded-lg border border-gray-200"

// 모달
"bg-white rounded-xl shadow-xl border border-gray-200 p-6 max-w-md"

// 버튼 (Primary)
"bg-[#3B82F6] text-white font-medium px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"

// 버튼 (Secondary)
"bg-white border border-gray-200 text-gray-700 font-medium px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"

// 배너
"bg-[#3B82F6] text-white p-4 rounded-lg"

// 입력 필드
"w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"

// 배경 오버레이
"fixed inset-0 bg-black/50 backdrop-blur-sm"
```

### 한 줄 체크
```
이모지없음? ✓  형광펜없음? ✓  프로젝트컬러사용? ✓
바이브코딩금지? ✓  반응형확인? ✓
```

→ 모두 ✓면 SellmeBuyme 디자인 시스템 준수

---

## 📱 반응형 디자인 가이드

### 브레이크포인트
- `sm`: 640px (모바일 가로)
- `md`: 768px (태블릿)
- `lg`: 1024px (데스크톱)
- `xl`: 1280px (큰 데스크톱)

### 반응형 패턴
```tsx
// 텍스트 크기
className="text-sm md:text-base"

// 패딩
className="p-3 md:p-4"

// 그리드
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3"

// 숨기기/보이기
className="hidden md:block"
className="block md:hidden"
```

---

**작성일**: 2026-01-26
**버전**: 1.0
**프로젝트**: SellmeBuyme (학교일자리)
