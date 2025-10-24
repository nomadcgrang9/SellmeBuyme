# 셀미바이미 (SellmeBuyme) 백엔드 구현 계획

> 프론트엔드 디자인을 실제 동작하도록 만드는 백엔드 구현 전략

---

## 🔄 최근 변경사항 (2025-01-18)
- **프론트엔드 전환**: Next.js → Vite + React (클라이언트 전용)
- **Supabase 구조 단순화**: SSR/middleware 제거, 클라이언트 전용 연결
- **배포**: Cloudflare Pages로 변경
- **환경 변수**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **DB 스키마**: `job_postings` 테이블에 `structured_content` (JSONB) 추가로 구조화된 공고 정보 저장

### 추가 업데이트 (2025-10-21)
- **OAuth 로그인 연동**: Supabase `user_profiles` 테이블과 직접 연동하도록 `fetchUserProfile()`/`upsertUserProfile()`을 수정해 OAuth 인증 뒤 기존 회원을 즉시 식별.
- **프로필 상태 동기화**: `/auth/callback` 및 `App.tsx`에서 로그인 후 `user_profiles`를 조회해 신규 회원만 `ProfileSetupModal`을 보도록 조정.
- **검색 로그 호환성**: Supabase `search_logs` 스키마 변경에 대응하여 `duration_ms` 칼럼이 없을 때도 에러 없이 기록하도록 로깅 로직 완화.

### 추가 업데이트 (2025-10-18)
- **검색 로그 테이블 도입**: `supabase/migrations/20250120_search_logging_and_trgm.sql`에 `search_logs` 테이블을 추가해 검색어·토큰·필터·응답 수·소요 시간·에러 여부를 기록.
- **검색 인덱스 성능 개선**: 동일 마이그레이션에서 `job_postings.title`, `job_postings.organization`, `job_postings.location`, `talents.name`, `talents.specialty` 컬럼에 `pg_trgm` GIN 인덱스를 생성해 `ILIKE` 기반 검색 성능을 향상.
- **크롤링 첨부파일 수집**: `crawler/sources/seongnam.js`가 `.prvw` 영역의 `previewAjax()` 호출에서 직접 파일 URL을 파싱해 `attachment_url`을 저장하도록 개선.
- **중복 공고 갱신**: `crawler/lib/supabase.js`에서 기존 `source_url` 레코드를 찾아 업데이트(♻️)하여 첨부파일 등 필드 변경 사항이 반영되도록 수정.
- **환경 변수**: Vite 런타임에서도 Supabase 초기화가 가능하도록 `.env`에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`를 명시.

--### 추가 업데이트 (2025-10-19)
- **첨부 다운로드 Edge Function**: `supabase/functions/download-attachment/index.ts`를 통해 `Content-Disposition`을 제어하여 `"<학교명> 공고문.hwp"` 형식으로 파일을 내려받도록 정리. `crawler/index.js`는 `buildAttachmentDownloadUrl()`을 사용해 Edge Function 경유 URL을 저장함.
- **데이터 마이그레이션 스크립트**: 기존 레코드의 `attachment_url`을 일괄 변환하기 위해 `crawler/migrate-attachment-urls.js`를 작성. Supabase `service_role` 키 기반 업데이트를 수행하며, 크롤링 데이터 정합성을 유지함.
- **RLS 고려사항**: `job_postings` 테이블에 Row Level Security가 적용되어 있으므로 배치 스크립트에서는 `SUPABASE_SERVICE_ROLE_KEY`를 사용해야 하며, anon 키로 업데이트하려면 별도 RLS 정책을 열어야 함.
- **크롤 배치 사이즈 상향**: `getOrCreateCrawlSource()`가 `crawl_boards.crawl_batch_size` 기본값을 10으로 사용하고, `crawler/index.js` 기본값도 10으로 통일하여 게시판당 10건까지 처리.
- **중복 공고 AI 스킵**: `crawler/index.js`에서 기존 공고가 있으며 첨부 갱신 필요가 없으면 `skippedCount++` 후 즉시 `continue`하여 Gemini Vision/정규화/검증 호출을 생략.
- **토큰 사용량 추적**: `crawler/lib/gemini.js`에 세션별 토큰 누계(`apiCalls`, `totalPromptTokens`, `totalCandidatesTokens`, `totalTokens`)를 기록하는 헬퍼를 추가하고, 크롤 종료 시 콘솔로 요약.

### 추가 업데이트 (2025-10-20)
- **추천 캐시 테이블 추가**: `supabase/migrations/20250120_add_recommendations_cache.sql`로 `recommendations_cache` 테이블 생성. `user_id`를 PK로 두고 추천 카드 배열(`cards`), AI 코멘트(`ai_comment`), 프로필 스냅샷(`profile_snapshot`)을 JSONB로 저장하며, RLS를 `auth.uid() = user_id`로 제한.
- **프로필 기반 추천 Edge Function**: `supabase/functions/profile-recommendations/index.ts` 배포. `user_profiles`·`job_postings`·`talents`를 조회해 위치/역할 중심으로 점수화한 뒤 상위 카드를 선별하고, 자리 표시용 AI 코멘트를 생성해 캐시에 업서트.
- **프론트 트리거**: `ProfileSetupModal.tsx`에서 `upsertUserProfile()` 성공 후 `supabase.functions.invoke('profile-recommendations')`를 호출해 캐시를 갱신. `App.tsx`는 `fetchRecommendationsCache()`로 캐시 결과를 불러와 `AIRecommendations`에 주입.
- **환경 변수 관리**: Edge Function은 `PROJECT_URL`·`ANON_KEY` 시크릿을 사용해 Supabase JS 클라이언트를 초기화. 배포 시 Secrets에 값을 확인/추가해야 함.

### 추가 업데이트 (2025-10-23)
- **백엔드 영향 없음**: 공고 카드 UI 정리는 `JobCard.tsx` 수준에서 처리되어 API·DB·Functions 스키마에는 추가 조치가 필요하지 않음을 명시.
- **프로필 스키마 확장**: `supabase/migrations/20250123_extend_user_profiles_schema.sql`로 `teacher_level`, `special_education_type`, `instructor_fields`, `instructor_custom_field`, `profile_image_url` 컬럼을 `user_profiles`에 추가하고, `profiles.ts`의 타입/업서트 로직을 동기화.
- **프로필 이미지 스토리지**: Supabase Storage 버킷 `profiles`를 생성하고 RLS 정책을 추가해 인증 사용자가 이미지를 업로드·삭제할 수 있도록 준비. 클라이언트는 `ProfileSetupModal.tsx`에서 저장 경로를 `profile_image_url`로 유지.

### 추가 업데이트 (2025-10-24)
- **검색 토큰 파이프라인 개편**: `src/lib/supabase/queries.ts`의 `searchCards()`가 `TokenGroup` 구조를 사용해 검색어 동의어를 유지하고, `executeJobSearch()`/`executeTalentSearch()`는 그룹 단위로 FTS 표현식을 구성하도록 수정.
- **ILIKE 조건 통합**: 동일 파일에서 토큰별 `or()` 호출을 단일 OR 문자열로 합쳐 Supabase 쿼리에서 이전 조건이 덮어써지는 문제를 해결.
- **후처리 필터 강화를 통한 품질 보증**: `filterJobsByTokenGroups()`와 `filterTalentsByTokenGroups()`가 각 그룹에서 최소 한 토큰이 매칭되어야 결과를 남기도록 적용해 검색 정확도를 높임.

## 📊 현재 상태

### 프론트엔드
- **프레임워크**: Vite + React 18 (클라이언트 전용)
- **데이터 소스**: Supabase 클라이언트 (`src/lib/supabase/client.ts`), 더미 데이터 (`src/lib/dummyData.ts`)
- **주요 컴포넌트**: 
  - `src/components/layout/Header.tsx`
  - `src/components/ai/AIRecommendations.tsx`
  - `src/components/ai/AIInsightBox.tsx`
  - `src/components/cards/CardGrid.tsx`
  - `src/components/cards/CompactJobCard.tsx`, `CompactTalentCard.tsx`
  - `src/components/cards/JobCard.tsx`, `TalentCard.tsx`

### 필요한 백엔드 기능
1. 데이터베이스 (공고/인력 저장)
2. API (CRUD 작업)
3. 크롤링 (25개 교육청 자동 수집)
4. AI 검색 (자연어 처리)
5. 인증 (사용자 로그인/권한)
6. 실시간 (통계 업데이트)

---

## 🏗️ 백엔드 아키텍처

```
프론트엔드 (Vite + React)
    ↕
Supabase (PostgreSQL + Auth + Realtime)
    ↕
크롤링 시스템 (Python + Playwright + Celery)
    ↕
Google Gemini 2.0 Flash (AI 검색)
```

---

## 🗄️ 데이터베이스 스키마

### 핵심 테이블

```sql
-- 사용자
users (
  id uuid PRIMARY KEY,
  email text UNIQUE,
  role enum('school', 'talent', 'admin'),
  profile_data jsonb,
  created_at timestamp
)

-- 공고
job_postings (
  id uuid PRIMARY KEY,
  source enum('crawled', 'user_posted'),
  organization text,
  title text,
  content text,
  tags text[],
  location text,
  compensation text,
  deadline date,
  is_urgent boolean,
  view_count integer DEFAULT 0,
  created_at timestamp
)

-- 인력풀
talents (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES users(id),
  name text,
  specialty text,
  tags text[],
  location text[],
  experience_years integer,
  is_verified boolean DEFAULT false,
  rating numeric(2,1),
  review_count integer DEFAULT 0,
  created_at timestamp
)

-- 크롤링 소스
crawl_sources (
  id uuid PRIMARY KEY,
  name text,
  base_url text,
  parser_type enum('html', 'api'),
  selectors jsonb,
  status enum('active', 'broken', 'blocked'),
  last_successful timestamp
)

-- 검색 로그
search_logs (
  id uuid PRIMARY KEY,
  user_id uuid,
  query text,
  filters jsonb,
  result_count integer,
  created_at timestamp
)
```

---

## 🔌 API 설계

### Supabase 클라이언트 API (Vite + React)

```typescript
// src/lib/api/jobs.ts
import { supabase } from '@/lib/supabase/client'

export async function getJobs(filters: FilterParams) {
  const { data, error } = await supabase
    .from('job_postings')
    .select('*')
    .eq('location', filters.location)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createJob(jobData: JobPostingInput) {
  const { data, error } = await supabase
    .from('job_postings')
    .insert([jobData])
    .select()
  
  if (error) throw error
  return data
}

export async function getTalents(filters: FilterParams) {
  const { data, error } = await supabase
    .from('talents')
    .select('*')
    .in('location', filters.locations)
    .order('rating', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createTalent(talentData: TalentInput) {
  const { data, error } = await supabase
    .from('talents')
    .insert([talentData])
    .select()
  
  if (error) throw error
  return data
}
```

---

## 🕷️ 크롤링 시스템

### Python 크롤러 구조

```python
# crawler/sources/gyeonggi_suwon.py
class SuwonCrawler(BaseCrawler):
    async def crawl(self):
        async with async_playwright() as p:
            browser = await p.chromium.launch()
            page = await browser.new_page()
            await page.goto(self.base_url)
            
            items = await page.query_selector_all('.notice-item')
            for item in items:
                data = await self.parse_item(item)
                await self.save_to_supabase(data)
```

### Celery 스케줄링

```python
# crawler/tasks/crawl_task.py
@app.task
def crawl_all_sources():
    sources = get_active_sources()
    for source in sources:
        crawler = get_crawler(source.name)
        crawler.crawl()

# 매 시간 정각 실행
app.conf.beat_schedule = {
    'crawl-every-hour': {
        'task': 'tasks.crawl_all_sources',
        'schedule': crontab(minute=0),
    },
}
```

---

## 🤖 AI 검색 통합

### Gemini API 호출 (Edge Function)

```typescript
// supabase/functions/ai-search/index.ts
serve(async (req) => {
  const { query } = await req.json()
  
  const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY')!)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' })
  
  const prompt = `
    사용자 검색어: "${query}"
    JSON 형식으로 검색 의도 파악:
    {
      "location": ["지역1", "지역2"],
      "keywords": ["키워드1", "키워드2"],
      "type": "job" | "talent" | "both"
    }
  `
  
  const result = await model.generateContent(prompt)
  const structured = JSON.parse(result.response.text())
  
  // PostgreSQL 쿼리 실행
  const jobs = await queryDatabase(structured)
  
  return new Response(JSON.stringify({
    results: jobs,
    message: generateAIMessage(structured, jobs.length)
  }))
})
```

### 프론트엔드 통합

```typescript
// src/lib/api/search.ts
const isDev = import.meta.env.DEV  // Vite 환경 변수

export async function searchWithAI(query: string) {
  const endpoint = isDev 
    ? 'http://localhost:3001/api/ai-search'  // 로컬 프록시
    : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-search`  // Edge Function
  
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
    },
    body: JSON.stringify({ query })
  })
  return response.json()
}
```

---

## 🔐 인증 & 권한

### Supabase Auth

```typescript
// src/lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email, password
  })
  return { data, error }
}

export async function signInWithGoogle() {
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/auth/callback` }
  })
}
```

### Row Level Security (RLS)

```sql
-- 공고는 본인만 수정 가능
CREATE POLICY "Users can update own job postings"
ON job_postings FOR UPDATE
USING (auth.uid() = user_id);

-- 인력풀은 본인만 수정 가능
CREATE POLICY "Users can update own talent profile"
ON talents FOR UPDATE
USING (auth.uid() = user_id);
```

---

## 📡 실시간 기능

```typescript
// src/components/ai/AIInsightBox.tsx
import { supabase } from '@/lib/supabase/client'
import { useEffect } from 'react'

useEffect(() => {
  // 초기 데이터
  fetchStats()
  
  // 실시간 구독
  const channel = supabase
    .channel('stats')
    .on('postgres_changes', 
      { event: 'INSERT', schema: 'public', table: 'job_postings' },
      () => fetchStats()
    )
    .subscribe()
  
  return () => { supabase.removeChannel(channel) }
}, [])
```

---

## 🚀 구현 로드맵 (2025-10-18 업데이트)

### 📊 현재 구현 상태

- **완료된 부분**
  - 헤더, `AIRecommendations`, `AIInsightBox`, `CardGrid` 등 기본 UI 컴포넌트
  - Supabase 연결 및 기본 조회 쿼리 (`src/lib/supabase/queries.ts`)
  - 더미 데이터 기반 카드 렌더링
  - 크롤러 기본 구조 (`crawler/`), 성남교육청 파서 구현
  - 상세보기 모달 `JobDetailModal`

- **미구현 부분**
  - 자연어 검색, 필터링, 정렬, 전환 토글 실제 동작
  - Supabase Auth 기반 로그인 및 역할 관리
  - 공고/인력/체험 등록 폼과 제출 플로우
  - AI 추천 알고리즘 및 메시지 생성 고도화
  - 실시간 통계, 알림, 채팅 등 실시간 기능

### Phase 1: 핵심 데이터 흐름 구축 (1-2주)

- **기준**: 사용자가 실제 데이터를 검색·필터링하며 카드 리스트를 탐색할 수 있도록 함
- **우선 작업**
  - 키워드 기반 Supabase Full-Text Search 구현
  - 지역·분야·정렬 드롭다운과 공고/인력 전환 토글 상태 관리
  - Intersection Observer를 활용한 무한 스크롤 페이지네이션
  - 더미 데이터 제거 후 Supabase 실제 데이터 연동 및 쿼리 인덱스 설계

### Phase 2: 크롤링 시스템 확장 (2-3주)

- **기준**: 자동으로 수집된 교육청 공고 데이터를 안정적으로 제공
- **우선 작업**
  - 수원, 용인, 화성, 안양 등 추가 교육청 파서 3-5개 구축
  - 날짜·지역·태그 표준화 파이프라인과 중복 제거 해시 로직 정비
  - 첨부파일(URL) 수집과 저장 구조 확립
  - Celery + Redis 작업 큐, 시간 기반 스케줄링, 에러 재시도 정책 적용

### Phase 3: 인증 및 사용자 플로우 (1-2주)

- **기준**: 사용자 계정 생성과 콘텐츠 등록이 가능한 상태로 전환
- **우선 작업**
  - Supabase Auth(이메일/비밀번호, 필요 시 Google OAuth) 연동
  - 역할 기반 접근 제어(`school`, `talent`, `admin`)와 프로필 페이지 베이스 구축
  - 공고/인력/체험 등록 폼 UI + React Hook Form + Zod 검증 적용
  - 제출 데이터 Supabase 저장, 업로드 자산 처리 전략 수립

### Phase 4: AI 기능 구현 (2-3주)

- **기준**: AI가 검색 의도를 해석하고 맞춤 추천을 생성
- **우선 작업**
  - 로컬 개발용 Express 프록시와 Supabase Edge Function `ai-search` 구축
  - Gemini 2.0 Flash 호출 → 위치/키워드/타입 등 구조화된 검색 파라미터 생성
  - AI 메시지 생성 템플릿 통합 및 UI 반영
  - 추천 카드 정렬 로직 v1 (긴급도 + 최신순) 구현, 사용자 행동 로그 기반 고도화 준비

### Phase 5: 실시간 및 사용자 경험 고도화 (3-4주)

- **기준**: 실시간 알림과 커뮤니케이션 기능으로 서비스 완성도 강화
- **우선 작업**
  - Supabase Realtime 구독으로 신규 공고·인력 등록 시 갱신
  - `AIInsightBox` 실시간 통계 연동, 배너 슬라이더 자동 회전 및 관리자 등록 연결
  - 학교-강사 간 문의(채팅/메일 트리거)와 즐겨찾기/알림 기능
  - 평점·후기 시스템, 접근성·반응형 최적화, 번들 경량화

### Phase 6: 운영 도구 및 분석 (2-3주)

- **기준**: 내부 운영 효율과 데이터 기반 의사결정 지원
- **우선 작업**
  - 관리자 대시보드로 크롤링 성공률, 사용자 관리, 배너 운영 모듈화
  - 검색 로그 및 사용자 행동 분석 지표 수집·시각화
  - A/B 테스트 기반 AI 메시지/카드 레이아웃 실험 환경 구축

### 🔧 즉시 추진 가능한 작업 (Quick Wins)

- **전환 토글 상태 연동**: `Header` 토글과 `CardGrid` 필터 상태 통합
- **기본 검색 엔드포인트**: 단일 키워드 → Supabase RLS 준수 조회
- **필터 드롭다운 연동**: 지역/분야 선택 시 Supabase 쿼리 파라미터 업데이트
- **무한 스크롤 스켈레톤**: Intersection Observer로 추가 페이지 프리패치

### 🗓️ 주차별 권장 순서

1. **Week 1-2**: Phase 1 전체 (검색·필터·무한 스크롤)
2. **Week 3-4**: Phase 2 핵심 (추가 크롤러, 정규화, 스케줄러)
3. **Week 5-6**: Phase 3 (Auth + 등록 폼)
4. **Week 7-9**: Phase 4 (AI 검색/추천)
5. **Week 10-12**: Phase 5 (실시간, 사용자 경험 고도화)
6. **Week 13+**: Phase 6 (관리자, 분석)

### ✅ 진행 기준

- **사용자 가치**: 즉시 체감 가능한 기능을 우선 구현
- **기술 의존성**: 상위 단계의 선행 조건을 먼저 해결
- **개발 난이도**: 빠르게 구현 가능한 항목부터 처리해 모멘텀 확보
- **비즈니스 임팩트**: 핵심 가치 제공 기능을 우선 배치

---

## 📦 필요한 패키지

### Next.js 프로젝트

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0",
    "@supabase/auth-helpers-nextjs": "^0.8.0",
    "@google/generative-ai": "^0.1.0",
    "zod": "^3.22.0",
    "react-hook-form": "^7.49.0",
    "@tanstack/react-query": "^5.17.0"
  }
}
```

### Python 크롤러

```txt
playwright==1.40.0
beautifulsoup4==4.12.0
celery==5.3.0
redis==5.0.0
supabase==2.0.0
python-dotenv==1.0.0
```

---

## 🛠️ 디렉토리 구조

```
sellme-buyme/
├── src/
│   ├── components/
│   │   ├── ai/
│   │   │   ├── AIRecommendations.tsx
│   │   │   └── AIInsightBox.tsx
│   │   ├── cards/
│   │   │   ├── CardGrid.tsx
│   │   │   ├── CompactJobCard.tsx
│   │   │   ├── CompactTalentCard.tsx
│   │   │   ├── JobCard.tsx
│   │   │   └── TalentCard.tsx
│   │   └── layout/
│   │       ├── Header.tsx
│   │       └── StripeBanner.tsx
│   ├── lib/
│   │   ├── supabase/
│   │   │   └── client.ts         # Supabase 클라이언트
│   │   ├── dummyData.ts          # 더미 데이터
│   │   └── utils.ts              # 유틸리티 함수
│   ├── types/
│   │   └── index.ts              # TypeScript 타입
│   ├── App.tsx                   # 메인 앱 컴포넌트
│   ├── main.tsx                  # 엔트리 포인트
│   └── index.css                 # 글로벌 스타일
│
├── public/
│   └── fonts/                    # esamanru 폰트
│
├── supabase/
│   ├── migrations/               # DB 스키마
│   ├── functions/                # Edge Functions
│   │   └── ai-search/
│   └── seed.sql
│
├── crawler/                      # Python 크롤러
│   ├── sources/
│   ├── tasks/
│   └── config.py
│
├── dev-proxy/                    # 로컬 개발용
│   ├── server.js
│   └── .env
│
├── index.html                    # Vite 엔트리 HTML
├── vite.config.ts                # Vite 설정
├── tsconfig.json                 # TypeScript 설정
└── package.json
```

---

## ⚠️ 주의사항

### 환경 변수 보안

```bash
# .env (Git 제외!)

# 브라우저 노출 OK (VITE_ 접두사)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# 서버 전용 (VITE_ 없음 = 브라우저 접근 불가)
GEMINI_API_KEY=AIzaSy...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### API 키 노출 방지
- ❌ 브라우저에서 직접 Gemini API 호출 금지
- ✅ Edge Function 또는 로컬 프록시 경유
- ✅ `VITE_` 접두사 주의 (공개됨)

### 크롤링 윤리
- robots.txt 준수
- Rate Limiting (1초당 1-2 요청)
- User-Agent 명시
- 교육청 서버 부하 최소화

---

## 🎯 핵심 기술 선택 이유

| 기술 | 선택 이유 |
|------|----------|
| **Supabase** | PostgreSQL + Auth + Realtime 통합, 빠른 개발 |
| **Next.js 14** | App Router, Server Actions, SEO 최적화 |
| **Gemini 2.0** | 최신 AI 모델, 자연어 이해 우수 |
| **Playwright** | JavaScript 렌더링 대응, 안정적 크롤링 |
| **Celery** | 비동기 처리, 스케줄링 표준 |

---

## 📝 다음 단계

1. **Supabase 프로젝트 생성** → 환경 변수 설정
2. **데이터베이스 마이그레이션** → 스키마 적용
3. **Server Actions 구현** → 더미데이터 대체
4. **프론트엔드 연동** → 실제 데이터 표시

---

이 계획을 따라 단계별로 구현하면 프론트엔드 디자인이 실제 동작하는 서비스로 완성됩니다. 🚀
