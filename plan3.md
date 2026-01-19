# UI/UX 개선 계획서 (Plan 3)

> **피드백 요약**: "크게 보이는 것은 아니지만 부분적으로 사용자 경험을 해치는 것들이 많이 있습니다. 클릭해도 아무 반응 없거나 직관적이지 않거나 화면을 가리고 있거나 등등. 또한 현재의 레이아웃 역시 바이브코딩 같은 느낌은 아직은 많이 들어요."

---

## 0. 라이브 사이트 테스트 결과 (2026-01-19)

> **테스트 URL**: https://e47e5c3c.sellmebuyme.pages.dev/

### 정상 작동 확인 ✅
| 기능 | 결과 | 비고 |
|------|------|------|
| 패널 토글 버튼 | ✅ 작동 | "패널 접기" ↔ "패널 펼치기" 전환 |
| 카드 클릭 → 상세 패널 | ✅ 작동 | 상세 정보 패널 정상 표시 |
| 상세 패널 닫기 버튼 | ✅ 작동 | 패널 닫힘 |
| 로그인 버튼 → 모달 | ✅ 작동 | Google/카카오 로그인 옵션 표시 |
| 길찾기 버튼 | ✅ 표시됨 | 각 카드에 길찾기 버튼 존재 |

### 문제 발견 ❌
| 문제 | 심각도 | 상세 설명 |
|------|--------|----------|
| 검색 버튼 aria-label 없음 | 🔴 높음 | 버튼이 빈 상태로 표시됨 (접근성 트리에서 레이블 없음) |
| 로그인/회원가입 버튼 동일 모달 | 🟡 중간 | 두 버튼 모두 같은 인증 모달 열림, 구분 불가 |
| 드롭다운 버튼 응답 느림 | 🟡 중간 | 학교급/과목 드롭다운 클릭 시 타임아웃 발생 |
| 모달 닫기 지연 | 🟡 중간 | 첫 클릭에 반응 느림, 두 번째 시도 필요할 때 있음 |

### 테스트 메모
- 카드 30개 정상 로드됨 (공고 목록 30개 표시)
- 지도 줌 컨트롤 정상 작동 (확대/축소 버튼)
- 카카오 맵 링크 정상 작동
- 패널 토글 버튼 개선됨 (이전 수정 반영)

---

## 1. 문제점 분석 요약

### 1.1 클릭해도 반응 없는 요소들

| 위치 | 문제점 | 심각도 |
|------|--------|--------|
| Hero.tsx:1061-1067 | 로고 클릭 시 의미 없는 동작 (같은 페이지 재이동) | 중 |
| Hero.tsx:1022-1035 | 로그인/회원가입 버튼이 동일한 모달 열음 | 중 |
| Hero.tsx:1208-1217 | 목록 접기 아이콘이 버튼처럼 보이지만 별도 이벤트 없음 | 낮 |
| CardGrid.tsx:93-117 | wrapper div 클릭 시 아무 동작 없음 | 중 |
| CardSkeleton.tsx | 스켈레톤 영역 클릭 가능하지만 반응 없음 | 낮 |

### 1.2 직관적이지 않은 UI 요소

| 위치 | 문제점 | 심각도 |
|------|--------|--------|
| Hero.tsx:1181-1188 | 검색 버튼에 aria-label 없음 | 높 |
| Hero.tsx:1162-1169 | 필터 취소 버튼에 aria-label 없음 | 높 |
| Hero.tsx:1348-1359 | 패널 토글 버튼이 너무 작고 찾기 어려움 | 높 |
| MobileBottomNav.tsx:47-52 | 순환 토글 방식 예측 불가 (job→talent→experience) | 높 |
| EmptyState.tsx:264 | 하드코딩된 추천 검색어 (실제 데이터 기반 아님) | 중 |

### 1.3 화면을 가리는 요소

| 위치 | 문제점 | 심각도 |
|------|--------|--------|
| Hero.tsx:437-444 | 마커 팝업이 화면 밖으로 벗어날 수 있음 | 중 |
| Hero.tsx:1096-1111 | 드롭다운이 패널 하단에서 잘릴 수 있음 | 중 |
| JobDetailPanel + DirectionsPanel | 총 840px+ 좌측 점유, 지도 영역 크게 가림 | 높 |
| 패널들 | 외부 클릭으로 닫기 불가 | 중 |

### 1.4 피드백 없는 인터랙션

| 위치 | 문제점 | 심각도 |
|------|--------|--------|
| Hero.tsx:1076-1094 | 드롭다운 버튼 active 상태 없음 | 중 |
| Hero.tsx:1173-1189 | 검색 중 로딩 상태 없음 | 높 |
| Hero.tsx:1318-1329 | 길찾기 버튼 클릭 후 피드백 없음 | 중 |
| CardGrid.tsx | 스켈레톤→카드 전환 애니메이션 없음 | 중 |
| JobDetailPanel/DirectionsPanel | 열림/닫힘 애니메이션 없음 | 중 |

### 1.5 디자인 일관성 문제 ("바이브코딩" 느낌)

| 위치 | 문제점 |
|------|--------|
| 전체 | 버튼 스타일 불일치 (rounded-full vs rounded-lg) |
| 전체 | 색상 테마 불일치 (브랜드 #5B6EF7 vs 검은색/회색 CTA) |
| 전체 | 여백/간격 불일치 (py-3 vs py-2.5, border 색상 혼용) |
| 전체 | 터치 타겟 크기 일관성 없음 (24px ~ 52px) |

---

## 2. 개선 계획

### Phase 1: 접근성 및 기본 인터랙션 수정 (P1 - 필수)

#### 1.1 aria-label 및 접근성 추가
```
- Hero.tsx: 검색 버튼 aria-label="검색" 추가
- Hero.tsx: 필터 취소 버튼 aria-label="필터 해제" 추가
- DirectionsPanel.tsx:286-293: 닫기 버튼 aria-label="닫기" 추가
- EmptyState.tsx: 액션 버튼 focus-visible 스타일 추가
```

#### 1.2 터치 타겟 크기 통일 (최소 44x44px)
```
- JobDetailPanel.tsx:39-47: 닫기 버튼 p-1 → p-2.5, 아이콘 w-5 h-5
- DirectionsPanel.tsx:286-293: 닫기 버튼 p-1.5 → p-2.5
- DirectionsPanel.tsx:328-366: 출발지 모드 버튼들 크기 확대
- Hero.tsx:1348-1359: 패널 토글 버튼 크기 확대 w-5 → w-8
```

#### 1.3 클릭 피드백 추가
```
- 모든 버튼에 active:scale-95 또는 active:bg-[색상] 추가
- 드롭다운 버튼 active 상태 스타일 추가
- CardSkeleton.tsx: pointer-events-none 추가
```

---

### Phase 2: 직관성 개선 (P2 - 중요)

#### 2.1 로그인/회원가입 버튼 분리
```tsx
// 현재: 둘 다 동일한 모달
<button onClick={() => setIsAuthModalOpen(true)}>로그인</button>
<button onClick={() => setIsAuthModalOpen(true)}>회원가입</button>

// 개선: 각각 다른 초기 탭으로 열림
<button onClick={() => openAuthModal('login')}>로그인</button>
<button onClick={() => openAuthModal('signup')}>회원가입</button>
```

#### 2.2 MobileBottomNav 토글 개선
```
현재: 순환 방식 (job → talent → experience → job...)
개선 옵션:
  A) 현재 선택 상태 명확히 표시 + 길게 누르면 선택 메뉴
  B) 토글 대신 탭 바로 분리 (공고 | 인재 | 체험)
  C) 순환 방향 표시 화살표 추가 + 현재 상태 뱃지
```

#### 2.3 로고 클릭 동작 개선
```tsx
// 현재: 단순 "/" 이동
// 개선: 필터 초기화 + 스크롤 최상단
const handleLogoClick = (e: React.MouseEvent) => {
  e.preventDefault();
  resetAllFilters();
  scrollToTop();
};
```

#### 2.4 검색 로딩 상태 추가
```tsx
// 검색 버튼에 로딩 스피너
{isSearching ? (
  <Spinner size={16} />
) : (
  <SearchIcon size={16} />
)}
```

---

### Phase 3: 패널 UX 개선 (P2 - 중요)

#### 3.1 열림/닫힘 애니메이션 추가
```tsx
// framer-motion 사용
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
    >
      <JobDetailPanel ... />
    </motion.div>
  )}
</AnimatePresence>
```

#### 3.2 외부 클릭으로 패널 닫기
```tsx
// useClickOutside 훅 적용
const panelRef = useRef(null);
useClickOutside(panelRef, () => setSelectedJob(null));
```

#### 3.3 패널 최소화/확장 토글
```
- 패널 헤더에 최소화 버튼 추가
- 최소화 시 제목만 표시되는 작은 탭으로 변환
- 지도 영역 가림 최소화
```

#### 3.4 마커 팝업 위치 자동 조정
```tsx
// 화면 경계 감지 후 위치 조정
const getPopupPosition = (markerPoint: Point, mapBounds: Bounds) => {
  let x = markerPoint.x + 20;
  let y = markerPoint.y - 100;

  // 화면 밖으로 벗어나면 반대 방향으로
  if (y < 0) y = markerPoint.y + 20;
  if (x + popupWidth > mapBounds.right) x = markerPoint.x - popupWidth - 20;

  return { x, y };
};
```

---

### Phase 4: 디자인 일관성 확보 (P3 - 개선)

#### 4.1 버튼 스타일 통일
```css
/* 디자인 시스템 정의 */
.btn-primary {
  @apply px-4 py-2.5 rounded-lg bg-[#5B6EF7] text-white
         hover:bg-[#4A5DE6] active:scale-[0.98]
         transition-all duration-150;
}

.btn-secondary {
  @apply px-4 py-2.5 rounded-lg bg-white border border-gray-200
         text-gray-700 hover:bg-gray-50 active:bg-gray-100
         transition-all duration-150;
}

.btn-ghost {
  @apply px-3 py-2 rounded-lg text-gray-600
         hover:bg-gray-100 active:bg-gray-200
         transition-all duration-150;
}
```

#### 4.2 색상 팔레트 정리
```
Primary: #5B6EF7 (브랜드 컬러 - 모든 주요 CTA에 사용)
Secondary: #7aa3cc (공고), #7db8a3 (인재), #f4c96b (체험)
Neutral: gray-50 ~ gray-900 (Tailwind 기본)
Success/Error: green-500, red-500
```

#### 4.3 간격 시스템 통일
```
패널 패딩: px-4 py-3 (모든 패널 헤더/섹션)
버튼 간격: gap-2 (소), gap-3 (중), gap-4 (대)
카드 간격: gap-4 (모바일), gap-6 (데스크톱)
```

#### 4.4 스켈레톤 → 카드 전환 개선
```tsx
// framer-motion layout 애니메이션
<motion.div layout>
  {loading ? <CardSkeleton /> : <Card />}
</motion.div>
```

---

### Phase 5: 반응형 및 최적화 (P3 - 개선)

#### 5.1 패널 반응형 처리
```tsx
// 모바일: 하단 시트
// 데스크톱: 사이드 패널
const isMobile = useMediaQuery('(max-width: 768px)');

{isMobile ? (
  <BottomSheet>{content}</BottomSheet>
) : (
  <SidePanel>{content}</SidePanel>
)}
```

#### 5.2 CardGrid 반응형 확장
```tsx
// 현재
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// 개선
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6"
```

---

## 3. 구현 우선순위 및 일정

| 단계 | 작업 | 예상 난이도 | 우선순위 |
|------|------|------------|----------|
| **Phase 1** | 접근성 및 기본 인터랙션 | 낮음 | P1 (필수) |
| 1.1 | aria-label 추가 | ⭐ | 즉시 |
| 1.2 | 터치 타겟 크기 통일 | ⭐⭐ | 즉시 |
| 1.3 | 클릭 피드백 추가 | ⭐ | 즉시 |
| **Phase 2** | 직관성 개선 | 중간 | P2 (중요) |
| 2.1 | 로그인/회원가입 분리 | ⭐⭐ | 1주차 |
| 2.2 | MobileBottomNav 토글 개선 | ⭐⭐⭐ | 1주차 |
| 2.3 | 로고 클릭 동작 개선 | ⭐ | 1주차 |
| 2.4 | 검색 로딩 상태 추가 | ⭐⭐ | 1주차 |
| **Phase 3** | 패널 UX 개선 | 중간 | P2 (중요) |
| 3.1 | 열림/닫힘 애니메이션 | ⭐⭐ | 2주차 |
| 3.2 | 외부 클릭으로 닫기 | ⭐⭐ | 2주차 |
| 3.3 | 패널 최소화 토글 | ⭐⭐⭐ | 2주차 |
| 3.4 | 마커 팝업 위치 조정 | ⭐⭐ | 2주차 |
| **Phase 4** | 디자인 일관성 | 중간 | P3 (개선) |
| 4.1 | 버튼 스타일 통일 | ⭐⭐ | 3주차 |
| 4.2 | 색상 팔레트 정리 | ⭐⭐ | 3주차 |
| 4.3 | 간격 시스템 통일 | ⭐⭐ | 3주차 |
| 4.4 | 전환 애니메이션 | ⭐⭐ | 3주차 |
| **Phase 5** | 반응형 및 최적화 | 높음 | P3 (개선) |
| 5.1 | 패널 반응형 처리 | ⭐⭐⭐ | 4주차 |
| 5.2 | CardGrid 반응형 확장 | ⭐ | 4주차 |

---

## 4. 예상 결과

### Before (현재)
- 클릭해도 반응 없는 요소 다수
- 버튼/컴포넌트 스타일 불일치
- 패널이 지도 영역 과도하게 가림
- 애니메이션/피드백 부재로 "바이브코딩" 느낌

### After (개선 후)
- 모든 인터랙티브 요소에 명확한 피드백
- 통일된 디자인 시스템 적용
- 패널 최소화/애니메이션으로 지도 활용도 향상
- 부드러운 전환 효과로 프로페셔널한 느낌

---

## 5. 참고 사항

### 의존성 추가 예상
- `framer-motion`: 이미 설치됨 (애니메이션)
- `@radix-ui/react-popover`: 팝업 위치 자동 조정 (선택적)

### 테스트 체크리스트
- [ ] 스크린 리더로 모든 버튼 레이블 확인
- [ ] 터치 기기에서 버튼 터치 테스트
- [ ] 다양한 화면 크기에서 패널 동작 확인
- [ ] 애니메이션 부드러움 확인 (60fps)
- [ ] 외부 클릭 닫기 동작 확인

---

**작성일**: 2026-01-18
**작성자**: Claude (피드백 기반 분석)
