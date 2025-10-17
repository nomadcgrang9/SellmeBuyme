# 셀미바이미 (SellmeBuyme) 백엔드 구현 계획

> 프론트엔드 디자인을 실제 동작하도록 만드는 백엔드 구현 전략

---

## 📊 현재 상태

### 프론트엔드
- **프레임워크**: Next.js 14 (App Router)
- **데이터 소스**: Supabase 실시간 데이터 (`lib/supabase/*`, `app/actions/jobs.ts`), 기존 더미데이터 제거
- **주요 컴포넌트**: Header, AIRecommendations, AIInsightBox, CardGrid

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
프론트엔드 (Next.js 14)
    ↕
Supabase (PostgreSQL + Auth + Realtime + Edge Functions)
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

### Next.js Server Actions

```typescript
// app/actions/jobs.ts
'use server'

export async function getJobs(filters: FilterParams) {
  const supabase = createServerClient()
  const { data } = await supabase
    .from('job_postings')
    .select('*')
    .eq('location', filters.location)
    .order('created_at', { ascending: false })
  return data
}

export async function createJob(formData: FormData) {
  // 인증 확인 → 데이터 검증 → DB 삽입
}

export async function getTalents(filters: FilterParams) {
  // 인력풀 조회
}

export async function createTalent(formData: FormData) {
  // 인력 등록
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
// lib/api/search.ts
const isDev = process.env.NODE_ENV === 'development'

export async function searchWithAI(query: string) {
  const endpoint = isDev 
    ? 'http://localhost:3001/api/ai-search'  // 로컬 프록시
    : `${SUPABASE_URL}/functions/v1/ai-search`  // Edge Function
  
  const response = await fetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({ query })
  })
  return response.json()
}
```

---

## 🔐 인증 & 권한

### Supabase Auth

```typescript
// lib/supabase/client.ts
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
// components/ai/AIInsightBox.tsx
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

## 🚀 구현 우선순위

### Phase 1: 데이터베이스 & 기본 API (1-2주)
1. Supabase 프로젝트 생성
2. 데이터베이스 스키마 마이그레이션
3. 더미데이터 → Supabase 이관
4. 기본 CRUD Server Actions 구현
5. 프론트엔드 연동 (카드 리스트)

### Phase 2: 인증 & 폼 (1주)
6. Supabase Auth 통합 (이메일 로그인)
7. 공고/인력 등록 폼 (Server Actions)
8. 검색 필터링 (지역, 분야, 정렬)

### Phase 3: AI 검색 (2주)
9. Gemini API 통합 (Edge Function)
10. 로컬 프록시 서버 (개발용)
11. AI 검색 결과 박스 UI 연동

### Phase 4: 크롤링 시스템 (2-3주)
12. Python 크롤러 개발 (3-5개 교육청)
13. Celery 스케줄링 설정
14. 데이터 정규화 파이프라인
15. 실시간 통계 업데이트

### Phase 5: 고도화 (3-6주)
16. 전체 25개 교육청 크롤링
17. AI 추천 알고리즘 개선
18. 성능 최적화 (캐싱, 인덱싱)
19. 관리자 대시보드

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

## 🗂️ 디렉토리 구조

```
sellme-buyme/
├── app/
│   ├── actions/              # Server Actions
│   │   ├── jobs.ts
│   │   ├── talents.ts
│   │   └── search.ts
│   └── auth/
│       └── callback/         # OAuth 콜백
│
├── lib/
│   ├── supabase/
│   │   ├── client.ts         # Client Component용
│   │   ├── server.ts         # Server Component용
│   │   └── middleware.ts
│   └── api/
│       ├── gemini.ts
│       └── jobs.ts
│
├── supabase/
│   ├── migrations/           # DB 스키마
│   ├── functions/            # Edge Functions
│   │   └── ai-search/
│   └── seed.sql
│
├── crawler/                  # Python 크롤러
│   ├── sources/
│   ├── tasks/
│   └── config.py
│
└── dev-proxy/                # 로컬 개발용
    ├── server.js
    └── .env
```

---

## ⚠️ 주의사항

### 환경 변수 보안

```bash
# .env.local (Git 제외!)

# 브라우저 노출 OK
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...

# 서버 전용 (NEXT_PUBLIC_ 없음!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
GEMINI_API_KEY=AIzaSy...
```

### API 키 노출 방지
- ❌ 브라우저에서 직접 Gemini API 호출 금지
- ✅ Edge Function 또는 로컬 프록시 경유
- ✅ `NEXT_PUBLIC_` 접두사 주의 (공개됨)

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
