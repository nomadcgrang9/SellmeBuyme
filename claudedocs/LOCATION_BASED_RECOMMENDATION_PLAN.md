# 위치 기반 자동 추천 시스템 구현 계획서

## 📊 기술 스택 분석 (Browser Geolocation API + Context7 결과)

### Geolocation API 핵심 사항
**사용법**:
```javascript
navigator.geolocation.getCurrentPosition(
  (position) => {
    const { latitude, longitude } = position.coords;
    // 성공 처리
  },
  (error) => {
    // 에러 처리: PERMISSION_DENIED, POSITION_UNAVAILABLE, TIMEOUT
  },
  {
    enableHighAccuracy: false,  // Wi-Fi 기반 (배터리 절약)
    timeout: 10000,              // 10초 타임아웃
    maximumAge: 3600000          // 1시간 캐시 허용
  }
);
```

**브라우저 호환성**:
- ✅ Chrome/Edge: 완전 지원
- ✅ Firefox: 완전 지원
- ⚠️ Safari: 완전 지원 (Private Mode 제한 있음)
- ❌ 중국: Wi-Fi 위치 서비스 제한으로 비활성화 가능

**HTTPS 요구사항**:
- ✅ 프로덕션 (Cloudflare Pages): HTTPS 자동 제공
- ✅ 개발 환경 (localhost): HTTP 허용
- ❌ HTTP 도메인: 작동 안 함 (보안 컨텍스트 필수)
