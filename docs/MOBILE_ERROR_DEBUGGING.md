# 모바일 연결 오류 디버깅 가이드

## 🔍 문제 상황

**증상:**
- Cloudflare Pages 배포 사이트에서 간헐적으로 "사이트에 연결할 수 없음" 오류 발생
- 모바일 환경에서만 발생
- 재현이 어려움 (나올 때도 있고 안 나올 때도 있음)
- 개발자 콘솔 확인 불가능

---

## ✅ 구현된 해결 방안

### 1. 원격 에러 로깅 시스템 구축

#### **파일 생성:**
- `src/lib/utils/errorLogger.ts` - 에러 로깅 유틸리티
- `src/components/admin/ErrorLogViewer.tsx` - 에러 로그 뷰어
- `supabase/migrations/20250106_create_error_logs.sql` - DB 테이블

#### **기능:**
- ✅ JavaScript 런타임 에러 캐치
- ✅ Promise rejection 에러 캐치
- ✅ 네트워크 요청 실패 감지
- ✅ 페이지 로드 실패 감지
- ✅ Service Worker 오류 로깅
- ✅ 디바이스 정보 수집 (모바일/데스크톱, 화면 크기, 네트워크 상태)

---

## 📋 사용 방법

### **1단계: Supabase 테이블 생성**

Supabase 대시보드 → SQL Editor에서 실행:

```sql
-- supabase/migrations/20250106_create_error_logs.sql 내용 복사 & 실행
```

### **2단계: 배포**

```bash
npm run build
# Cloudflare Pages에 배포
```

### **3단계: 에러 로그 확인**

관리자 페이지에서 `ErrorLogViewer` 컴포넌트 추가:

```tsx
import ErrorLogViewer from '@/components/admin/ErrorLogViewer';

// AdminPage.tsx에 추가
<ErrorLogViewer />
```

### **4단계: 모바일에서 테스트**

1. 모바일 기기로 사이트 접속
2. 오류 발생 시 자동으로 Supabase에 로그 저장
3. 관리자 페이지에서 에러 로그 확인

---

## 🎯 수집되는 정보

### **에러 로그 데이터:**
```json
{
  "timestamp": "2025-01-06T06:27:00Z",
  "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
  "url": "https://sellmebuyme.pages.dev/",
  "errorType": "network",
  "errorMessage": "Failed to fetch",
  "stackTrace": "...",
  "deviceInfo": {
    "isMobile": true,
    "platform": "iPhone",
    "screenSize": "390x844",
    "connection": "4g"
  }
}
```

### **에러 타입:**
- `network` - 네트워크 요청 실패
- `page_load` - 페이지 로드 실패
- `service_worker` - Service Worker 오류
- `uncaught_error` - JavaScript 런타임 에러
- `unhandled_rejection` - Promise rejection

---

## 🔧 추가 디버깅 방법

### **방법 1: 로컬스토리지 백업**

서버 전송 실패 시 로컬스토리지에 자동 저장:

```javascript
// 브라우저 콘솔에서 확인
import { getLocalErrorLogs } from '@/lib/utils/errorLogger';
console.log(getLocalErrorLogs());
```

### **방법 2: 실시간 콘솔 로깅**

모바일에서 실시간 로그 확인:

```javascript
// main.tsx에 이미 추가됨
console.log('[DEBUG] Page loaded successfully');
```

### **방법 3: Cloudflare 로그 확인**

Cloudflare 대시보드 → Analytics → Web Analytics

---

## 🚨 가능한 원인 및 해결책

### **원인 1: Cloudflare DNS 전파 지연**

**증상:** 모바일 캐시에 이전 DNS 정보 남아있음

**해결:**
```javascript
// 캐시 무효화 헤더 추가 (Cloudflare Pages 설정)
Cache-Control: no-cache, no-store, must-revalidate
```

### **원인 2: Service Worker 캐시 충돌**

**증상:** PWA 캐시가 오래된 리소스 제공

**해결:**
```javascript
// Service Worker 업데이트 강제
navigator.serviceWorker.getRegistrations().then(registrations => {
  registrations.forEach(registration => registration.update());
});
```

### **원인 3: 네트워크 타임아웃**

**증상:** 모바일 네트워크 불안정으로 요청 실패

**해결:**
```javascript
// fetch 타임아웃 설정
const controller = new AbortController();
setTimeout(() => controller.abort(), 10000); // 10초 타임아웃
fetch(url, { signal: controller.signal });
```

### **원인 4: CORS/헤더 설정 문제**

**증상:** API 요청이 CORS 정책으로 차단됨

**해결:**
```javascript
// Cloudflare Pages _headers 파일 추가
/*
  Access-Control-Allow-Origin: *
  Access-Control-Allow-Methods: GET, POST, OPTIONS
```

### **원인 5: Cloudflare 빌드 실패**

**증상:** 일부 에셋 누락으로 페이지 로드 실패

**해결:**
```bash
# 빌드 로그 확인
npm run build
# dist 폴더 확인
ls -la dist/
```

---

## 📊 에러 로그 분석 팁

### **1. 네트워크 에러가 많은 경우:**
→ Cloudflare CDN 문제 또는 모바일 네트워크 불안정

### **2. 페이지 로드 실패가 많은 경우:**
→ Service Worker 캐시 문제 또는 빌드 에셋 누락

### **3. 특정 URL에서만 발생:**
→ 해당 페이지의 리소스 로딩 문제

### **4. 특정 디바이스에서만 발생:**
→ 디바이스별 호환성 문제 (iOS/Android)

---

## 🎯 다음 단계

1. ✅ **에러 로그 수집** (완료)
2. ⏳ **Supabase 테이블 생성** (사용자 작업 필요)
3. ⏳ **배포 후 모니터링** (에러 패턴 분석)
4. ⏳ **근본 원인 파악** (로그 데이터 기반)
5. ⏳ **해결책 적용** (원인별 대응)

---

## 💡 추가 권장 사항

### **1. Sentry 또는 LogRocket 도입**
→ 더 강력한 에러 추적 및 세션 리플레이

### **2. Cloudflare Analytics 활성화**
→ 실시간 트래픽 및 에러 모니터링

### **3. 모바일 테스트 자동화**
→ BrowserStack 또는 LambdaTest로 다양한 디바이스 테스트

### **4. 성능 모니터링**
→ Lighthouse CI로 빌드마다 성능 체크

---

## 📞 문제 지속 시 체크리스트

- [ ] Supabase error_logs 테이블에 로그가 쌓이는지 확인
- [ ] 에러 타입별 빈도 분석
- [ ] 특정 URL 패턴 확인
- [ ] 모바일 vs 데스크톱 비율 확인
- [ ] 네트워크 상태 (4g, wifi 등) 확인
- [ ] Cloudflare 빌드 로그 확인
- [ ] Service Worker 캐시 상태 확인
- [ ] DNS 전파 상태 확인

---

## 🚀 긴급 대응 방법

**오류가 계속 발생하는 경우:**

1. **Service Worker 비활성화 (임시)**
   ```javascript
   // vite.config.ts에서 VitePWA 플러그인 주석 처리
   ```

2. **Cloudflare 캐시 퍼지**
   ```
   Cloudflare 대시보드 → Caching → Purge Everything
   ```

3. **롤백**
   ```bash
   # 이전 배포 버전으로 롤백
   ```

---

**작성일:** 2025-01-06  
**작성자:** Cascade AI  
**버전:** 1.0
