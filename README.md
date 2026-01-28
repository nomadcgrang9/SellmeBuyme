# 학교일자리

**학교일을 찾는 가장 빠르고 편한 방법**

> 🚧 현재 베타 버전으로 운영 중입니다 (2026.02.02까지)

전국 교육청에 흩어진 교육공무직, 방과후강사, 기간제교사 채용공고를 **지도에서 한눈에** 확인하고, **AI가 맞춤 공고를 추천**해드립니다.

---

## 주요 기능

### 🗺️ 지도 기반 공고 탐색
- **카카오맵 기반** 전국 공고 마커 표시
- **학교급별 색상 구분**: 유치원(주황), 초등(초록), 중등(파랑), 고등(남색), 특수(보라), 기타(회색)
- **D-day 마커**: 마감일 임박 공고 시각적 표시
- **좌표 캐싱**: 30일간 학교 위치 정보 저장으로 빠른 로딩

### 📱 모바일 우선 디자인
- **바텀시트 UI**: 지도 위에서 공고 목록 확인
- **터치 친화적 필터 칩**: 학교급(유/초/중/고/특/기타) 원터치 필터
- **과목 필터**: 중등/고등 선택 시 세부 과목 선택 (국어, 영어, 수학 등 13개)
- **PWA 지원**: 홈 화면 추가, 오프라인 캐싱

### 🚗 길찾기 기능
- **출발지 → 학교** 경로 안내
- **교통수단 선택**: 자동차, 대중교통, 도보
- **예상 정보**: 시간, 거리, 요금 표시
- **카카오맵 연동**: 상세 길찾기 앱으로 이동

### 🔍 스마트 필터
- **학교급 필터**: 유치원, 초등, 중등, 고등, 특수, 기타
- **과목 필터**: 국어, 영어, 수학, 사회, 과학, 체육, 음악, 미술, 정보, 보건, 사서, 상담
- **지역 검색**: 지역명, 학교명으로 검색
- **긴급 공고**: D-3 이하 마감 임박 공고 필터

### 🤖 AI 추천 시스템
- **프로필 기반 매칭**: 거주지, 희망 과목, 경력 등 고려
- **다중 요인 스코어링**: 위치(1000점), 역할, 과목, 경력, 긴급도
- **24시간 캐싱**: 프로필 변경 시에만 재계산
- **Gemini AI**: 추천 결과 정제 및 코멘트 생성

### 📊 자동 크롤링
- **15개 교육청** 공고 매일 자동 수집
- **Gemini Vision AI**: 게시글 스크린샷에서 구조화된 데이터 추출
- **중복 제거**: URL 기반 중복 체크로 효율적 수집
- **데이터 정규화**: 교육청별 상이한 형식 → 표준 JSON 변환

---

## 지원 교육청 (15개)

| 지역 | 상태 |
|------|------|
| 서울 | ✅ |
| 경기 | ✅ |
| 인천 | ✅ |
| 강원 | ✅ |
| 충북 | ✅ |
| 충남 | ✅ |
| 세종 | ✅ |
| 대전 | ✅ |
| 광주 | ✅ |
| 전북 | ✅ |
| 전남 | ✅ |
| 경남 | ✅ |
| 울산 | ✅ |
| 제주 | ✅ |

---

## 기술 스택

### 프론트엔드
| 기술 | 용도 |
|------|------|
| React 18 + TypeScript | UI 프레임워크 |
| Vite | 빌드 도구 |
| Tailwind CSS | 스타일링 |
| Zustand | 상태 관리 |
| Framer Motion | 애니메이션 |
| Kakao Maps API | 지도 표시, 길찾기 |
| PWA (Workbox) | 오프라인 지원 |

### 백엔드
| 기술 | 용도 |
|------|------|
| Supabase | PostgreSQL + Auth + Realtime |
| Edge Functions (Deno) | AI 추천, 첨부파일 프록시 |
| RLS 정책 | 데이터 접근 제어 |

### 크롤러
| 기술 | 용도 |
|------|------|
| Node.js 18 | 런타임 |
| Playwright | 브라우저 자동화 |
| Gemini Vision API | 데이터 추출 |
| GitHub Actions | 스케줄링 (매일 오전 7시) |

### 배포
| 서비스 | 용도 |
|--------|------|
| Cloudflare Pages | 프론트엔드 호스팅 |
| Supabase Cloud | 데이터베이스, 인증 |
| GitHub Actions | CI/CD, 크롤러 스케줄링 |

---

## 시스템 아키텍처

```
[크롤러] GitHub Actions (매일 오전 7시)
    ↓
[수집] Playwright + Gemini Vision AI
    ↓
[저장] Supabase PostgreSQL
    ↓
[API] Edge Functions (AI 추천)
    ↓
[프론트] React + Kakao Maps
    ↓
[사용자] 웹 / PWA
```

---

## 빠른 시작

```bash
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build

# 미리보기
npm run preview
```

## 환경 변수

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_KAKAO_MAP_API_KEY=your_kakao_key
VITE_IS_BETA=true
VITE_BETA_END_DATE=2026-02-02
```

---

## PWA 기능

- **홈 화면 추가**: 앱처럼 사용 가능
- **오프라인 캐싱**: 폰트, 정적 리소스 캐싱
- **리셋 기능**: `?reset-pwa=true` 파라미터로 캐시 초기화

---

## 주요 데이터베이스 테이블

| 테이블 | 용도 |
|--------|------|
| `job_postings` | 채용 공고 |
| `user_profiles` | 사용자 프로필 |
| `recommendations_cache` | AI 추천 캐시 |
| `crawl_boards` | 크롤링 소스 설정 |

---

## 문서

- [CLAUDE.md](CLAUDE.md) - 프로젝트 아키텍처 가이드
- [docs/PROJECT_RULES.md](docs/PROJECT_RULES.md) - 개발 규칙
- [docs/CRAWLING_PLAN.md](docs/CRAWLING_PLAN.md) - 크롤링 시스템 설계
- [docs/FRONTEND_STRUCTURE.md](docs/FRONTEND_STRUCTURE.md) - 프론트엔드 구조
- [docs/BACKEND_STRUCTURE.md](docs/BACKEND_STRUCTURE.md) - 백엔드 구조

---

## 라이선스

Private - All rights reserved
