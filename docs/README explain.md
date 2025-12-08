# 셀미바이미 (SellmeBuyme)

방과후 강사와 학교를 연결하는 AI 기반 매칭 플랫폼

## 무엇을 하는 서비스인가요?

**셀미바이미**는 교육 현장의 인력 미스매치 문제를 AI로 해결하는 교육 인력 매칭 플랫폼입니다.

### 🎯 핵심 목적
전국 25개 교육청에 흩어진 방과후/기간제 채용 공고를 **자동으로 수집**하고, AI가 **학교와 강사를 정확하게 연결**합니다.

### 👥 사용자별 가치

**🏫 학교/교육기관**
- 여러 교육청 게시판을 일일이 확인할 필요 없이 한 곳에서 검색
- "수원 코딩강사 구해요" 같은 **자연어 검색** 지원
- 지역/과목/자격 기준 **정확한 필터링**
- 강사 인력풀에서 적합한 후보자 탐색

**👨‍🏫 강사/교사**
- 프로필 등록 한 번으로 **AI가 적합한 공고를 자동 추천**
- 거주지 인근 학교 우선 매칭 (지역 기반 정렬)
- 경력/자격/과목 기반 **맞춤형 공고 발견**
- 긴급 채용 공고 실시간 알림

**🤖 AI의 역할**
- 25개 교육청의 서로 다른 형식을 **자동으로 표준화**
- "중등 수학 성남" → "중학교 + 고등학교, 수학 과목, 성남시" 확장 검색
- 사용자 프로필 기반 **다중 요인 스코어링** (위치/경력/과목/자격)
- 마감일/긴급도/최신성을 고려한 **우선순위 정렬**

## 핵심 기능

### 🔍 AI 기반 검색 시스템
- **자연어 검색**: "수원 초등 방과후 코딩" → 관련 공고 즉시 표시
- **토큰 그룹 확장**: "중등" → ["중등", "중학교", "고등학교"] 동의어 매칭
- **FTS + ILIKE 듀얼 검색**: PostgreSQL 전문 검색 + 유연한 패턴 매칭
- **후처리 필터링**: 모든 검색어 그룹이 최소 1회 이상 매칭되도록 보장

### 🤖 AI 맞춤 추천 (프로필 기반)
- **위치 점수**: 사용자 거주지 기준 같은 구(1000점) > 같은 시(900점) > 인접 도시(800점)
- **역할 점수**: 교사/강사 역할 매칭
- **과목 점수**: 가능 과목 일치도 계산
- **경력 점수**: 경력 연차 기반 가중치
- **시급성 점수**: 마감일 임박/긴급 공고 우선순위
- **24시간 캐싱**: 프로필 변경 시에만 재생성

### 📊 자동 크롤링 시스템
- **25개 교육청** 게시판 매일 오전 7시 자동 수집
- **Playwright**: 동적 페이지 렌더링 및 스크린샷 캡처
- **Gemini Vision API**: 게시글에서 구조화된 데이터 추출
- **중복 제거**: URL 기반 중복 체크 (AI 호출 전 필터링으로 비용 절감)
- **데이터 정규화**: 교육청별 상이한 형식 → 표준 JSON 변환
- **첨부파일 프록시**: Edge Function 경유로 안정적인 다운로드

### 💬 실시간 기능
- **Supabase Realtime**: 신규 공고 즉시 반영
- **긴급 공고 알림**: 마감 임박 공고 자동 알림 (예정)
- **PWA 지원**: 모바일 홈 화면 추가, 오프라인 캐싱

### 📱 반응형 디자인
- **모바일**: 통합 헤더-프로모 섹션, 스크롤 시 헤더 배경 변경, 슬라이드 카드
- **데스크톱**: 깔끔한 카드 그리드, 프로모 카드 스택, 필터 사이드바

## 기술 스택

**프론트엔드**
- **Framework**: React 18 + TypeScript + Vite
- **스타일링**: TailwindCSS (커스텀 컬러 팔레트)
- **상태 관리**: Zustand (authStore, searchStore, toastStore)
- **라우팅**: React Router v6
- **배포**: Cloudflare Pages

**백엔드**
- **데이터베이스**: Supabase (PostgreSQL + RLS 정책)
- **인증**: Supabase Auth (Google OAuth)
- **실시간**: Supabase Realtime (신규 공고 알림)
- **서버리스**: Supabase Edge Functions (Deno)
  - `profile-recommendations`: AI 추천 생성
  - `download-attachment`: 첨부파일 프록시

**크롤링**
- **런타임**: Node.js 18
- **브라우저 자동화**: Playwright (Chromium)
- **AI 파싱**: Google Gemini 2.0 Flash (Vision API)
- **스케줄링**: GitHub Actions (매일 오전 7시)
- **토큰 추적**: 세션별 사용량 로깅

**AI & 검색**
- **자연어 처리**: Google Gemini 2.0 Flash
- **검색 엔진**: PostgreSQL FTS (pg_trgm GIN 인덱스)
- **매칭 알고리즘**: 다중 요인 스코어링 (위치/경력/과목/자격)

## 빠른 시작

```powershell
# 의존성 설치
npm install

# 개발 서버 실행
npm run dev

# 빌드
npm run build
```

## 환경 변수

```bash
# .env.local
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## 시스템 아키텍처

```
GitHub Actions (매일 오전 7시)
    ↓
크롤러 (Node.js + Playwright + Gemini)
    ↓
중복 체크 (URL 기반) ← AI 호출 전 필터링
    ↓
Gemini Vision API (데이터 정규화) ← 신규 공고만
    ↓
Supabase PostgreSQL (job_postings, talents, user_profiles)
    ↓
Edge Functions (profile-recommendations)
    ↓
프론트엔드 (React + Vite)
    ↓
사용자 (웹/PWA)
```

## 데이터 흐름

### 1. 크롤링 → 저장
```javascript
교육청 게시판 → Playwright 수집 → Gemini AI 파싱
→ 구조화된 JSON → Supabase 저장 → Realtime 업데이트
```

### 2. 검색
```javascript
사용자 검색어 → 토큰 그룹 확장 → FTS + ILIKE 쿼리
→ 후처리 필터링 → 정렬 → 무한 스크롤
```

### 3. AI 추천
```javascript
사용자 프로필 → Edge Function 호출 → 스코어링 (위치/과목/경력)
→ Gemini AI 정제 → 캐싱 (24시간) → 프론트엔드 표시
```

## 주요 데이터베이스 테이블

| 테이블 | 용도 | 주요 필드 |
|--------|------|-----------|
| `job_postings` | 채용 공고 | organization, title, location, deadline, school_level, subject |
| `user_profiles` | 사용자 프로필 | roles, interest_regions, experience_years, capable_subjects |
| `talents` | 강사 인력풀 | name, specialty, location, experience_years, rating |
| `recommendations_cache` | AI 추천 캐시 | user_id, cards (JSONB), ai_comment, valid_until |
| `crawl_boards` | 크롤링 소스 | board_name, base_url, last_crawled_at, crawl_batch_size |
| `promo_cards` | 프로모 카드 | headline, background_gradient, font_color, auto_play |

## 배포

- **프론트엔드**: Cloudflare Pages (자동 배포)
- **크롤러**: GitHub Actions (cron 스케줄링)
- **데이터베이스**: Supabase Cloud
- **Edge Functions**: Supabase (Deno runtime)

---

## 📚 문서

- [PROJECT_RULES.md](PROJECT_RULES.md) - 개발 규칙 및 컨벤션
- [CLAUDE.md](CLAUDE.md) - 프로젝트 아키텍처 상세 가이드
- [CRAWLING_PLAN.md](CRAWLING_PLAN.md) - 크롤링 시스템 설계
- [SEARCH_SYSTEM_REDESIGN.md](SEARCH_SYSTEM_REDESIGN.md) - 검색 시스템 재설계
- [FRONTEND_STRUCTURE.md](FRONTEND_STRUCTURE.md) - 프론트엔드 구조
- [BACKEND_STRUCTURE.md](BACKEND_STRUCTURE.md) - 백엔드 구조
