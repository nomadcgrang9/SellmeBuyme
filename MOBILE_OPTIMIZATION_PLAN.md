# 모바일 최적화 계획 (Mobile-First PWA Transformation)

> 생성일: 2025-11-06
> 목표: 메인페이지를 모바일 앱처럼 최적화하여 PWA 경험 극대화

---

## 📊 현재 상태 분석

### ✅ 이미 구현된 기능
1. **PWA 기본 설정**
   - Service Worker 자동 등록 (vite-plugin-pwa)
   - 개발자노트(/note) PWA 구현 완료
   - 캐싱 전략: 폰트, Supabase, GitHub API
   - PWA 아이콘: 192x192, 512x512 준비됨

2. **모바일 컴포넌트**
   - `BottomNav.tsx`: 하단 네비게이션 바 (프로필/공고/인력/체험)
   - `StatisticsBanner.tsx`: 통계 배너
   - `RegisterButtonsSection.tsx`: 등록 버튼 섹션

3. **반응형 디자인**
   - Tailwind breakpoints 사용 (`md:hidden`, `sm:`, `lg:`)
   - 모바일 우선 레이아웃 일부 적용

4. **위치 기반 기능**
   - `useGeolocation` 훅 구현
   - 카드 거리별 정렬 기능

5. **색상 시스템**
   - Primary: `#a8c5e0` (공고)
   - Talent: `#c5e3d8` (인력)
   - Experience: `#ffd98e` (체험)
   - 그라데이션 팔레트 완비

### ❌ 개선 필요 사항

#### 1. PWA 구성
- **문제**: PWA start_url이 `/note`만 지정됨
- **목표**: 메인페이지(`/`)를 PWA 진입점으로 확장

#### 2. 모바일 UI/UX
- **문제**: 데스크톱 우선 디자인, 앱다운 느낌 부족
- **목표**:
  - 네이티브 앱 같은 UX (스와이프, 풀 투 리프레시 등)
  - 터치 최적화 (버튼 크기 44x44px 이상)
  - 제스처 지원 (스와이프 네비게이션)

#### 3. 성능 최적화
- **문제**: App.tsx 1,105줄 (너무 큼), 초기 로딩 최적화 필요
- **목표**:
  - 코드 스플리팅
  - 지연 로딩 (Lazy Loading)
  - 이미지 최적화

#### 4. 오프라인 경험
- **문제**: 네트워크 없을 때 사용자 경험 부족
- **목표**:
  - 오프라인 페이지 구현
  - 캐시된 콘텐츠 표시
  - 네트워크 복구 시 자동 동기화

---

## 🎯 Phase 1: PWA 확장 (메인페이지 PWA화)

### 1.1 PWA Manifest 업데이트
**파일**: `vite.config.ts`

**변경사항**:
```typescript
manifest: {
  name: '셀미바이미 - 교육공고 통합 플랫폼',
  short_name: '셀바',
  description: '학교 공고, 강사 인력풀, 체험활동을 한눈에',
  start_url: '/',           // ← 메인페이지로 변경
  scope: '/',
  display: 'standalone',
  theme_color: '#a8c5e0',
  background_color: '#ffffff',
  orientation: 'portrait-primary',
  categories: ['education', 'productivity'],
  icons: [
    {
      src: '/pwa-icons/icon-192x192.png',
      sizes: '192x192',
      type: 'image/png',
      purpose: 'any maskable'
    },
    {
      src: '/pwa-icons/icon-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ],
  shortcuts: [
    {
      name: '공고 보기',
      url: '/?view=job',
      description: '최신 교육 공고 확인'
    },
    {
      name: '인력풀',
      url: '/?view=talent',
      description: '강사 인력 검색'
    },
    {
      name: '개발자노트',
      url: '/note',
      description: '개발팀 협업 공간'
    }
  ]
}
```

**효과**:
- 메인페이지를 앱 진입점으로 설정
- 앱 바로가기 제공 (Android)
- 앱 카테고리 명시

---

## 🎯 Phase 2: 모바일 UI 개선

### 2.1 헤더 모바일 최적화
**파일**: `src/components/layout/Header.tsx` (353줄)

**현재 문제점**:
- 데스크톱 우선 디자인
- 모바일에서 필터가 복잡함
- 검색 UX 개선 필요

**개선 계획**:
1. **모바일 전용 헤더 컴포넌트 분리**
   ```
   Header.tsx → DesktopHeader.tsx (데스크톱)
              → MobileHeader.tsx (모바일)
   ```

2. **모바일 헤더 특징**:
   - 검색바 중심 단순 레이아웃
   - 필터는 하단 시트(Bottom Sheet)로 표시
   - 스크롤 시 헤더 숨김/표시 (Hide on Scroll)
   - Safe Area 대응 (노치 지원)

3. **구현 우선순위**:
   - [ ] `MobileHeader.tsx` 생성
   - [ ] `BottomSheet.tsx` 필터 컴포넌트
   - [ ] 스크롤 감지 훅 (`useScrollDirection`)
   - [ ] Safe Area CSS (`env(safe-area-inset-*)`)

### 2.2 카드 그리드 모바일 최적화
**파일**: `src/components/cards/CardGrid.tsx`

**개선 계획**:
1. **Virtual Scrolling 구현**
   - 대량 카드 렌더링 최적화
   - `react-window` 또는 `react-virtuoso` 사용

2. **Pull to Refresh**
   - 위로 당겨서 새로고침
   - 네이티브 앱 느낌

3. **스와이프 제스처**
   - 카드 스와이프로 상세보기
   - 찜하기/공유 제스처

### 2.3 하단 네비게이션 개선
**파일**: `src/components/mobile/BottomNav.tsx`

**현재 상태**:
- 기본 탭 네비게이션 구현됨
- 4개 탭: 프로필/공고/인력/체험

**개선 계획**:
1. **햅틱 피드백 추가**
   - 탭 클릭 시 진동 (Vibration API)

2. **뱃지 시스템**
   - 새 공고 알림 뱃지
   - 추천 카운트 표시

3. **애니메이션 강화**
   - 탭 전환 스무스 애니메이션
   - 아이콘 활성화 효과

---

## 🎯 Phase 3: 성능 최적화

### 3.1 코드 스플리팅
**파일**: `src/App.tsx` (1,105줄 → 분리 필요)

**분리 계획**:
```
App.tsx (1,105줄)
  ↓ 분리
├── MainView.tsx (카드 그리드, 검색)
├── RecommendationView.tsx (AI 추천)
├── ProfileView.tsx (프로필 관리)
└── ModalManager.tsx (모달 통합 관리)
```

**구현**:
```typescript
// App.tsx
const MainView = lazy(() => import('./views/MainView'));
const RecommendationView = lazy(() => import('./views/RecommendationView'));

<Suspense fallback={<LoadingSpinner />}>
  <MainView />
</Suspense>
```

### 3.2 이미지 최적화
**현재 문제**:
- 카드 썸네일 최적화 부족
- 고해상도 이미지 로딩 지연

**해결책**:
1. **WebP 변환**
   - 기존 PNG/JPG → WebP
   - 50~80% 용량 절감

2. **Lazy Loading**
   - `loading="lazy"` 속성
   - Intersection Observer 활용

3. **Responsive Images**
   ```html
   <picture>
     <source srcset="image-mobile.webp" media="(max-width: 640px)">
     <source srcset="image-desktop.webp">
     <img src="image-fallback.jpg" alt="..." />
   </picture>
   ```

### 3.3 캐싱 전략 개선
**파일**: `vite.config.ts`

**현재 Supabase 캐싱**:
```typescript
{
  urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
  handler: 'CacheFirst',
  options: {
    maxEntries: 200,
    maxAgeSeconds: 60 * 30  // 30분
  }
}
```

**개선안**:
```typescript
// API 응답 유형별 캐싱
{
  // 공고 데이터 (자주 변경)
  urlPattern: /\/rest\/v1\/job_postings/,
  handler: 'NetworkFirst',
  maxAgeSeconds: 60 * 5  // 5분
},
{
  // 사용자 프로필 (자주 변경)
  urlPattern: /\/rest\/v1\/user_profiles/,
  handler: 'NetworkFirst',
  maxAgeSeconds: 60 * 10  // 10분
},
{
  // 정적 데이터 (학교 목록 등)
  urlPattern: /\/rest\/v1\/crawl_boards/,
  handler: 'CacheFirst',
  maxAgeSeconds: 60 * 60 * 24  // 1일
}
```

---

## 🎯 Phase 4: 네이티브 앱 기능

### 4.1 설치 프롬프트 최적화
**파일**: 새 파일 `src/components/pwa/InstallPrompt.tsx`

**기능**:
1. **스마트 프롬프트**
   - 사용자가 3회 이상 방문 시 표시
   - 특정 액션 후 표시 (예: 공고 5개 이상 조회)

2. **A/B 테스팅**
   - 배너 스타일
   - 문구 테스트
   - 타이밍 최적화

### 4.2 오프라인 지원
**파일**: 새 파일 `src/pages/OfflinePage.tsx`

**기능**:
1. **오프라인 페이지**
   - 네트워크 없을 때 안내
   - 캐시된 최근 공고 표시

2. **백그라운드 동기화**
   - 네트워크 복구 시 자동 데이터 갱신
   - Background Sync API 활용

### 4.3 푸시 알림 (Optional)
**파일**: `src/lib/utils/pushNotification.ts`

**기능**:
1. **알림 권한 요청**
   - 사용자 동의 후 구독

2. **알림 타이밍**
   - 새 공고 등록
   - 마감 임박 공고
   - AI 추천 업데이트

---

## 🎯 Phase 5: UX 세부 개선

### 5.1 제스처 지원
**새 파일**: `src/lib/hooks/useSwipeGesture.ts`

**기능**:
- 좌우 스와이프: 탭 전환
- 위로 스와이프: 상세보기
- 아래로 스와이프: 닫기

### 5.2 햅틱 피드백
**새 파일**: `src/lib/utils/haptic.ts`

```typescript
export function triggerHaptic(type: 'light' | 'medium' | 'heavy') {
  if ('vibrate' in navigator) {
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30]
    };
    navigator.vibrate(patterns[type]);
  }
}
```

### 5.3 스켈레톤 로딩
**파일**: `src/components/common/SkeletonCard.tsx`

**개선**:
- 카드 로딩 시 스켈레톤 표시
- 실제 카드와 동일한 레이아웃

### 5.4 빈 상태 디자인
**파일**: `src/components/common/EmptyState.tsx`

**시나리오**:
- 검색 결과 없음
- 필터 결과 없음
- 오프라인 상태

---

## 📐 디자인 시스템 확장

### 모바일 전용 컴포넌트 라이브러리

```
src/components/mobile/
├── MobileHeader.tsx         (모바일 헤더)
├── BottomSheet.tsx          (필터 시트)
├── PullToRefresh.tsx        (당겨서 새로고침)
├── SwipeableCard.tsx        (스와이프 카드)
├── FloatingButton.tsx       (플로팅 액션 버튼)
├── SafeAreaView.tsx         (Safe Area Wrapper)
└── TabBar.tsx               (탭 바 개선)
```

### Tailwind 모바일 유틸리티 추가

```typescript
// tailwind.config.ts
theme: {
  extend: {
    spacing: {
      'safe-top': 'env(safe-area-inset-top)',
      'safe-bottom': 'env(safe-area-inset-bottom)',
      'safe-left': 'env(safe-area-inset-left)',
      'safe-right': 'env(safe-area-inset-right)',
    },
    minHeight: {
      'touch-target': '44px',  // iOS 터치 타겟 최소 크기
    },
    fontSize: {
      'mobile-xs': ['12px', { lineHeight: '16px' }],
      'mobile-sm': ['14px', { lineHeight: '20px' }],
      'mobile-base': ['16px', { lineHeight: '24px' }],
      'mobile-lg': ['18px', { lineHeight: '28px' }],
    }
  }
}
```

---

## 📊 성능 목표

### Core Web Vitals 목표치
- **LCP (Largest Contentful Paint)**: < 2.5s
- **FID (First Input Delay)**: < 100ms
- **CLS (Cumulative Layout Shift)**: < 0.1

### 모바일 Lighthouse 점수
- **Performance**: > 90
- **Accessibility**: > 95
- **Best Practices**: > 95
- **SEO**: > 90
- **PWA**: 100

---

## 🚀 구현 우선순위

### High Priority (1주차)
1. ✅ PWA Manifest 업데이트 (메인페이지 진입점)
2. ⬜ 모바일 헤더 분리 및 최적화
3. ⬜ Bottom Sheet 필터 구현
4. ⬜ Pull to Refresh 구현
5. ⬜ Safe Area 대응

### Medium Priority (2주차)
1. ⬜ 코드 스플리팅 (App.tsx 분리)
2. ⬜ Virtual Scrolling 구현
3. ⬜ 이미지 최적화 (WebP)
4. ⬜ 스켈레톤 로딩
5. ⬜ 오프라인 페이지

### Low Priority (3주차)
1. ⬜ 스와이프 제스처
2. ⬜ 햅틱 피드백
3. ⬜ 설치 프롬프트 최적화
4. ⬜ 푸시 알림 (Optional)
5. ⬜ 백그라운드 동기화

---

## 📝 체크리스트

### PWA 체크리스트
- [x] Service Worker 등록
- [x] Manifest.json 기본 설정
- [x] 아이콘 준비 (192, 512)
- [ ] Splash Screen 최적화
- [ ] Apple Touch Icon
- [ ] 오프라인 폴백
- [ ] 설치 가능성 확인
- [ ] iOS Safari 호환성

### 모바일 UX 체크리스트
- [x] 반응형 레이아웃
- [ ] 터치 타겟 크기 (44x44px)
- [ ] 스와이프 제스처
- [ ] 햅틱 피드백
- [ ] Pull to Refresh
- [ ] 스크롤 성능
- [ ] Safe Area 대응
- [ ] 가로 모드 지원

### 성능 체크리스트
- [ ] 코드 스플리팅
- [ ] 지연 로딩
- [ ] 이미지 최적화
- [ ] 캐싱 전략
- [ ] Bundle 크기 분석
- [ ] Lighthouse 점수 확인

---

## 🎨 디자인 참고

### 네이티브 앱 UX 패턴
1. **Instagram**: 카드 스와이프, 풀 투 리프레시
2. **Twitter**: 무한 스크롤, 스켈레톤 로딩
3. **Airbnb**: 필터 Bottom Sheet, 위치 기반 정렬
4. **LinkedIn**: 추천 알고리즘, 프로필 최적화

### 색상 일관성
- Primary: `#a8c5e0` (공고 - 스카이블루)
- Talent: `#c5e3d8` (인력 - 민트)
- Experience: `#ffd98e` (체험 - 옐로우)
- Background: `#ffffff` (화이트)
- Surface: `#f9fafb` (라이트 그레이)

---

## 📌 주의사항

### 기술적 제약
1. **iOS Safari 제한**
   - Push 알림 미지원
   - Background Sync 제한적
   - 설치 프롬프트 커스텀 불가

2. **Android Chrome 우선**
   - 대부분 PWA 기능 완벽 지원
   - 설치 경험 우수

3. **오프라인 우선 아키텍처**
   - 모든 기능이 네트워크 필수는 아님
   - 캐시된 데이터로 최대한 동작

### 호환성 테스트
- [ ] iOS Safari 15+
- [ ] Android Chrome 100+
- [ ] Samsung Internet
- [ ] Firefox Mobile
- [ ] Edge Mobile

---

## 📚 참고 자료

### PWA
- [web.dev - PWA](https://web.dev/progressive-web-apps/)
- [MDN - PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)

### 모바일 UX
- [Material Design - Mobile](https://m3.material.io/)
- [iOS Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)

### 성능 최적화
- [web.dev - Performance](https://web.dev/performance/)
- [React Performance Optimization](https://react.dev/learn/render-and-commit)

---

**다음 단계**: Phase 1 PWA 확장부터 시작하시겠습니까?
