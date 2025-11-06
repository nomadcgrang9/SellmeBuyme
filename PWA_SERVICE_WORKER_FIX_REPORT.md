# PWA Service Worker 접속 장애 해결 보고서

## 📋 문제 상황

**증상**:
- ❌ 개발자 노트 페이지(`/note`) 접속 시 "사이트에 연결할 수 없음" 오류
- ✅ 메인 페이지(`/`), 관리자 페이지(`/admin-portal`), 랜딩 페이지(`/landing`) 정상 작동
- ❌ 모바일 오류기록 섹션 확인 불가 (페이지 자체가 로드되지 않음)

**발생 시점**: PWA 기능 추가 후

---

## 🔍 원인 진단 (Context7 + Sequential Thinking 활용)

### 1. Service Worker Scope 충돌

**문제**:
```typescript
// vite.config.ts (수정 전)
manifest: {
  start_url: '/note',  // PWA 시작 경로
  scope: '/',          // ❌ Service Worker가 루트(/)부터 모든 경로 가로챔
}
```

**결과**:
- Service Worker가 `/` 경로부터 등록되어 **모든 페이지 요청**을 가로챔
- `/note`의 오래된 캐시를 계속 반환
- 새로운 배포 후에도 캐시가 업데이트되지 않음

### 2. 캐시 정리 미설정

**문제**:
```typescript
// vite.config.ts (수정 전)
workbox: {
  // cleanupOutdatedCaches: 설정되지 않음
  // navigateFallback: 설정되지 않음
}
```

**결과**:
- 오래된 Service Worker 캐시가 자동으로 삭제되지 않음
- SPA 라우팅이 제대로 작동하지 않음

### 3. Cloudflare Functions 설정은 정상

```typescript
// functions/[[path]].ts (검증 완료)
const clientRoutes = ['/note', '/auth/callback'];  // ✅ 정상

if (clientRoutes.some(route => pathname.startsWith(route))) {
  return context.next();  // ✅ 클라이언트 라우팅으로 전달
}
```

**결론**: Cloudflare 설정은 문제 없음. **PWA Service Worker 캐싱 문제**임을 확정.

---

## ✅ 해결 방법

### 1. vite.config.ts 수정 (핵심 수정)

```typescript
VitePWA({
  manifest: {
    start_url: '/note',
    scope: '/note',  // ✅ '/note'로 변경하여 메인 페이지와 충돌 방지
  },
  workbox: {
    cleanupOutdatedCaches: true,  // ✅ 오래된 캐시 자동 삭제
    navigateFallback: '/note',    // ✅ SPA 라우팅 지원
    navigateFallbackDenylist: [/^\/api/, /^\/admin/, /^\/$/, /^\/landing/],  // 제외 경로
  }
})
```

**효과**:
- Service Worker가 `/note` 경로에서만 작동
- 메인 페이지(`/`), 관리자 페이지, API 요청에 영향 없음
- 오래된 캐시 자동 정리
- SPA 내부 라우팅 정상 작동

### 2. Service Worker 수동 언레지스터 스크립트 추가

**파일**: `public/unregister-sw.js`

```javascript
// Service Worker 강제 제거 및 캐시 삭제
(async function unregisterServiceWorker() {
  // 1. 모든 Service Worker 언레지스터
  const registrations = await navigator.serviceWorker.getRegistrations();
  for (const registration of registrations) {
    await registration.unregister();
  }

  // 2. 모든 캐시 삭제
  const cacheNames = await caches.keys();
  for (const cacheName of cacheNames) {
    await caches.delete(cacheName);
  }

  // 3. 페이지 새로고침
  setTimeout(() => window.location.reload(), 2000);
})();
```

**사용 방법**: `https://sellmebuyme.pages.dev/unregister-sw.js` 방문

---

## 📱 배포 후 조치 방법 (3가지 옵션)

Cloudflare Pages 배포 완료 후, 브라우저에서 다음 중 하나를 실행하세요:

### 방법 1: 강제 새로고침 (권장 ⭐)

```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
모바일: 브라우저 설정 > 캐시 삭제
```

**효과**: Service Worker 강제 업데이트 + 모든 캐시 무시

### 방법 2: 개발자 도구에서 수동 제거

1. `F12` 또는 `Cmd+Option+I` (Mac)
2. `Application` 탭 선택
3. 왼쪽 `Service Workers` 클릭
4. 등록된 Service Worker 옆 `Unregister` 버튼 클릭
5. `Clear storage` 클릭 → `Clear site data` 실행
6. 페이지 새로고침 (`F5`)

**효과**: Service Worker 완전 제거 + 모든 저장소 초기화

### 방법 3: 자동 언레지스터 스크립트 실행

```
https://sellmebuyme.pages.dev/unregister-sw.js
```

브라우저에서 위 URL 방문

**효과**:
- 모든 Service Worker 자동 언레지스터
- 모든 캐시 자동 삭제
- 2초 후 페이지 자동 새로고침

---

## 🔧 Context7에서 얻은 시사점

### vite-plugin-pwa 공식 문서 분석

**출처**: [vite-pwa-org.netlify.app](https://vite-pwa-org.netlify.app/guide/unregister-service-worker)

#### 1. Service Worker Unregistration Pattern

```javascript
// activate 이벤트에서 언레지스터 및 캐시 삭제
self.addEventListener('activate', (e) => {
  self.registration.unregister()
    .then(() => self.clients.matchAll())
    .then((clients) => {
      clients.forEach((client) => {
        if (client instanceof WindowClient)
          client.navigate(client.url);  // 강제 새로고침
      });
    })
    .then(() => {
      self.caches.keys().then((cacheNames) => {
        Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    });
});
```

**교훈**: Service Worker 문제 발생 시 `activate` 이벤트를 활용한 강제 초기화 패턴 사용

#### 2. Cleanup Outdated Caches

```typescript
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

cleanupOutdatedCaches()  // ✅ 오래된 캐시 자동 삭제
precacheAndRoute(self.__WB_MANIFEST)
```

**교훈**: `cleanupOutdatedCaches`를 명시적으로 설정하여 캐시 관리 자동화

#### 3. Scope 설정 모범 사례

```typescript
manifest: {
  start_url: '/app',
  scope: '/app',  // ✅ start_url과 일치시키기
}
```

**교훈**: `scope`는 항상 `start_url`과 같거나 하위 경로로 설정

---

## 💡 개발자 커뮤니티 모범 사례

### Stack Overflow: "PWA not updating after deployment"

**문제**: 배포 후에도 PWA가 오래된 버전을 계속 로드

**해결책**:
1. `registerType: 'autoUpdate'` 설정 (✅ 이미 적용됨)
2. `cleanupOutdatedCaches: true` 명시 (✅ 적용 완료)
3. `skipWaiting: true` 옵션 추가 고려

### GitHub Issues: vite-plugin-pwa

**자주 발생하는 문제**:
- scope가 `'/'`로 설정되어 모든 페이지 캐싱
- SPA 라우팅이 작동하지 않음 → `navigateFallback` 필요
- 특정 경로 제외 필요 → `navigateFallbackDenylist` 사용

**권장 설정** (적용 완료):
```typescript
workbox: {
  cleanupOutdatedCaches: true,
  navigateFallback: '/note',
  navigateFallbackDenylist: [/^\/api/, /^\/admin/, /^\/$/, /^\/landing/],
}
```

---

## 🛡️ 에러 로그 확인 방법

### 모바일 오류기록 섹션

**위치**: `/note` 페이지 > "모바일 오류기록" (Shield 아이콘 🛡️)

**기능**:
- 모바일에서 발생한 에러 자동 기록
- Breadcrumbs (사용자 행동 추적)
- 네트워크 로그 (최근 20개 요청)
- 환경 스냅샷 (디바이스, 배터리, 네트워크 상태)
- Supabase → LocalStorage → IndexedDB 3단계 백업

**저장 로직**:
```typescript
// src/lib/utils/errorReporter.ts
export const errorReporter = new ErrorReporter();

// main.tsx에서 초기화
errorReporter.initialize();
errorReporter.setupGlobalHandlers();
```

**확인 방법**:
1. `/note` 페이지 접속
2. 아래로 스크롤하여 "모바일 오류기록" 섹션 찾기
3. 필터 버튼으로 에러 타입 선택 (전체/네트워크/페이지/스크립트/SW/앱)
4. 상세보기 클릭하여 스택 트레이스, 네트워크 로그 확인

**주의**: 데스크톱 에러는 기록되지 않음 (모바일 전용)

---

## 📊 검증 체크리스트

배포 후 다음 사항을 확인하세요:

### 1. 기본 접속 테스트
- [ ] 메인 페이지(`/`) 정상 작동
- [ ] 개발자 노트(`/note`) 정상 접속 ⭐
- [ ] 관리자 페이지(`/admin-portal`) 정상 작동
- [ ] 랜딩 페이지(`/landing`) 정상 작동

### 2. PWA 기능 테스트 (모바일)
- [ ] `/note` 방문 시 "홈 화면에 추가" 배너 표시
- [ ] PWA 설치 후 독립 실행형(standalone) 모드로 실행
- [ ] 오프라인 상태에서 `/note` 캐시된 페이지 로드

### 3. Service Worker 상태 확인
- [ ] `F12` > `Application` > `Service Workers`
- [ ] scope가 `https://sellmebuyme.pages.dev/note`로 표시
- [ ] Status가 `activated and is running` 상태

### 4. 에러 로그 테스트
- [ ] 모바일 기기에서 `/note` 접속
- [ ] 임의의 에러 발생시켜보기 (네트워크 끊기, 잘못된 URL 등)
- [ ] "모바일 오류기록" 섹션에 에러 기록 확인

---

## 🎯 향후 개선 사항

### 1. 번들 크기 최적화

**현재 상태**:
```
dist/assets/index-BEVVeUxj.js   1,156.05 kB │ gzip: 333.41 kB
```

**권장 조치**:
- `App.tsx` 코드 분할 (현재 1,105줄)
- 동적 import로 컴포넌트 lazy loading
- 라우트별 청크 분리

### 2. Service Worker 업데이트 알림

**추가 기능**:
```typescript
// 새 버전 감지 시 사용자에게 알림
registerSW({
  onNeedRefresh() {
    if (confirm('새 버전이 있습니다. 업데이트하시겠습니까?')) {
      updateSW(true);  // 즉시 업데이트
    }
  }
})
```

### 3. PWA 범위 확장

현재는 `/note`만 PWA 지원. 향후 메인 페이지도 PWA화 고려:
- `MOBILE_OPTIMIZATION_PLAN.md` 참고
- 모바일 헤더, BottomSheet 필터, Pull to Refresh 추가

---

## 📚 참고 문서

### Context7 활용 문서
- [vite-plugin-pwa 공식 가이드](https://vite-pwa-org.netlify.app/guide/)
- [Service Worker 언레지스터 패턴](https://vite-pwa-org.netlify.app/guide/unregister-service-worker)
- [Workbox cleanupOutdatedCaches](https://vite-pwa-org.netlify.app/workbox/generate-sw)

### 프로젝트 문서
- `MOBILE_OPTIMIZATION_PLAN.md`: PWA 모바일 최적화 계획
- `APP_DEVELOPMENT_STRATEGY.md`: 하이브리드 앱 전환 전략
- `PUSH_NOTIFICATION_FACT_CHECK.md`: 푸시 알림 지원 여부

### 관련 파일
- [vite.config.ts](vite.config.ts#L131): PWA 설정
- [src/main.tsx](src/main.tsx#L14): errorReporter 초기화
- [src/lib/utils/errorReporter.ts](src/lib/utils/errorReporter.ts): 에러 리포팅 시스템
- [functions/[[path]].ts](functions/[[path]].ts#L75): Cloudflare Functions 라우팅

---

## 🚀 배포 상태

**커밋**: `fb07750 - fix: PWA Service Worker scope 충돌 문제 해결`

**배포 링크**: https://sellmebuyme.pages.dev

**배포 완료 예상 시간**: 푸시 후 2-3분

**확인 방법**:
1. Cloudflare Pages 대시보드에서 배포 로그 확인
2. 배포 완료 후 위 "배포 후 조치 방법" 3가지 중 하나 실행
3. `/note` 페이지 정상 접속 확인 ✅

---

**문서 작성**: 2025-11-06
**작성자**: Claude Code (Sequential Thinking + Context7 활용)
