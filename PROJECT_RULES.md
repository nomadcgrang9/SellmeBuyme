# 셀미바이미 (SellmeBuyme) 프로젝트 규칙

> 이 문서는 '셀미바이미' 프로젝트의 기술적 방향성과 개발 규칙을 정의합니다.  
> 우리는 이 원칙을 따라 일관성 있고, 확장 가능하며, 사용자 친화적인 서비스를 만듭니다.

---

## 📜 총괄 원칙 (Guiding Principles)

1. **Modern & Fast**  
   사용자에게는 최상의 속도를, 개발자에게는 최고의 생산성을 제공하는 최신 기술을 지향합니다.

2. **Type-Safe**  
   모든 코드에 TypeScript를 적용하여 런타임 에러를 사전에 방지하고 안정성을 확보합니다.

3. **Component-Driven**  
   모든 UI 요소를 재사용 가능한 컴포넌트로 만들어 개발 효율과 디자인 일관성을 높입니다.

4. **Scalable**  
   서비스가 성장함에 따라 크롤링, AI, 데이터베이스가 유연하게 확장될 수 있는 아키텍처를 채택합니다.

5. **User-Friendly**  
   기술적 완성도보다 사용자 경험을 최우선으로 고려하며, 친근한 AI 톤과 직관적 UI를 유지합니다.

6. **PowerShell-First**  
   Windows 개발 환경에서는 PowerShell 네이티브 명령어만 사용합니다. CMD 명령어는 사용하지 않습니다.

---

## 🏗️ 전체 아키텍처

### 로컬 개발 환경

```
┌─────────────────────────────────────────────────────────────┐
│              프론트엔드 (localhost:5173)                     │
│  Vite + React 18 + TypeScript                               │
│  esamanru Medium 폰트 + Tabler Icons                        │
└─────────────────────────────────────────────────────────────┘
                            ↕ (자동 분기: DEV = true)
┌─────────────────────────────────────────────────────────────┐
│           로컬 프록시 서버 (localhost:3001)                  │
│  Express.js + GEMINI_API_KEY (서버 환경 변수)                │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Google Gemini 2.0 Flash                     │
└─────────────────────────────────────────────────────────────┘
```

### 프로덕션 환경

```
┌─────────────────────────────────────────────────────────────┐
│          프론트엔드 (sellmebuyme.vercel.app)                 │
│  Vite + React 18 + TypeScript                               │
│  TailwindCSS + shadcn/ui + Framer Motion                    │
└─────────────────────────────────────────────────────────────┘
                            ↕ (자동 분기: DEV = false)
┌─────────────────────────────────────────────────────────────┐
│              Supabase Edge Function                          │
│  ai-search (Deno) + GEMINI_API_KEY (Supabase Secret)        │
└─────────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────────┐
│                  Google Gemini 2.0 Flash                     │
└─────────────────────────────────────────────────────────────┘

### 크롤링 시스템 (공통)

```
┌─────────────────────────────────────────────────────────────┐
│                   크롤링 & AI 시스템                         │
│  Python + Playwright (크롤러)                               │
│  Celery + Redis (작업 큐)                                   │
│  PostgreSQL (Supabase)                                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 핵심 기술 스택

### 프론트엔드

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| **빌드 도구** | Vite | 초고속 개발 서버, HMR, ESM 네이티브 |
| **프레임워크** | React 18 | 동시성 렌더링, 풍부한 생태계 |
| **언어** | TypeScript | 타입 안전성, 자동완성, 리팩토링 용이 |
| **상태 관리** | Zustand | 간결한 API, 보일러플레이트 최소화 |
| **서버 상태** | TanStack Query | 캐싱, 자동 리페치, 낙관적 업데이트 |
| **라우팅** | React Router v6 | 중첩 라우팅, Lazy Loading |
| **폼 관리** | React Hook Form | 성능 최적화, 재렌더링 최소화 |
| **스키마 검증** | Zod | TypeScript 우선, 런타임 검증 |

### UI/UX

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| **스타일링** | TailwindCSS | 유틸리티 우선, 빠른 프로토타이핑 |
| **컴포넌트** | shadcn/ui | Radix UI 기반, 접근성, 커스터마이징 |
| **애니메이션** | Framer Motion | 선언적 API, 부드러운 전환 |
| **색상 시스템** | Radix Colors | 체계적 팔레트, 다크모드 대응 |
| **폰트** | esamanru Medium | 프로젝트 전용 폰트 (public/fonts/) |
| **아이콘** | Tabler Icons | 얇고 세련된 선, 일관된 디자인 |

### 백엔드 & 인프라

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| **BaaS** | Supabase | PostgreSQL, 실시간, 인증 통합 |
| **데이터베이스** | PostgreSQL | 관계형, 복잡한 쿼리, 확장성 |
| **인증** | Supabase Auth | JWT, 소셜 로그인, 매직 링크 |
| **실시간** | Supabase Realtime | WebSocket, 구독 기반 |
| **스토리지** | Supabase Storage | 이미지 업로드, CDN |
| **서버리스** | Edge Functions | Deno 런타임, 빠른 응답 |

### 크롤링 & AI

| 영역 | 기술 | 선택 이유 |
|------|------|----------|
| **크롤러** | Python + Playwright | JavaScript 렌더링 대응 |
| **파싱** | BeautifulSoup4 | HTML 파싱 표준 |
| **작업 큐** | Celery + Redis | 비동기 처리, 스케줄링 |
| **AI** | Google Gemini 2.0 Flash | 자연어 이해, 최신 모델 |
| **벡터 검색** | pgvector | 의미 기반 매칭 (Phase 2) |
| **로컬 프록시** | Express.js | 개발 환경 API 키 보안 |

### 개발 도구

| 영역 | 기술 | 목적 |
|------|------|------|
| **린터** | ESLint | 코드 문법 검사 |
| **포맷터** | Prettier | 코드 자동 정렬 |
| **Git Hooks** | husky + lint-staged | 커밋 전 자동 검사 |
| **테스트** | Vitest + Testing Library | 유닛/컴포넌트 테스트 |
| **E2E** | Playwright | 엔드투엔드 테스트 |

---

## 🎨 디자인 시스템

### 폰트 전략

- **주 폰트**: esamanru Medium (로컬 폰트)
  - 경로: `public/fonts/esamanru Medium.ttf`
  - 적용: 모든 텍스트 요소
  - 폴백: `-apple-system, BlinkMacSystemFont, system-ui, sans-serif`

### 색상 팔레트 (Radix Colors 기반)

```
Primary (신뢰감 - 파란색 계열):
- blue.1 ~ blue.12 (배경 → 텍스트)

Accent (주목도 - 주황색 계열):
- orange.1 ~ orange.12

Success (성공 - 초록색):
- green.1 ~ green.12

Warning (경고 - 노란색):
- amber.1 ~ amber.12

Danger (긴급 - 빨간색):
- red.1 ~ red.12

Neutral (회색):
- slate.1 ~ slate.12
```

### 아이콘 규칙

- **라이브러리**: Tabler Icons React
- **크기 표준**:
  - 작은 아이콘: `size={16}`
  - 기본 아이콘: `size={20}`
  - 큰 아이콘: `size={24}`
- **선 두께**: `stroke={1.5}` (기본값 유지)
- **일관성**: 한 화면에서 크기/두께 통일

### 애니메이션 원칙

- **Framer Motion 사용 케이스**:
  - 페이지 전환
  - 모달 등장/퇴장
  - 카드 호버 효과
  - AI 추천 슬라이드
- **지속 시간**: 200-300ms (빠르고 자연스럽게)
- **Easing**: `ease-in-out` 기본

---

## 📁 프로젝트 구조

### 프론트엔드 디렉토리

```
sellme-buyme/
├── public/
│   ├── fonts/
│   │   └── esamanru Medium.ttf      # 프로젝트 전용 폰트
│   ├── logo.svg
│   └── favicon.ico
│
├── src/
│   ├── app/                          # 페이지 컴포넌트
│   │   ├── home/                     # 메인 페이지
│   │   ├── search/                   # 검색 결과
│   │   ├── job-detail/               # 공고 상세
│   │   ├── talent-detail/            # 인력 상세
│   │   ├── post-job/                 # 공고 등록
│   │   ├── register-talent/          # 인력 등록
│   │   └── profile/                  # 사용자 프로필
│   │
│   ├── components/                   # 재사용 컴포넌트
│   │   ├── ui/                       # shadcn/ui 컴포넌트
│   │   ├── layout/                   # Header, Footer
│   │   ├── cards/                    # JobCard, TalentCard
│   │   ├── ai/                       # AIInsightBox, AIRecommendations
│   │   └── forms/                    # 폼 컴포넌트
│   │
│   ├── lib/                          # 유틸리티
│   │   ├── api/                      # Supabase 클라이언트
│   │   ├── hooks/                    # 커스텀 훅
│   │   ├── utils/                    # 헬퍼 함수
│   │   └── constants/                # 상수 정의
│   │
│   ├── stores/                       # Zustand 스토어
│   │   ├── authStore.ts              # 인증 상태
│   │   ├── searchStore.ts            # 검색 상태
│   │   └── uiStore.ts                # UI 상태
│   │
│   ├── types/                        # TypeScript 타입
│   │   ├── database.ts               # Supabase 타입
│   │   ├── api.ts                    # API 응답 타입
│   │   └── components.ts             # 컴포넌트 Props
│   │
│   └── styles/                       # 글로벌 스타일
│       ├── globals.css               # TailwindCSS + 커스텀
│       └── fonts.css                 # esamanru 폰트 로드
│
├── .eslintrc.json                    # ESLint 설정
├── .prettierrc                       # Prettier 설정
├── tailwind.config.js                # TailwindCSS 설정
├── tsconfig.json                     # TypeScript 설정
└── vite.config.ts                    # Vite 설정
```

### 백엔드 구조 (Supabase)

```
supabase/
├── functions/                        # Edge Functions (프로덕션용)
│   ├── ai-search/                    # AI 검색 (Gemini 2.0 Flash)
│   │   └── index.ts
│   ├── crawl-trigger/                # 크롤링 트리거
│   │   └── index.ts
│   └── notifications/                # 알림 발송
│       └── index.ts
│
├── migrations/                       # DB 스키마 변경
│   ├── 20250101000000_initial_schema.sql
│   ├── 20250102000000_add_crawl_sources.sql
│   └── 20250103000000_add_search_logs.sql
│
└── seed.sql                          # 초기 데이터
```

### 로컬 프록시 서버 (개발용)

```
dev-proxy/
├── server.js                         # Express 서버
├── routes/
│   └── ai-search.js                  # Gemini API 호출
├── .env                              # GEMINI_API_KEY (Git 제외)
└── package.json
```

### 크롤러 구조 (Python)

```
crawler/
├── sources/                          # 교육청별 파서
│   ├── gyeonggi_suwon.py
│   ├── gyeonggi_yongin.py
│   └── ...
│
├── tasks/                            # Celery 작업
│   ├── crawl_task.py
│   └── normalize_task.py
│
├── models/                           # 데이터 모델
│   └── announcement.py
│
├── utils/                            # 유틸리티
│   ├── parser.py
│   └── deduper.py
│
└── config.py                         # 설정 파일
```

---

## 🗄️ 데이터베이스 설계

### 핵심 테이블

```
users
├── id (uuid, PK)
├── email (text, unique)
├── role (enum: school, talent, admin)
├── profile_data (jsonb)
├── created_at (timestamp)
└── updated_at (timestamp)

job_postings
├── id (uuid, PK)
├── source (enum: crawled, user_posted)
├── crawl_source_id (uuid, FK → crawl_sources)
├── organization (text)
├── title (text)
├── content (text)
├── tags (text[])
├── location (text)
├── compensation (text)
├── deadline (date)
├── is_urgent (boolean)
├── view_count (integer)
└── created_at (timestamp)

talents
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── name (text)
├── specialty (text)
├── tags (text[])
├── location (text[])
├── experience_years (integer)
├── is_verified (boolean)
├── rating (numeric)
├── review_count (integer)
└── created_at (timestamp)

crawl_sources
├── id (uuid, PK)
├── name (text)
├── base_url (text)
├── parser_type (enum: html, api)
├── selectors (jsonb)
├── status (enum: active, broken, blocked)
├── last_successful (timestamp)
└── error_count (integer)

search_logs
├── id (uuid, PK)
├── user_id (uuid, FK → users, nullable)
├── query (text)
├── filters (jsonb)
├── result_count (integer)
├── clicked_result_id (uuid, nullable)
└── created_at (timestamp)
```

---

## 🔐 인증 & 권한 관리

### 사용자 역할 (Role-Based Access Control)

| 역할 | 권한 |
|------|------|
| **school** | 공고 등록/수정/삭제, 인력 검색/연락, 지원자 관리 |
| **talent** | 인력 등록/수정, 공고 검색/지원, 프로필 관리 |
| **admin** | 크롤링 관리, 사용자 검증, 통계 조회 |

### Row Level Security (RLS) 정책

- **job_postings**: 본인이 등록한 공고만 수정/삭제 가능
- **talents**: 본인 프로필만 수정 가능
- **search_logs**: 본인 검색 기록만 조회 가능

---

## 🤖 AI 검색 구현 전략

### 자연어 처리 흐름 (Google Gemini API)

```
1. 사용자 입력
   "수원 코딩강사 구해요"
   
2. 환경별 자동 분기
   - 로컬 개발: 프록시 서버 (localhost:3001)
   - 프로덕션: Supabase Edge Function
   
3. Gemini API 호출 (서버에서만)
   - 모델: gemini-2.0-flash-exp
   - 프롬프트: 검색 의도 파악 + 구조화
   
4. 구조화된 쿼리 생성
   {
     location: ["수원", "용인", "화성"],
     keywords: ["코딩", "파이썬", "프로그래밍"],
     type: "talent",
     category: "방과후강사"
   }
   
5. PostgreSQL 쿼리 실행
   - Full-Text Search (키워드)
   - 지역 필터링
   - 태그 매칭
   
6. 결과 + AI 메시지 생성
   "수원 및 인근 지역에서 코딩 관련 분야, 
    방과후 강사 중심으로 검색했을 때 
    23개의 결과가 있었어요! 😊"
```

### AI 메시지 톤 규칙

- **친근한 대화체**: "~했어요", "~해 보세요"
- **이모지 활용**: 😊 💡 🔥 (과도하지 않게)
- **구체적 수치**: "23개", "1번째 카드"
- **긍정적 톤**: 결과 없을 때도 대안 제시

### 환경별 API 라우팅 전략

**핵심 원리**: Vite가 환경을 자동 감지하여 분기

```typescript
// lib/api/gemini.ts

const isDev = import.meta.env.DEV;  // Vite가 자동 설정

export async function searchWithAI(query: string) {
  if (isDev) {
    // 🏠 로컬 개발: 프록시 서버 호출
    const response = await fetch('http://localhost:3001/api/ai-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    return response.json();
    
  } else {
    // 🌐 프로덕션: Supabase Edge Function 호출
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    const response = await fetch(`${supabaseUrl}/functions/v1/ai-search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query })
    });
    return response.json();
  }
}
```

**사용자가 할 일**:
- 로컬: `npm run dev` 실행 → 자동으로 `localhost:3001` 호출
- 배포: Git push → 자동으로 Supabase Edge Function 호출

**보안 효과**:
- 로컬: API 키가 프록시 서버에만 존재
- 프로덕션: API 키가 Supabase Secret에만 존재
- 브라우저에는 절대 노출 안 됨

---

## 🕷️ 크롤링 시스템 설계

### 크롤링 파이프라인

```
1. 스케줄러 (Celery Beat)
   - 매 시간 정각: 전체 교육청 크롤링
   - 매일 자정: 오래된 공고 정리
   
2. 크롤러 (Playwright)
   - 각 교육청 사이트 접속
   - HTML 파싱 또는 API 호출
   - 원본 HTML 스냅샷 저장
   
3. 정규화 (Normalizer)
   - 날짜 형식 통일 (YYYY-MM-DD)
   - 지역명 표준화
   - 태그 추출 (키워드 분석)
   
4. 중복 제거 (Deduper)
   - 제목 + 날짜 해시 비교
   - 유사도 90% 이상 시 중복 처리
   
5. DB 저장
   - job_postings 테이블 삽입
   - 구독자에게 실시간 알림
```

### 에러 처리 전략

- **재시도 정책**: 지수 백오프, 최대 5회
- **소스 상태 관리**: 5회 연속 실패 시 `broken` 상태로 변경
- **관리자 알림**: Slack/Email로 즉시 통보
- **폴백 파서**: 메인 셀렉터 실패 시 대체 셀렉터 시도

---

## 🚀 개발 단계별 로드맵

### Phase 1: MVP (1-2개월)

**목표**: 핵심 기능 검증

- ✅ Vite + React + TypeScript 프로젝트 생성
- ✅ Supabase 프로젝트 설정 (DB, Auth)
- ✅ esamanru 폰트 적용 및 기본 UI 컴포넌트
- ✅ 정적 데이터로 카드 리스트 표시
- ✅ 키워드 검색 (PostgreSQL Full-Text Search)
- ✅ 사용자 인증 (이메일 로그인)
- ✅ 공고/인력 등록 폼

**배포**: Vercel (프론트엔드)

### Phase 2: 크롤링 & AI (2-3개월)

**목표**: 자동화 및 지능화

- ✅ Python 크롤러 개발 (3-5개 교육청)
- ✅ Celery + Redis 작업 큐 설정
- ✅ Google Gemini API 통합 (자연어 검색)
- ✅ AI 검색 결과 박스 UI
- ✅ 실시간 알림 (Supabase Realtime)
- ✅ 필터링 고도화 (지역, 분야, 정렬)

**배포**: Railway (크롤러)

### Phase 3: 고도화 (3-6개월)

**목표**: 사용자 경험 극대화

- ✅ 전체 25개 교육청 크롤링
- ✅ 벡터 검색 (pgvector + Gemini Embeddings)
- ✅ 채팅 기능 (학교 ↔ 강사)
- ✅ 평가/리뷰 시스템
- ✅ PWA 전환 (오프라인 지원)
- ✅ 성능 최적화 (Lighthouse 90+)
- ✅ 관리자 대시보드

**배포**: 도메인 연결, CDN 최적화

---

## 🧪 테스트 전략

### 프론트엔드 테스트

- **유닛 테스트 (Vitest)**:
  - 유틸리티 함수
  - 커스텀 훅
  - Zustand 스토어
  
- **컴포넌트 테스트 (Testing Library)**:
  - 카드 렌더링
  - 폼 검증
  - 사용자 인터랙션

- **E2E 테스트 (Playwright)**:
  - 검색 → 결과 확인
  - 로그인 → 공고 등록
  - 인력 등록 → 프로필 수정

### 백엔드 테스트

- **Python 테스트 (pytest)**:
  - 크롤러 파서
  - 정규화 로직
  - 중복 제거

---

## 📊 성능 최적화 체크리스트

### 프론트엔드

- ✅ Code Splitting (React.lazy)
- ✅ 이미지 최적화 (WebP, lazy loading)
- ✅ 번들 크기 분석 (vite-bundle-visualizer)
- ✅ Tree Shaking (미사용 코드 제거)
- ✅ 가상 스크롤 (TanStack Virtual)
- ✅ 메모이제이션 (React.memo, useMemo)

### 백엔드

- ✅ DB 인덱스 (location, tags, deadline)
- ✅ 쿼리 최적화 (N+1 문제 해결)
- ✅ Redis 캐싱 (검색 결과, 인기 공고)
- ✅ CDN (정적 에셋)

---

## 🔧 개발 환경 설정

### 필수 도구

- **Node.js**: v20 이상
- **pnpm**: 패키지 매니저 (npm보다 빠름)
- **Python**: 3.11 이상
- **Docker**: 로컬 Supabase 개발 환경

### 환경 변수

```bash
# .env.local (로컬 개발용, .gitignore 필수!)

# 브라우저 노출 OK (공개 정보)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# 서버 전용 (VITE_ 없음 = 브라우저 접근 불가)
GEMINI_API_KEY=AIzaSy...
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx

# 크롤러용
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...
REDIS_URL=redis://localhost:6379
CELERY_BROKER_URL=redis://localhost:6379
```

### 환경 변수 보안 규칙

**VITE_ 접두사의 의미**:
- `VITE_XXX`: 브라우저에 노출됨 (빌드 시 번들에 포함)
- `XXX`: 서버 전용, 브라우저 접근 불가

**안전한 변수**:
- ✅ `VITE_SUPABASE_URL`: 공개 정보
- ✅ `VITE_SUPABASE_ANON_KEY`: 공개용 키 (RLS로 보호)

**절대 VITE_ 붙이면 안 되는 변수**:
- ❌ `GEMINI_API_KEY`: API 키 (서버 전용)
- ❌ `NAVER_CLIENT_SECRET`: 비밀 키 (서버 전용)
- ❌ `SUPABASE_SERVICE_KEY`: 관리자 키 (서버 전용)

### Git 커밋 규칙

```
feat: 새 기능 추가
fix: 버그 수정
refactor: 코드 리팩토링
style: 코드 포맷팅 (기능 변경 없음)
docs: 문서 수정
test: 테스트 추가/수정
chore: 빌드 설정 등
```

---

## 🖥️ 터미널 명령어 규칙 (Windows PowerShell)

### 필수 사항
- **개발 환경**: Windows PowerShell
- **금지**: CMD 명령어 사용 금지
- **원칙**: PowerShell 네이티브 cmdlet만 사용

### PowerShell 명령어 가이드

#### 파일 및 폴더 작업

```powershell
# 폴더 생성
New-Item -Path "폴더경로" -ItemType Directory

# 파일 생성
New-Item -Path "파일경로" -ItemType File

# 파일 복사
Copy-Item -Path "원본" -Destination "대상"

# 폴더 복사 (재귀)
Copy-Item -Path "원본폴더" -Destination "대상폴더" -Recurse

# 파일/폴더 삭제
Remove-Item -Path "경로" -Force

# 폴더 삭제 (재귀)
Remove-Item -Path "폴더경로" -Recurse -Force

# 파일/폴더 이동
Move-Item -Path "원본" -Destination "대상"

# 파일/폴더 이름 변경
Rename-Item -Path "기존이름" -NewName "새이름"
```

#### 디렉토리 탐색

```powershell
# 현재 디렉토리 확인
Get-Location

# 디렉토리 이동
Set-Location -Path "경로"

# 디렉토리 내용 보기
Get-ChildItem
Get-ChildItem -Recurse  # 재귀적으로 보기
```

#### 파일 내용 작업

```powershell
# 파일 내용 보기
Get-Content -Path "파일경로"

# 파일에 내용 쓰기 (덮어쓰기)
Set-Content -Path "파일경로" -Value "내용"

# 파일에 내용 추가
Add-Content -Path "파일경로" -Value "내용"
```

### ❌ 사용 금지 명령어 (CMD)

```bash
# 절대 사용하지 말 것
mkdir          # → New-Item -ItemType Directory
rmdir /S /Q    # → Remove-Item -Recurse -Force
xcopy /E /I    # → Copy-Item -Recurse
del            # → Remove-Item
copy           # → Copy-Item
move           # → Move-Item
ren            # → Rename-Item
cd             # → Set-Location
dir            # → Get-ChildItem
type           # → Get-Content
```

### 프로젝트 관련 명령어

```powershell
# 개발 서버 시작
npm run dev

# 빌드
npm run build

# 의존성 설치
npm install

# 불필요한 폴더 삭제 (.next, node_modules 등)
Remove-Item -Path ".next" -Recurse -Force
Remove-Item -Path "node_modules" -Recurse -Force

# Git 작업
git status
git add .
git commit -m "메시지"
git push
```

### 주의사항

1. **Invoke-Expression 사용 금지**: 명령어를 문자열로 감싸서 실행하지 않습니다.
   ```powershell
   # ❌ 잘못된 예
   Invoke-Expression "Remove-Item -Path '.next' -Recurse -Force"
   
   # ✅ 올바른 예
   Remove-Item -Path ".next" -Recurse -Force
   ```

2. **경로에 따옴표 사용**: 공백이 포함된 경로는 반드시 따옴표로 감쌉니다.
   ```powershell
   Remove-Item -Path "C:\Program Files\MyApp" -Recurse -Force
   ```

3. **상대 경로 사용**: 가능한 한 상대 경로를 사용합니다.
   ```powershell
   Copy-Item -Path ".\src\components" -Destination ".\backup" -Recurse
   ```

---

## 📦 배포 전략

### 프론트엔드 (Vercel)

- **자동 배포**: `main` 브랜치 푸시 시
- **프리뷰 배포**: PR 생성 시
- **환경 변수**: Vercel 대시보드에서 관리

### 크롤러 (Railway)

- **Dockerfile**: Python 앱 컨테이너화
- **스케줄러**: Celery Beat 실행
- **모니터링**: Railway 로그

### 데이터베이스 (Supabase Cloud)

- **백업**: 자동 일일 백업
- **마이그레이션**: Supabase CLI로 버전 관리

---

## 🎯 성공 지표 (KPI)

### 사용자 지표

- **DAU/MAU**: 일일/월간 활성 사용자
- **검색 성공률**: 검색 → 카드 클릭 비율
- **전환율**: 방문 → 공고 등록/지원 비율

### 기술 지표

- **크롤링 성공률**: 전체 소스 대비 성공 비율 (목표: 95%)
- **AI 검색 정확도**: 사용자 만족도 설문 (목표: 4.5/5)
- **페이지 로드 시간**: Lighthouse 성능 점수 (목표: 90+)

---

## 📚 참고 문서

- [Vite 공식 문서](https://vitejs.dev/)
- [React 공식 문서](https://react.dev/)
- [Supabase 공식 문서](https://supabase.com/docs)
- [TailwindCSS 공식 문서](https://tailwindcss.com/)
- [shadcn/ui 공식 문서](https://ui.shadcn.com/)
- [Tabler Icons](https://tabler.io/icons)
- [Radix Colors](https://www.radix-ui.com/colors)
- [Google Gemini API](https://ai.google.dev/)

---

## 🤝 협업 규칙

### 코드 리뷰

- 모든 PR은 최소 1명 승인 필요
- 린트/테스트 통과 필수
- 스크린샷 첨부 (UI 변경 시)

### 브랜치 전략

```
main          # 프로덕션
├── develop   # 개발 통합
    ├── feature/search-ui
    ├── feature/crawler
    └── fix/card-layout
```

### 문서화

- 새 컴포넌트: JSDoc 주석 작성
- 복잡한 로직: README 추가
- API 변경: CHANGELOG 업데이트

---

## ✅ 체크리스트

### 개발 시작 전

- [ ] Node.js, pnpm 설치
- [ ] Supabase 프로젝트 생성
- [ ] 환경 변수 설정
- [ ] ESLint, Prettier 설정 확인
- [ ] esamanru Medium.ttf 폰트 확인

### 배포 전

- [ ] 린트 에러 0개
- [ ] 테스트 통과
- [ ] Lighthouse 점수 확인
- [ ] 환경 변수 프로덕션 설정

---

이 규칙을 따라 일관성 있고 확장 가능한 서비스를 만들어갑니다. 🚀
