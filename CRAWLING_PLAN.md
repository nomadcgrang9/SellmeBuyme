# 셀미바이미 크롤링 시스템 계획

> 경기도 교육지원청 및 기타 구인 게시판 자동 수집 시스템

---

## 🎯 목표

- **대상**: 게시판 단위 관리 (교육지원청, 도교육청 통합 게시판 등)
- **주기**: 매일 오전 7시 (1회, 순차 실행)
- **규모**: 일 50-75건 예상
- **비용**: Gemini 무료 티어 활용 (토큰 최적화)
- **최근 업데이트 (2025-10-19)**: 게시판별 기본 크롤 수를 10개로 상향하고, 완전 중복 공고는 AI 처리 전에 건너뛰어 토큰 사용을 최소화함.

---

## 📊 게시판 관리 방식

### 게시판 중심 접근
- **교육지원청 구분 없음**: 게시판 단위로 개별 관리
- **유연한 추가**: 도교육청 통합 게시판, 개별 지원청 게시판 모두 대응
- **수동 등록**: 관리자 페이지에서 게시판 URL 및 설정 직접 입력

### 권한 및 보안 고려사항 (2025-10-19)
- **RLS 정책 주의**: `job_postings` 테이블 등 주요 저장소에 Row Level Security가 적용되어 있으므로, 크롤러나 마이그레이션 스크립트를 돌릴 때는 `SUPABASE_SERVICE_ROLE_KEY`를 사용하거나 anon 역할에 대한 UPDATE 정책을 명시적으로 허용해야 함.
- **서비스 롤 키 사용 지침**: 배치 작업·Edge Function 등 서버 측에서만 `service_role` 키를 사용하고, 크롤러 환경 파일(`crawler/.env`)에 안전하게 보관.
- **정책 미설정 시 증상**: 첨부파일 URL이 Edge Function 경유 URL로 저장되지 않고 원본 주소가 남아, 프런트에서 다운로드 파일명이 숫자형으로 내려오는 문제가 재발 가능.

### 등록 대상 예시
- 성남교육지원청 구인구직 게시판
- 경기도교육청 통합 채용 게시판 (2025.5월 이후)
- 기타 교육 관련 구인 게시판

---

## 🏗️ 시스템 아키텍처

```
Cron Scheduler (매일 오전 7시)
    ↓
관리자 페이지 (게시판 등록/설정)
    ↓
크롤러 엔진 (순차 실행)
    ↓
Playwright (HTML 수집)
    ↓
중복 체크 (URL 기반) ← ⚡ AI 호출 전 필터링
    ↓
Gemini AI (데이터 정규화) ← 신규 공고만
    ↓
Gemini AI (검증)
    ↓
Supabase (저장)
    ↓
프론트엔드 (실시간 반영)
```

### 토큰 최적화 전략
- **중복 체크 우선**: 원본 URL로 DB 조회하여 이미 등록된 공고는 AI 분석 전 스킵 (첨부 재다운로드가 필요할 때만 재처리)
- **완전 중복 스킵**: `crawler/index.js`에서 기존 공고가 있고 첨부 갱신 필요가 없으면 `skippedCount`를 증가시키고 AI 파이프라인 전체를 건너뜀.
- **토큰 사용량 로깅**: `crawler/lib/gemini.js`에서 호출 수·프롬프트·응답 토큰 누계를 기록해 세션별 비용을 추적.
- **순차 실행**: 게시판 하나씩 처리하여 부하 분산 (게시판 간 30초~1분 대기)
- **에러 시 재시도 제한**: 3회 연속 실패 시 해당 게시판 비활성화

---

## 🤖 AI 활용 전략

### 1. 데이터 정규화 (필수)
```javascript
// 각 교육청마다 다른 형식을 통일
입력: "2025.10.20(월) ~ 10.25(금) 18:00까지"
출력: "2025-10-25T18:00:00"

입력: "성남시 분당구 소재 초등학교"
출력: "성남 분당구"
```

### 2. HWP 링크 추출 (필수)
```javascript
// 상세 페이지에서 다운로드 링크 추출
// 직접 다운로드 X, 링크만 저장하여 교육청 서버에서 다운로드
```

### 3. 태그 자동 생성 (필수)
```javascript
입력: "2025학년도 방과후학교 코딩 강사 모집"
출력: ["코딩", "방과후", "초등"]
```

### 4. 데이터 검증 (필수)
```javascript
// 과거 날짜, 경기도 외 지역, 필수 필드 누락 자동 감지
```

---

## 📦 기술 스택

### 크롤러
```json
{
  "runtime": "Node.js 20",
  "crawler": "Playwright",
  "ai": "Gemini 2.0 Flash",
  "database": "Supabase",
  "scheduler": "GitHub Actions"
}
```

### 패키지
```bash
npm install playwright @supabase/supabase-js @google/generative-ai dotenv
```

---

## 🚀 구현 단계

### Phase 1: 데이터베이스 설계 (1일)
1. `crawl_boards` 테이블 생성 (게시판 마스터)
2. `crawl_logs` 테이블 생성 (크롤링 이력)
3. 중복 체크를 위한 `source_url` 인덱스 추가

### Phase 2: 게시판 등록 시스템 (2-3일)
1. 관리자 페이지 - 게시판 등록 UI
2. 게시판 설정 페이지 (셀렉터 입력)
3. 테스트 크롤링 기능 (실시간 미리보기)

### Phase 3: 크롤러 엔진 (4-5일)
1. 설정 기반 범용 크롤러 구현
2. **중복 체크 로직**: URL 기반 사전 필터링
3. Gemini AI 정규화 (신규 공고만)
4. 에러 핸들링 및 로깅

> 각 게시판은 `crawl_batch_size`(기본 20개)로 최신 공고를 가져오며, 관리자 UI에서 게시판별로 조정 가능

### Phase 4: 스케줄러 및 대시보드 (3-4일)
1. Cron Job 설정 (매일 오전 7시)
2. 순차 실행 로직 (게시판 간 대기)
3. 관리자 대시보드 (상태 모니터링)
4. 크롤링 이력 조회

### Phase 5: 실제 게시판 등록 (1-2주)
1. 성남교육지원청으로 파일럿 테스트
2. 점진적으로 게시판 추가 (수동 작업)
3. 각 게시판별 설정 최적화

---

## 💾 데이터 구조

### crawl_boards (게시판 마스터)
```sql
CREATE TABLE crawl_boards (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,              -- 게시판 이름
  board_url TEXT NOT NULL,         -- 게시판 URL
  category TEXT,                   -- 분류 (교육지원청명 등)
  is_active BOOLEAN DEFAULT true,  -- 활성화 여부
  crawl_batch_size INT DEFAULT 20 CHECK (crawl_batch_size > 0), -- 1회 크롤 수
  crawl_config JSONB,              -- 셀렉터 설정
  last_crawled_at TIMESTAMPTZ,     -- 마지막 크롤링 시간
  last_success_at TIMESTAMPTZ,     -- 마지막 성공 시간
  error_count INT DEFAULT 0,       -- 연속 실패 횟수
  error_message TEXT,              -- 최근 에러 메시지
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### crawl_logs (크롤링 이력)
```sql
CREATE TABLE crawl_logs (
  id UUID PRIMARY KEY,
  board_id UUID REFERENCES crawl_boards(id),
  status TEXT,                     -- success/failed
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  items_found INT,                 -- 발견된 공고 수
  items_new INT,                   -- 신규 공고 수
  items_skipped INT,               -- 중복으로 스킵된 수
  ai_tokens_used INT,              -- 사용된 토큰 수
  error_log TEXT
);
```

### jobs 테이블 (기존 + source_url 인덱스)
```sql
-- 중복 체크를 위한 인덱스
CREATE INDEX idx_jobs_source_url ON jobs(source_url);

-- 저장 형식
{
  "source": "crawled",
  "source_url": "https://www.goesn.kr/...",  -- ⚡ 중복 체크 키
  "crawl_board_id": "게시판 UUID",
  "organization": "성남교육지원청",
  "title": "영어 시간강사",
  "tags": ["영어", "시간강사", "중등"],
  "location": "성남 분당구",
  "compensation": "시급 30,000원",
  "deadline": "2025-10-25T18:00:00",
  "attachments": {
    "hwp_url": "https://www.goesn.kr/download/..."
  }
}
```

---

## 🔍 Gemini AI 프롬프트

### 정규화 프롬프트
```
다음 공고 데이터를 JSON으로 정규화:

제목: {rawTitle}
날짜: {rawDate}
링크: {rawLink}

출력 형식:
{
  "organization": "성남교육지원청",
  "title": "직무명만",
  "tags": ["분야1", "분야2"],
  "location": "성남 XX구",
  "deadline": "YYYY-MM-DD",
  "compensation": "시급/일급 N원",
  "hwp_url": "다운로드 링크"
}
```

### 검증 프롬프트
```
다음 데이터를 검증하고 오류가 있으면 수정:

{data}

규칙:
1. deadline은 미래 날짜
2. location은 경기도 내
3. compensation은 현실적 금액
4. tags는 2-5개

응답:
{
  "is_valid": true/false,
  "corrected_data": {...},
  "errors": ["오류1", "오류2"]
}
```

---

## ⚙️ 크롤링 실행 흐름

### 매일 오전 7시 자동 실행
```javascript
// node-cron 사용
cron.schedule('0 7 * * *', async () => {
  console.log('크롤링 시작:', new Date());
  
  // 1. 활성화된 게시판 목록 조회
  const boards = await getActiveBoards();
  
  // 2. 순차 실행
  for (const board of boards) {
    try {
      // 3. 크롤링 실행
      const result = await crawlBoard(board);
      
      // 4. 결과 로깅
      await logCrawlResult(board.id, result);
      
      // 5. 다음 게시판 전 대기 (30초)
      await sleep(30000);
      
    } catch (error) {
      await handleCrawlError(board.id, error);
    }
  }
  
  console.log('크롤링 완료');
});
```

### 중복 체크 로직 (토큰 절약)
```javascript
async function crawlBoard(board) {
  // 1. 목록 페이지에서 공고 링크 수집
  const jobLinks = await getJobLinks(board.board_url, board.crawl_config);
  
  let newCount = 0;
  let skipCount = 0;
  
  for (const link of jobLinks) {
    // 2. ⚡ DB에 이미 존재하는지 체크 (AI 호출 전)
    const exists = await checkJobExists(link);
    
    if (exists) {
      skipCount++;
      continue;  // AI 분석 스킵
    }
    
    // 3. 신규 공고만 상세 페이지 크롤링
    const rawData = await crawlDetailPage(link, board.crawl_config);
    
    // 4. Gemini AI로 정규화 (신규만)
    const normalizedData = await normalizeWithAI(rawData);
    
    // 5. DB 저장
    await saveJob(normalizedData);
    newCount++;
  }
  
  return { found: jobLinks.length, new: newCount, skipped: skipCount };
}
```

---

## 📁 디렉토리 구조

```
crawler/
├── index.js              # Cron 스케줄러 + 메인 실행
├── engine/
│   ├── crawler.js        # 범용 크롤러 엔진
│   ├── duplicate.js      # 중복 체크 로직
│   └── logger.js         # 크롤링 로그 기록
├── lib/
│   ├── playwright.js     # HTML 수집
│   ├── gemini.js         # AI 정규화
│   └── supabase.js       # DB 연동
└── .env

src/
├── components/
│   └── admin/
│       ├── CrawlBoardList.tsx      # 게시판 목록
│       ├── CrawlBoardForm.tsx      # 게시판 등록/수정
│       ├── CrawlConfigEditor.tsx   # 셀렉터 설정
│       ├── CrawlBatchSizeInput.tsx # 1회 크롤링 갯수 입력
│       ├── CrawlTestPanel.tsx      # 테스트 크롤링
│       └── CrawlLogViewer.tsx      # 크롤링 이력
└── pages/
    └── AdminPage.tsx                # 관리자 페이지
```

---

## 🎯 핵심 포인트

1. **게시판 중심 관리**: 교육지원청 구분 없이 게시판 단위로 유연하게 관리
2. **수동 등록 + 자동 크롤링**: 관리자가 게시판 URL과 설정 입력, 이후 자동 실행
3. **토큰 최적화**: URL 기반 중복 체크로 AI 호출 전 필터링 (비용 절감)
4. **순차 실행**: 매일 오전 7시, 게시판 하나씩 처리 (서버 부하 최소화)
5. **에러 격리**: 게시판별 독립 설정으로 한 곳 문제가 전체에 영향 없음

---

## 📊 예상 효과

| 항목 | 내용 |
|------|------|
| **토큰 절감** | 중복 체크로 AI 호출 70-80% 감소 예상 |
| **유지보수** | 게시판별 독립 관리로 문제 격리 용이 |
| **확장성** | 교육청 외 다른 사이트도 동일 방식으로 추가 가능 |
| **안정성** | 순차 실행으로 서버 부하 최소화 |
| **유연성** | 도교육청 통합 게시판 등 상황 변화에 즉시 대응 |

---

## 🚦 다음 단계

1. **Phase 1 시작**: DB 마이그레이션 (crawl_boards, crawl_logs)
2. **Phase 2**: 관리자 페이지 - 게시판 등록 UI
3. **Phase 3**: 크롤러 엔진 + 중복 체크 로직
4. **Phase 4**: 스케줄러 + 대시보드
5. **Phase 5**: 실제 게시판 등록 및 운영

---

## 💡 추가 고려사항

### 토큰 사용량 모니터링
- `crawl_logs` 테이블에 `ai_tokens_used` 필드로 추적
- 일일/월간 토큰 사용량 대시보드 제공
- 무료 티어 한도 초과 시 알림

### 게시판 상태 관리
- 🟢 정상: 24시간 내 성공
- 🟡 경고: 1-3일 사이 성공
- 🔴 오류: 3일 이상 실패 또는 3회 연속 실패

### 점진적 확장 전략
1. 성남교육지원청 1개로 파일럿 (1주)
2. 주요 5개 게시판 추가 (2주)
3. 나머지 게시판 순차 추가 (3-4주)

---

이 계획으로 유연하고 확장 가능한 크롤링 시스템 구축 가능 🚀
