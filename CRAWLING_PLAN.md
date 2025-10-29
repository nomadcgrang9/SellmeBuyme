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

### 관리자 페이지 트리거 흐름 (2025-10-20 갱신)
- **즉시 실행** 버튼: Supabase Edge Function `admin-crawl-run`에 `mode=run`으로 요청 → GitHub Actions `run-crawler.yml`이 `CRAWL_MODE=run` 환경 변수로 크롤러 실행 → 신규 공고 저장 및 `crawl_logs` 상태 갱신.
- **테스트** 버튼: 동일한 Edge Function에 `mode=test`로 전달 → GitHub Actions가 `CRAWL_MODE=test`로 크롤러 실행 → 저장 없이 크롤링 로직과 AI 응답만 검증하도록 설계.
- 두 버튼 모두 `boardId`를 포함해 호출하며, Edge Function은 `crawl_boards`에서 게시판 정보를 읽고 `crawl_logs`에 기록한 뒤 GitHub Actions `workflow_dispatch` API를 호출해 수동 실행을 예약합니다.

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

---
---

# 📍 크롤링 게시판 지역 기반 관리 개선 계획

> **작성일**: 2025-01-29
> **목적**: 기존 크롤링 시스템에 지역 기반 검색/필터링 및 전국 확장 대비 구조 추가

---

## 🎯 개선 목표 (3가지 핵심 요구사항)

1. **지역 기반 검색/필터링**: 경기도, 남양주시 등 지역별로 게시판 검색 가능
2. **전국 확장 대비 DB 구조**: 서울, 충청, 강원 등 전국 17개 광역자치단체로 확장 가능한 구조
3. **개발자 노트 연동**: 제출 → 관리자 승인 → 크롤링 활성화 워크플로우 구축

---

## 🔍 현재 상황 분석

### 기존 제한사항

현재 `crawl_boards` 테이블:
```sql
CREATE TABLE crawl_boards (
  id UUID PRIMARY KEY,
  board_name TEXT,           -- "경기도교육청 > 경기교육청"
  base_url TEXT,
  last_crawled_at TIMESTAMP,
  crawl_batch_size INTEGER,
  error_count INTEGER
)
```

**문제점:**
- 지역 정보가 `board_name` 문자열에 묻혀있음 (구조화되지 않음)
- 지역별 필터링이 불가능 (LIKE 검색만 가능)
- 전국 확장 시 지역 계층 관리 불가 (시도 > 시군구)
- 통계 집계 및 그룹화 어려움

### 기존 데이터 (3개 게시판)

```
1. 경기도교육청 > 경기교육청
2. 경기도교육청 > 남양주교육지원청
3. 경기도교육청 > 의정부교육지원청
```

모두 경기도(KR-41) 소속, 하위 지역은 남양주시(4136025), 의정부시(4111025)

---

## 🏗️ 설계 결정사항

### 1. 지역 코드 시스템 (ISO 3166-2 기반)

한국 행정구역 표준 코드 사용:

| 광역자치단체 | ISO 코드 | 행정구역 코드 |
|------------|---------|-------------|
| 서울특별시 | KR-11 | 11 |
| 부산광역시 | KR-26 | 26 |
| 대구광역시 | KR-27 | 27 |
| 인천광역시 | KR-28 | 28 |
| 광주광역시 | KR-29 | 29 |
| 대전광역시 | KR-30 | 30 |
| 울산광역시 | KR-31 | 31 |
| 세종특별자치시 | KR-50 | 36 |
| 경기도 | KR-41 | 41 |
| 강원특별자치도 | KR-42 | 51 |
| 충청북도 | KR-43 | 43 |
| 충청남도 | KR-44 | 44 |
| 전북특별자치도 | KR-45 | 52 |
| 전라남도 | KR-46 | 46 |
| 경상북도 | KR-47 | 47 |
| 경상남도 | KR-48 | 48 |
| 제주특별자치도 | KR-49 | 50 |

**시군구 코드 예시:**
- 남양주시: 4136025 (경기도 41 + 남양주 36025)
- 의정부시: 4111025 (경기도 41 + 의정부 11025)

### 2. 데이터베이스 스키마

#### 2.1 `regions` 테이블 (신규 생성)

지역 계층 구조를 관리하는 참조 테이블:

```sql
CREATE TABLE regions (
  code TEXT PRIMARY KEY,              -- 'KR-41' 또는 '4136025'
  name TEXT NOT NULL,                 -- '경기도' 또는 '남양주시'
  level TEXT NOT NULL,                -- 'province' 또는 'city'
  parent_code TEXT REFERENCES regions(code),
  display_order INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_regions_parent ON regions(parent_code);
CREATE INDEX idx_regions_level ON regions(level);
```

**초기 데이터 (17개 광역자치단체):**
```sql
INSERT INTO regions (code, name, level, parent_code, display_order) VALUES
  ('KR-11', '서울특별시', 'province', NULL, 1),
  ('KR-26', '부산광역시', 'province', NULL, 2),
  ('KR-27', '대구광역시', 'province', NULL, 3),
  ('KR-28', '인천광역시', 'province', NULL, 4),
  ('KR-29', '광주광역시', 'province', NULL, 5),
  ('KR-30', '대전광역시', 'province', NULL, 6),
  ('KR-31', '울산광역시', 'province', NULL, 7),
  ('KR-50', '세종특별자치시', 'province', NULL, 8),
  ('KR-41', '경기도', 'province', NULL, 9),
  ('KR-42', '강원특별자치도', 'province', NULL, 10),
  ('KR-43', '충청북도', 'province', NULL, 11),
  ('KR-44', '충청남도', 'province', NULL, 12),
  ('KR-45', '전북특별자치도', 'province', NULL, 13),
  ('KR-46', '전라남도', 'province', NULL, 14),
  ('KR-47', '경상북도', 'province', NULL, 15),
  ('KR-48', '경상남도', 'province', NULL, 16),
  ('KR-49', '제주특별자치도', 'province', NULL, 17);

-- 경기도 시군구 예시
INSERT INTO regions (code, name, level, parent_code, display_order) VALUES
  ('4136025', '남양주시', 'city', 'KR-41', 1),
  ('4111025', '의정부시', 'city', 'KR-41', 2);
```

#### 2.2 `crawl_boards` 테이블 확장

```sql
ALTER TABLE crawl_boards
  ADD COLUMN region_code TEXT REFERENCES regions(code),
  ADD COLUMN subregion_code TEXT REFERENCES regions(code),
  ADD COLUMN region_display_name TEXT,  -- "경기도 > 남양주시" (UI용)
  ADD COLUMN school_level TEXT,         -- 'elementary', 'middle', 'high', 'mixed'
  ADD COLUMN is_active BOOLEAN DEFAULT false,
  ADD COLUMN approved_at TIMESTAMP,
  ADD COLUMN approved_by UUID REFERENCES auth.users(id);

-- 인덱스
CREATE INDEX idx_crawl_boards_region ON crawl_boards(region_code);
CREATE INDEX idx_crawl_boards_subregion ON crawl_boards(subregion_code);
CREATE INDEX idx_crawl_boards_active ON crawl_boards(is_active);
```

**마이그레이션 스크립트 (기존 3개 게시판):**
```sql
-- 1. 경기도교육청 > 경기교육청
UPDATE crawl_boards
SET region_code = 'KR-41',
    subregion_code = NULL,
    region_display_name = '경기도',
    school_level = 'mixed',
    is_active = true
WHERE board_name = '경기도교육청 > 경기교육청';

-- 2. 경기도교육청 > 남양주교육지원청
UPDATE crawl_boards
SET region_code = 'KR-41',
    subregion_code = '4136025',
    region_display_name = '경기도 > 남양주시',
    school_level = 'mixed',
    is_active = true
WHERE board_name LIKE '%남양주%';

-- 3. 경기도교육청 > 의정부교육지원청
UPDATE crawl_boards
SET region_code = 'KR-41',
    subregion_code = '4111025',
    region_display_name = '경기도 > 의정부시',
    school_level = 'mixed',
    is_active = true
WHERE board_name LIKE '%의정부%';
```

#### 2.3 `developer_submissions` 테이블 확장

개발자 노트의 게시판 제출과 연동:

```sql
ALTER TABLE developer_submissions
  ADD COLUMN crawl_board_id UUID REFERENCES crawl_boards(id),
  ADD COLUMN admin_review_status TEXT DEFAULT 'pending',  -- 'pending', 'approved', 'rejected'
  ADD COLUMN admin_review_comment TEXT,
  ADD COLUMN reviewed_by UUID REFERENCES auth.users(id),
  ADD COLUMN reviewed_at TIMESTAMP;

-- 인덱스
CREATE INDEX idx_submissions_review_status ON developer_submissions(admin_review_status);
CREATE INDEX idx_submissions_crawl_board ON developer_submissions(crawl_board_id);
```

### 3. TypeScript 타입 정의

#### `src/types/index.ts`

```typescript
export type RegionLevel = 'province' | 'city' | 'district';

export interface Region {
  code: string;              // 'KR-41' or '4136025'
  name: string;              // '경기도' or '남양주시'
  level: RegionLevel;
  parentCode?: string;
  displayOrder: number;
  createdAt: string;
}

export type SchoolLevel = 'elementary' | 'middle' | 'high' | 'mixed';

export interface CrawlBoard {
  id: string;
  boardName: string;
  baseUrl: string;
  lastCrawledAt?: string;
  crawlBatchSize: number;
  errorCount: number;

  // 신규 필드
  regionCode?: string;           // 'KR-41'
  subregionCode?: string;        // '4136025'
  regionDisplayName?: string;    // '경기도 > 남양주시'
  schoolLevel?: SchoolLevel;
  isActive: boolean;
  approvedAt?: string;
  approvedBy?: string;
}

export type ReviewStatus = 'pending' | 'approved' | 'rejected';

export interface DeveloperSubmission {
  id: string;
  userId: string;
  title: string;
  description: string;
  boardUrl: string;
  regionCode?: string;
  subregionCode?: string;
  schoolLevel?: SchoolLevel;

  // 승인 관련
  crawlBoardId?: string;
  adminReviewStatus: ReviewStatus;
  adminReviewComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;

  createdAt: string;
  updatedAt: string;
}
```

---

## 📋 4단계 구현 계획

### Phase 1: 지역 코드 시스템 및 DB 마이그레이션 (우선순위 1)

**목표:** 지역 기반 필터링을 위한 데이터 구조 구축

**작업 내역:**

1. **마이그레이션 파일 생성**
   - `supabase/migrations/20250129_create_regions_table.sql`
   - `supabase/migrations/20250129_extend_crawl_boards.sql`
   - `supabase/migrations/20250129_extend_developer_submissions.sql`

2. **TypeScript 타입 업데이트**
   - `src/types/index.ts`: Region, CrawlBoard, DeveloperSubmission 타입 확장
   - `src/lib/supabase/queries.ts`: DB 매핑 함수 업데이트
     - `mapCrawlBoardFromDbRow()`: region 필드 매핑
     - `mapCrawlBoardToDbRow()`: region 필드 변환

3. **지역 조회 함수 생성**
   - `src/lib/supabase/regions.ts` (신규 파일)
   ```typescript
   export async function fetchAllProvinces(): Promise<Region[]>
   export async function fetchCitiesByProvince(provinceCode: string): Promise<Region[]>
   export async function buildRegionDisplayName(regionCode?: string, subregionCode?: string): Promise<string>
   ```

4. **기존 데이터 마이그레이션**
   - 3개 게시판에 지역 코드 할당
   - `scripts/db/migrate-crawl-boards-regions.ts` 실행

**검증:**
```sql
-- 17개 광역자치단체 확인
SELECT COUNT(*) FROM regions WHERE level = 'province';  -- 17

-- 경기도 시군구 확인
SELECT * FROM regions WHERE parent_code = 'KR-41';

-- 기존 게시판 지역 코드 확인
SELECT board_name, region_code, subregion_code, region_display_name
FROM crawl_boards;
```

---

### Phase 2: 개발자 제출 폼 개선 (우선순위 2)

**목표:** 개발자가 지역 정보를 포함하여 게시판을 제출할 수 있도록 UI 개선

**작업 내역:**

1. **지역 선택 컴포넌트 생성**
   - [src/components/developer/RegionSelector.tsx](src/components/developer/RegionSelector.tsx)
   ```typescript
   interface RegionSelectorProps {
     onRegionChange: (regionCode?: string, subregionCode?: string) => void;
     initialRegionCode?: string;
     initialSubregionCode?: string;
   }
   ```
   - 2단계 선택: 시도 선택 → 시군구 선택 (optional)
   - 데이터: `regions` 테이블에서 fetch

2. **학교급 선택 UI 추가**
   - Radio buttons: 초등학교 / 중학교 / 고등학교 / 혼합

3. **제출 폼 업데이트**
   - [src/components/developer/SubmissionForm.tsx](src/components/developer/SubmissionForm.tsx)
   - 지역 선택 + 학교급 선택 추가
   - `developer_submissions` 테이블에 저장

4. **제출 내역 표시 개선**
   - [src/components/developer/SubmissionList.tsx](src/components/developer/SubmissionList.tsx)
   - 지역 정보 뱃지 표시
   - 승인 상태 표시 (pending/approved/rejected)

**UI 예시:**
```
┌─────────────────────────────────────────┐
│ 게시판 제출하기                          │
├─────────────────────────────────────────┤
│ 제목: [                               ] │
│ URL:  [                               ] │
│                                         │
│ 지역 선택:                              │
│   시도: [경기도 ▼]                      │
│   시군구: [남양주시 ▼] (선택사항)        │
│                                         │
│ 학교급:                                 │
│   ○ 초등학교  ○ 중학교                  │
│   ○ 고등학교  ● 혼합                    │
│                                         │
│ 설명: [                               ] │
│                                         │
│         [제출하기]                       │
└─────────────────────────────────────────┘
```

**검증:**
- 개발자 페이지에서 게시판 제출 → `developer_submissions` 테이블에 지역 정보 저장 확인
- 제출 내역에서 지역 뱃지 표시 확인

---

### Phase 3: 관리자 승인 UI 및 크롤러 연동 (우선순위 3)

**목표:** 관리자가 제출된 게시판을 검토/승인하고, 승인 시 크롤링 활성화

**작업 내역:**

1. **관리자 페이지 - 제출 내역 탭 추가**
   - [src/components/admin/SubmissionReviewList.tsx](src/components/admin/SubmissionReviewList.tsx)
   - 승인 대기 목록 표시 (admin_review_status = 'pending')
   - 지역별 필터링 UI
   - 상태별 필터링 (pending/approved/rejected)

2. **승인 모달 컴포넌트**
   - [src/components/admin/ApprovalModal.tsx](src/components/admin/ApprovalModal.tsx)
   ```typescript
   interface ApprovalModalProps {
     submission: DeveloperSubmission;
     onApprove: (comment?: string) => Promise<void>;
     onReject: (reason: string) => Promise<void>;
     onClose: () => void;
   }
   ```
   - 게시판 정보 확인 UI
   - 승인/거부 버튼
   - 코멘트 입력란

3. **승인 처리 로직**
   - [src/lib/supabase/admin-actions.ts](src/lib/supabase/admin-actions.ts)
   ```typescript
   export async function approveSubmission(
     submissionId: string,
     adminUserId: string,
     comment?: string
   ): Promise<CrawlBoard>
   ```
   - 승인 시 자동으로 `crawl_boards` 레코드 생성
   - `is_active = true` 설정
   - 지역 정보 복사
   - `developer_submissions` 상태 업데이트

4. **크롤링 게시판 목록 필터 UI**
   - [src/components/admin/CrawlBoardList.tsx](src/components/admin/CrawlBoardList.tsx)에 필터 추가
   ```typescript
   interface FilterState {
     regionCode?: string;
     subregionCode?: string;
     schoolLevel?: SchoolLevel;
     isActive?: boolean;
     searchKeyword?: string;
   }
   ```
   - 지역 드롭다운 (17개 광역자치단체)
   - 하위 지역 드롭다운 (선택된 시도의 시군구)
   - 학교급 필터
   - 활성화 상태 토글

5. **Supabase 쿼리 확장**
   - [src/lib/supabase/queries.ts](src/lib/supabase/queries.ts)
   ```typescript
   export async function fetchCrawlBoardsWithFilters(filters: {
     regionCode?: string;
     subregionCode?: string;
     schoolLevel?: SchoolLevel;
     isActive?: boolean;
     searchKeyword?: string;
   }): Promise<CrawlBoard[]>
   ```

**UI 예시 (관리자 - 승인 대기):**
```
┌─────────────────────────────────────────────────────────────────┐
│ 게시판 제출 승인 관리                                            │
├─────────────────────────────────────────────────────────────────┤
│ 필터: [전체 지역 ▼] [전체 학교급 ▼] [● 승인대기 ○ 전체]         │
├─────────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📌 의정부교육지원청 채용 게시판                              │ │
│ │ 🏷️ 경기도 > 의정부시  📚 혼합                                │ │
│ │ 제출자: user@example.com  │  2025-01-27 14:30               │ │
│ │ [상세보기] [승인] [거부]                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 📌 화성교육지원청 공고                                       │ │
│ │ 🏷️ 경기도 > 화성시  📚 초등학교                             │ │
│ │ 제출자: dev@example.com  │  2025-01-26 10:15                │ │
│ │ [상세보기] [승인] [거부]                                     │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**UI 예시 (관리자 - 크롤링 게시판 목록 필터):**
```
┌─────────────────────────────────────────────────────────────────┐
│ 크롤링 게시판 관리                                               │
├─────────────────────────────────────────────────────────────────┤
│ 지역: [경기도 ▼]  하위: [전체 ▼]  학교급: [전체 ▼]  [● 활성화만] │
│ 검색: [                                               ] [🔍]     │
├─────────────────────────────────────────────────────────────────┤
│ ✅ 경기도교육청 > 경기교육청                                     │
│    🏷️ 경기도  📚 혼합  ⏰ 마지막 크롤: 2025-01-29 08:00          │
│    [수정] [비활성화] [테스트 크롤링]                             │
│                                                                  │
│ ✅ 경기도교육청 > 남양주교육지원청                               │
│    🏷️ 경기도 > 남양주시  📚 혼합  ⏰ 2025-01-29 08:05            │
│    [수정] [비활성화] [테스트 크롤링]                             │
└─────────────────────────────────────────────────────────────────┘
```

**검증:**
- 제출된 게시판 승인 → `crawl_boards` 테이블에 새 레코드 생성 확인
- `is_active = true`, 지역 정보 복사 확인
- 지역 필터 작동 확인 (경기도 선택 시 3개 게시판만 표시)
- 하위 지역 필터 (남양주시 선택 시 1개만 표시)

---

### Phase 4: 크롤러 통합 및 검증 (우선순위 4)

**목표:** 크롤러가 `is_active = true`인 게시판만 크롤링하도록 수정

**작업 내역:**

1. **크롤러 쿼리 수정**
   - [crawler/lib/db-utils.js](crawler/lib/db-utils.js)
   ```javascript
   // BEFORE
   SELECT * FROM crawl_boards ORDER BY last_crawled_at ASC NULLS FIRST;

   // AFTER
   SELECT * FROM crawl_boards
   WHERE is_active = true
   ORDER BY last_crawled_at ASC NULLS FIRST;
   ```

2. **지역 기반 크롤링 우선순위**
   - 특정 지역 우선 크롤링 옵션 추가
   ```bash
   node index.js --region=KR-41  # 경기도만
   node index.js --subregion=4136025  # 남양주시만
   ```

3. **크롤링 로그 개선**
   - 로그에 지역 정보 추가
   ```
   [2025-01-29 08:00:00] 크롤링 시작: 경기도교육청 > 남양주교육지원청 (경기도 > 남양주시)
   [2025-01-29 08:05:23] 완료: 5개 공고 수집, 2개 신규 등록
   ```

4. **관리자 대시보드 통계**
   - [src/components/admin/CrawlStats.tsx](src/components/admin/CrawlStats.tsx)
   - 지역별 크롤링 통계
   ```typescript
   interface CrawlStats {
     totalBoards: number;
     activeBoards: number;
     boardsByRegion: { regionName: string; count: number }[];
     lastCrawlTime: string;
   }
   ```

5. **검증 스크립트**
   - [scripts/test/verify-crawl-integration.ts](scripts/test/verify-crawl-integration.ts)
   - 모든 활성 게시판에 유효한 지역 코드가 있는지 확인
   - `regions` 테이블과 조인하여 무결성 검증

**검증:**
```bash
# 1. 크롤러 실행 (활성화된 게시판만)
cd crawler
node index.js

# 2. 로그 확인
tail -f crawler.log | grep "경기도"

# 3. DB 검증
SELECT cb.board_name, r.name AS region_name, cb.is_active, cb.last_crawled_at
FROM crawl_boards cb
LEFT JOIN regions r ON cb.region_code = r.code
ORDER BY cb.last_crawled_at DESC;
```

---

## 🔄 워크플로우 다이어그램

### 개발자 → 관리자 → 크롤러 연동

```
┌──────────────┐
│ 개발자 노트   │
│ /note       │
└──────┬───────┘
       │
       │ 1. 게시판 제출
       │    (URL, 지역, 학교급)
       ↓
┌──────────────────────┐
│ developer_submissions│
│ status: 'pending'    │
└──────┬───────────────┘
       │
       │ 2. 관리자 검토
       ↓
┌──────────────┐
│ 관리자 페이지 │
│ /admin-portal│
└──────┬───────┘
       │
       ├─→ [승인] ─→ ┌─────────────────────┐
       │             │ crawl_boards 생성    │
       │             │ is_active = true    │
       │             │ 지역 정보 복사       │
       │             └──────┬──────────────┘
       │                    │
       │                    │ 3. 크롤러 감지
       │                    ↓
       │             ┌─────────────┐
       │             │ crawler/    │
       │             │ index.js    │
       │             └──────┬──────┘
       │                    │
       │                    │ 4. 공고 수집
       │                    ↓
       │             ┌─────────────┐
       │             │ job_postings│
       │             └─────────────┘
       │
       └─→ [거부] ─→ developer_submissions.status = 'rejected'
```

---

## ✅ 체크리스트

### Phase 1 완료 조건
- [ ] `regions` 테이블 생성 및 17개 광역자치단체 데이터 삽입
- [ ] `crawl_boards` 테이블에 region 관련 컬럼 추가
- [ ] `developer_submissions` 테이블에 review 관련 컬럼 추가
- [ ] TypeScript 타입 정의 업데이트 (`Region`, `CrawlBoard`, `DeveloperSubmission`)
- [ ] [src/lib/supabase/regions.ts](src/lib/supabase/regions.ts) 생성 및 지역 조회 함수 구현
- [ ] DB 매핑 함수 업데이트 (`mapCrawlBoardFromDbRow`, `mapCrawlBoardToDbRow`)
- [ ] 기존 3개 게시판 지역 코드 마이그레이션
- [ ] SQL 검증 쿼리로 데이터 무결성 확인

### Phase 2 완료 조건
- [ ] `RegionSelector.tsx` 컴포넌트 생성 (시도/시군구 2단계 선택)
- [ ] `SubmissionForm.tsx`에 지역 선택 + 학교급 선택 UI 추가
- [ ] `SubmissionList.tsx`에 지역 뱃지 + 승인 상태 표시
- [ ] 제출 시 `developer_submissions` 테이블에 지역 정보 저장
- [ ] `/note` 페이지에서 제출 → DB 저장 → 목록 표시 플로우 테스트

### Phase 3 완료 조건
- [ ] `SubmissionReviewList.tsx` 생성 (승인 대기 목록)
- [ ] `ApprovalModal.tsx` 생성 (승인/거부 UI)
- [ ] `approveSubmission()` 함수 구현 (승인 시 `crawl_boards` 자동 생성)
- [ ] `CrawlBoardList.tsx`에 지역/학교급/활성화 필터 UI 추가
- [ ] `fetchCrawlBoardsWithFilters()` 함수 구현
- [ ] 관리자 페이지에서 승인 → `crawl_boards` 생성 플로우 테스트
- [ ] 지역 필터 작동 확인 (경기도만 선택 시 3개 표시)

### Phase 4 완료 조건
- [ ] 크롤러 쿼리에 `is_active = true` 조건 추가
- [ ] 지역별 크롤링 우선순위 옵션 추가 (`--region`, `--subregion`)
- [ ] 크롤링 로그에 지역 정보 출력
- [ ] `CrawlStats.tsx` 컴포넌트 생성 (지역별 통계)
- [ ] [scripts/test/verify-crawl-integration.ts](scripts/test/verify-crawl-integration.ts) 검증 스크립트 작성
- [ ] 크롤러 실행 → 활성화된 게시판만 크롤링 확인
- [ ] 전체 워크플로우 E2E 테스트 (제출 → 승인 → 크롤링 → 공고 수집)

---

## 🔧 기술적 고려사항

### 1. 성능 최적화
- `regions` 테이블은 참조 테이블로 크기가 작으므로 캐싱 권장
- `crawl_boards` 필터링 쿼리에 인덱스 필수 (`region_code`, `subregion_code`, `is_active`)
- 관리자 대시보드는 통계 쿼리 캐싱 고려 (Redis 또는 Supabase Realtime)

### 2. 데이터 무결성
- `regions.code`를 외래키로 참조하여 잘못된 지역 코드 방지
- `approved_at`와 `is_active` 동시 설정으로 승인 추적
- `crawl_boards.region_display_name`은 UI 표시용 (정규화 X)

### 3. 확장성
- 새로운 시군구 추가 시 `regions` 테이블에만 INSERT
- 전국 확장 시 17개 광역자치단체 → 229개 시군구로 확대 가능
- 지역 계층은 `parent_code`로 무한 확장 가능 (읍면동 레벨도 추가 가능)

### 4. UX 개선 아이디어
- 지역 선택 시 실시간 게시판 개수 표시 ("경기도 (3개 게시판)")
- 크롤링 실패 시 관리자에게 알림 (이메일 또는 인앱 알림)
- 개발자 제출 거부 시 사유 표시 (투명성)

### 5. 보안
- 관리자 승인 기능은 `roles = ['admin']` 체크 필수
- 개발자 제출은 인증된 사용자만 가능 (RLS 정책)
- 크롤러는 `service_role` 키로만 `crawl_boards` 조회

---

## 📅 예상 개발 기간

- **Phase 1**: 1일 (마이그레이션 + 타입 정의)
- **Phase 2**: 1일 (개발자 폼 UI)
- **Phase 3**: 2일 (관리자 승인 UI + 로직)
- **Phase 4**: 1일 (크롤러 통합 + 검증)

**총 예상 기간: 5일**

---

## 📚 관련 문서

- `BACKEND_STRUCTURE.md`: Supabase 테이블 스키마 전체
- `FRONTEND_STRUCTURE.md`: React 컴포넌트 구조
- `CRAWLING_PLAN.md`: 본 문서 (크롤링 개선 계획)
- `DEVELOPER_PAGE_PLAN.md`: 개발자 노트 페이지 설계
- `supabase/migrations/`: 실제 마이그레이션 SQL 파일들

---

## 📝 변경 이력

- **2025-01-29**: 지역 기반 관리 개선 계획 추가
  - 사용자 요구사항: 지역 필터링, 전국 확장, 개발자 제출 워크플로우
  - 대화 컨텍스트 기반으로 작성됨 (이전 PC에서 작업한 크롤링-플랜-1 브랜치 내용 반영 안 됨)
  - ISO 3166-2 기반 17개 광역자치단체 코드 시스템 설계
  - 4단계 구현 계획 수립

- **2025-01-29 (오후)**: Phase 1-3 구현 완료
  - Phase 1, 2, 3 핵심 기능 구현 완료
  - Phase 4 범위 조정 및 현실성 검토

---

## 🎯 구현 완료 현황 (2025-01-29 기준)

### ✅ Phase 1: 데이터베이스 지역 시스템 (완료)

**구현 파일**:
- `supabase/migrations/20250129_01_create_regions_table.sql` - 17개 광역자치단체 + 29개 경기도 시/군
- `supabase/migrations/20250129_02_extend_crawl_boards_region.sql` - crawl_boards 테이블 확장
- `supabase/migrations/20250129_03_extend_dev_board_submissions_region.sql` - dev_board_submissions 테이블 확장
- `src/types/index.ts` - Region, SchoolLevel 타입 추가
- `src/types/developer.ts` - DevBoardSubmission 타입 확장
- `src/lib/supabase/regions.ts` - 지역 조회 함수 (fetchAllProvinces, fetchCitiesByProvince, buildRegionDisplayName)
- `src/lib/supabase/queries.ts` - mapCrawlBoardFromDbRow 업데이트
- `scripts/migrate-existing-boards.ts` - 기존 3개 게시판 지역 코드 마이그레이션 스크립트

**완료 항목**:
- ✅ regions 테이블 생성 (17개 광역자치단체, 29개 경기도 시/군)
- ✅ crawl_boards 테이블에 지역 관련 컬럼 추가 (region_code, subregion_code, school_level, etc)
- ✅ dev_board_submissions 테이블에 지역 관련 컬럼 추가
- ✅ TypeScript 타입 정의 완료
- ✅ 지역 조회 및 표시명 생성 함수 구현
- ✅ DB 매핑 함수 업데이트
- ✅ 기존 게시판(경기, 성남, 의정부) 마이그레이션 스크립트

---

### ✅ Phase 2: 개발자 제출 폼 (완료)

**구현 파일**:
- `src/components/developer/RegionSelector.tsx` - 2단계 지역 선택 컴포넌트
- `src/components/developer/SchoolLevelSelector.tsx` - 학교급 선택 컴포넌트
- `src/components/developer/BoardSubmissionForm.tsx` - 제출 폼 업데이트
- `src/types/developer.ts` - BoardSubmissionFormData 타입 확장
- `src/lib/supabase/developer.ts` - createBoardSubmission 함수 업데이트

**완료 항목**:
- ✅ 광역자치단체 선택 드롭다운 (17개)
- ✅ 시/군/구 선택 드롭다운 (동적 로딩)
- ✅ 학교급 선택 (초등/중등/고등/혼합)
- ✅ 유효성 검사 (광역자치단체, 학교급 필수)
- ✅ 제출 API 업데이트 (지역 정보 포함)

**사용자 흐름**:
```
개발자 노트 페이지 (/note)
  → 게시판 제출 버튼
  → 게시판 정보 입력 (이름, URL, 설명)
  → 지역 선택 (광역자치단체 → 시/군/구)
  → 학교급 선택 (초등/중등/고등/혼합)
  → 제출
  → dev_board_submissions 테이블에 저장 (status: pending)
```

---

### ✅ Phase 3: 관리자 승인 시스템 (완료)

**구현 파일**:
- `src/components/admin/BoardSubmissionList.tsx` - 제출 목록 컴포넌트 (지역/학교급 표시)
- `src/components/admin/BoardApprovalModal.tsx` - 승인/거부 모달
- `src/lib/supabase/developer.ts` - 승인/거부 API 함수
  - `approveBoardSubmission()` - 제출 승인
  - `rejectBoardSubmission()` - 제출 거부
  - `approveBoardSubmissionAndCreateCrawlBoard()` - 승인 + 크롤 게시판 자동 생성

**완료 항목**:
- ✅ 제출 목록 화면 (지역, 학교급 정보 표시)
- ✅ 승인/거부 모달 UI
- ✅ 승인 API (status: approved, 타임스탬프 기록)
- ✅ 거부 API (status: rejected, 거부 사유 필수)
- ✅ 승인 시 자동 crawl_boards 생성 로직
- ✅ crawl_board에 지역 정보 복사
- ✅ dev_board_submissions와 crawl_boards 연결 (crawl_board_id)

**관리자 흐름**:
```
관리자 페이지
  → 게시판 제출 관리 탭
  → 대기 중인 제출 목록 확인
  → 제출 상세 보기 (지역: 경기도 > 남양주시, 학교급: 중등)
  → [승인] 버튼 클릭
  → 승인 메모 입력 (선택)
  → 확인
  → 자동으로 crawl_boards 테이블에 새 레코드 생성
  → 지역 정보 복사 (region_code, subregion_code, school_level)
  → is_active = false (크롤러 소스 작성 후 수동 활성화 필요)
```

---

### ⏳ Phase 4: 크롤러 통합 및 검증 (조정 필요)

**현실성 검토 결과**:

#### ❌ 불가능한 것들:
1. **게시판 URL만으로 자동 크롤링** - 각 게시판마다 HTML 구조가 다름
2. **오류 자동 수정** - AI로도 70-80% 정확도, 비용 문제
3. **완전 자동화** - 여전히 개발자가 `crawler/sources/*.js` 파일 작성 필요

#### ✅ 실제로 구현 가능한 것들:

**1. 크롤러 쿼리 수정** (우선순위 1)
- 파일: `crawler/lib/db-utils.js`
- 변경 내용:
  ```javascript
  // BEFORE
  SELECT * FROM crawl_boards ORDER BY last_crawled_at;

  // AFTER
  SELECT * FROM crawl_boards
  WHERE is_active = true
  ORDER BY last_crawled_at;
  ```
- 기존 3개 게시판(경기, 성남, 의정부)은 마이그레이션 스크립트로 자동 활성화

**2. 관리자 페이지 지역 검색** (우선순위 2)
- 파일: `src/components/admin/CrawlBoardList.tsx` (수정 필요)
- 추가 기능:
  - 17개 광역자치단체 드롭다운 필터
  - 시/군 검색 입력창
  - 각 게시판 카드에 "📍 경기도 > 남양주시" 표시
  - 학교급 필터는 제외 (필요 없음)

**3. 지역별 통계 대시보드** (우선순위 3)
- 파일: `src/components/admin/CrawlStats.tsx` (신규 생성)
- 표시 내용:
  - 지역별 게시판 개수
  - 지역별 크롤링 성공/실패 통계
  - 간단한 차트

**4. 검증 스크립트** (우선순위 4)
- 파일: `scripts/test/verify-crawl-integration.ts`
- 테스트 흐름:
  1. 제출 생성
  2. 승인 처리
  3. crawl_boards 생성 확인
  4. 지역 정보 복사 확인

---

## 🚨 중요: 크롤링 자동화의 현실

### 현재 워크플로우 (Phase 3 완료 기준)

```
1. 개발자: 게시판 제출
   - URL: https://...
   - 지역: 경기도 > OO시
   - 학교급: 중등

2. 관리자: 승인 ✅
   - crawl_boards에 추가 (is_active = false)
   - 지역 정보 복사

3. 🔴 크롤러 개발자 작업 필요 (수동):
   - crawler/sources/oo.js 파일 작성
   - CSS 선택자, 페이지네이션 로직 구현
   - 테스트 (node test-oo.js)
   - 배포

4. 관리자: is_active = true로 활성화

5. 크롤러 자동 실행 (매일 7시)
   - is_active = true인 게시판만 크롤링
```

### 왜 완전 자동화가 불가능한가?

**기술적 한계**:
1. 각 게시판의 HTML 구조가 다름 (CSS 선택자 다름)
2. 페이지네이션 방식이 다름 (?page= vs ?p= vs offset)
3. 첨부파일 위치가 다름 (div.attach vs a.file)
4. 날짜 형식이 다름 (2025-01-29 vs 2025.01.29 vs 25.1.29)

**AI 사용 시 문제**:
1. Gemini Vision API로 구조 분석 가능하지만 비용 폭증
2. 정확도 70-80% (100% 보장 불가)
3. 매 게시판마다 토큰 소모

**현실적 접근**:
- 승인은 "이 게시판을 추가해도 되는가"에 대한 승인
- 실제 크롤링은 개발자가 소스 파일 작성 후 가능
- Phase 4는 관리 편의성 개선 (검색, 필터, 통계)

---

## 📋 Phase 4 수정된 범위

### 구현할 것:
1. ✅ 크롤러 쿼리에 `is_active = true` 조건 추가
2. ✅ 관리자 페이지에서 지역별 검색/필터
3. ✅ 지역별 통계 대시보드
4. ✅ 검증 스크립트

### 구현 안 할 것:
1. ❌ URL만으로 자동 크롤링 (불가능)
2. ❌ 오류 자동 수정 (불가능)
3. ❌ AI 기반 완전 자동화 (비용/정확도 문제)

---

## 📦 다음 PC에서 이어서 할 작업

### 1단계: Phase 4-1 (크롤러 쿼리 수정)
```bash
# 파일: crawler/lib/db-utils.js
# WHERE is_active = true 조건 추가
```

### 2단계: Phase 4-2 (관리자 페이지 개선)
```bash
# 파일: src/components/admin/CrawlBoardList.tsx
# 지역 필터 추가
# 지역 정보 표시
```

### 3단계: Phase 4-3 (통계 대시보드)
```bash
# 파일: src/components/admin/CrawlStats.tsx (신규)
# 지역별 통계
```

### 4단계: 마이그레이션 실행
```bash
# 기존 3개 게시판에 지역 코드 할당
npx tsx scripts/migrate-existing-boards.ts
```

### 5단계: 테스트 및 검증
```bash
# 전체 워크플로우 테스트
npx tsx scripts/test/verify-crawl-integration.ts
```

---

## 🔑 핵심 파일 요약

### Phase 1-3 구현 파일:
- `supabase/migrations/20250129_*.sql` (3개) - DB 마이그레이션
- `src/lib/supabase/regions.ts` - 지역 조회 함수
- `src/components/developer/RegionSelector.tsx` - 지역 선택 UI
- `src/components/developer/SchoolLevelSelector.tsx` - 학교급 선택 UI
- `src/components/admin/BoardSubmissionList.tsx` - 제출 목록
- `src/components/admin/BoardApprovalModal.tsx` - 승인/거부 모달
- `src/lib/supabase/developer.ts` - 승인/거부 API

### Phase 4 작업 예정 파일:
- `crawler/lib/db-utils.js` - 크롤러 쿼리 수정
- `src/components/admin/CrawlBoardList.tsx` - 지역 필터 추가
- `src/components/admin/CrawlStats.tsx` - 통계 대시보드 (신규)
- `scripts/test/verify-crawl-integration.ts` - 검증 스크립트 (신규)

---

**마지막 업데이트**: 2025-01-29 오후
**작업자**: Claude (AI Assistant)
**다음 작업**: Phase 4 구현 (다른 PC에서 이어서 진행)

---
---

# 📍 관리자 페이지 UI 개선 완료 (2025-10-29)

> **작업일**: 2025-10-29
> **목적**: 개발자 제출 승인 워크플로우 UI 구조 개선 및 버그 수정

---

## 🎯 구현 내용

### ✅ AdminPage 구조 개선

**문제점**:
- "개발자 제출 승인"이 독립적인 사이드바 메뉴 항목으로 구현됨
- "크롤링 게시판 목록"도 독립 메뉴로 분리되어 있음
- 관련 기능이 흩어져 있어 사용자 경험 저하

**해결 방법**:
```typescript
// BEFORE (❌ 잘못된 구조)
ADMIN_TABS = [
  { key: 'overview', label: '대시보드' },
  { key: 'submissions', label: '개발자 제출 승인' },  // 독립 메뉴
  { key: 'crawl', label: '크롤링 게시판 목록' },      // 독립 메뉴
  ...
]

// AFTER (✅ 올바른 구조)
ADMIN_TABS = [
  { key: 'overview', label: '대시보드' },
  { key: 'crawl', label: '크롤링 게시판 관리', badge: 'NEW' },  // 통합 메뉴
  ...
]

// 'crawl' 탭 안에 2개의 CollapsibleSection (쪽 버튼)
<CollapsibleSection title="승인대기 크롤링 게시판" defaultOpen={true}>
  <BoardSubmissionList />
</CollapsibleSection>

<CollapsibleSection title="승인된 크롤링 게시판" defaultOpen={false}>
  <CrawlBoardList />
</CollapsibleSection>
```

**구현 파일**:
- `src/pages/AdminPage.tsx` - 사이드바 구조 변경 및 CollapsibleSection 적용
- `src/components/developer/CollapsibleSection.tsx` - 재사용 (이미 존재)

---

### ✅ BoardApprovalModal 버그 수정

**문제점**:
- `approveBoardSubmissionAndCreateCrawlBoard()` 함수 호출 시 잘못된 인자 전달
- 함수 시그니처: `(submission: DevBoardSubmission, reviewComment?: string, adminUserId: string)`
- 실제 호출: `(submission.id)` - submission ID만 전달
- 결과: `invalid input syntax for type uuid: "undefined"` 오류

**해결 방법**:
```typescript
// BEFORE (❌ 잘못된 호출)
await approveBoardSubmissionAndCreateCrawlBoard(submission.id);

// AFTER (✅ 올바른 호출)
const { data: { user } } = await supabase.auth.getUser();
await approveBoardSubmissionAndCreateCrawlBoard(
  submission,      // 전체 객체 전달
  undefined,       // reviewComment (선택)
  user.id         // adminUserId
);
```

**구현 파일**:
- `src/components/admin/BoardApprovalModal.tsx` - 함수 호출 수정 및 supabase import 추가

---

### ✅ 디버깅 로그 추가

승인 버튼 클릭부터 API 호출까지 전체 흐름을 추적하기 위한 console.log 추가:

**로그 체인**:
```
[BoardSubmissionList] Approval clicked for submission: {...}
[BoardSubmissionList] Submission ID: a8ef19c2-...
    ↓
[AdminPage] Approving submission ID: a8ef19c2-...
    ↓
[BoardApprovalModal] Received submissionId: a8ef19c2-...
[BoardApprovalModal] Loaded submissions: 1
[BoardApprovalModal] Found submission: {...}
    ↓
[BoardApprovalModal] Calling approveBoardSubmissionAndCreateCrawlBoard with: {...}
```

**구현 파일**:
- `src/components/admin/BoardSubmissionList.tsx` - 승인 버튼 클릭 로그
- `src/pages/AdminPage.tsx` - onApprove 핸들러 로그
- `src/components/admin/BoardApprovalModal.tsx` - submission 로드 및 API 호출 로그

---

## 🔍 기술 세부사항

### 1. CollapsibleSection 컴포넌트 재사용

**기존 컴포넌트 활용**:
- `src/components/developer/CollapsibleSection.tsx`
- Framer Motion 애니메이션 적용
- ChevronDown/ChevronRight 아이콘으로 상태 표시
- count prop으로 항목 개수 표시 가능

**props 구조**:
```typescript
interface CollapsibleSectionProps {
  title: string;           // "승인대기 크롤링 게시판"
  count?: number;          // 항목 개수 (선택)
  defaultOpen?: boolean;   // 초기 열림 상태
  children: ReactNode;     // 내부 컨텐츠
}
```

### 2. 개발자 제출 → 승인 워크플로우

**정상 흐름**:
```
1. 개발자 노트 (/note)에서 게시판 제출
   ↓ dev_board_submissions (status: 'pending')

2. 관리자 페이지 > 크롤링 게시판 관리 > 승인대기 크롤링 게시판
   ↓ BoardSubmissionList에서 목록 확인

3. [승인] 버튼 클릭
   ↓ BoardApprovalModal 표시

4. [승인하기] 버튼 클릭
   ↓ approveBoardSubmissionAndCreateCrawlBoard() 호출
   ├─ dev_board_submissions.status = 'approved'
   ├─ dev_board_submissions.approved_at, approved_by 기록
   ├─ crawl_boards 테이블에 새 레코드 생성
   ├─ 지역 정보 복사 (region_code, subregion_code, school_level)
   └─ dev_board_submissions.crawl_board_id = 생성된 crawl_boards.id

5. 승인된 크롤링 게시판 섹션에서 확인 가능
```

### 3. pg_trgm 계층적 검색 (이전 구현)

**이미 구현된 기능** (Phase 4-2 일부):
- `supabase/migrations/20250202_add_crawl_boards_search_indexes.sql`
- pg_trgm 확장 및 GIN 인덱스 생성
- `search_crawl_boards_advanced()` RPC 함수
- 계층적 지역 검색: "경기도" 검색 → "경기도 > 남양주시", "경기도 > 의정부시" 모두 반환
- ILIKE fallback으로 호환성 보장

**사용 중인 컴포넌트**:
- `src/components/admin/CrawlBoardList.tsx` - debounced search (500ms)
- `src/lib/supabase/queries.ts` - fetchCrawlBoards() with RPC fallback

---

## 📋 완료 체크리스트

### UI 구조 개선
- ✅ "크롤링 게시판 목록" → "크롤링 게시판 관리"로 이름 변경
- ✅ "개발자 제출 승인" 독립 메뉴 제거
- ✅ CollapsibleSection 2개 추가 (승인대기 / 승인됨)
- ✅ CollapsibleSection import 및 적용
- ✅ NEW 뱃지 유지

### 버그 수정
- ✅ BoardApprovalModal 함수 호출 수정
- ✅ supabase client import 추가
- ✅ adminUserId 자동 조회 (supabase.auth.getUser())
- ✅ 전체 submission 객체 전달

### 디버깅 개선
- ✅ BoardSubmissionList 클릭 이벤트 로그
- ✅ AdminPage onApprove 핸들러 로그
- ✅ BoardApprovalModal submission 로드 로그
- ✅ API 호출 파라미터 로그

---

## 🚧 남은 작업 (Phase 4 계속)

### Phase 4-1: 크롤러 쿼리 수정 (미완료)
- ⏳ `crawler/lib/supabase.js` 또는 `crawler/lib/db-utils.js`에 `is_active = true` 조건 추가
- ⏳ 기존 3개 게시판(경기, 성남, 의정부) `is_active = true`로 마이그레이션
- ⏳ 크롤러 실행하여 활성 게시판만 크롤링하는지 검증

### Phase 4-2: 관리자 페이지 지역 필터 추가 (부분 완료)
- ✅ pg_trgm 계층적 검색 구현 (완료)
- ⏳ 17개 광역자치단체 드롭다운 필터
- ⏳ 시/군/구 검색 입력창
- ⏳ 각 게시판 카드에 "📍 경기도 > 남양주시" 표시

### Phase 4-3: 통계 대시보드 (미완료)
- ⏳ `src/components/admin/CrawlStats.tsx` 컴포넌트 생성
- ⏳ 지역별 게시판 개수 표시
- ⏳ 지역별 크롤링 성공/실패 통계
- ⏳ 간단한 차트 (Chart.js 또는 Recharts)

### Phase 4-4: 검증 스크립트 (미완료)
- ⏳ `scripts/test/verify-crawl-integration.ts` 작성
- ⏳ 제출 → 승인 → crawl_boards 생성 E2E 테스트
- ⏳ 지역 정보 복사 검증

---

## 📝 변경 파일 목록

### 수정된 파일:
1. `src/pages/AdminPage.tsx`
   - ADMIN_TABS 배열 수정 (submissions 제거, crawl 이름 변경)
   - CollapsibleSection import 추가
   - renderTabContent() 'crawl' case 재구성
   - onApprove 핸들러에 console.log 추가

2. `src/components/admin/BoardApprovalModal.tsx`
   - supabase client import 추가
   - handleApprove() 함수 전체 재작성
   - supabase.auth.getUser()로 adminUserId 조회
   - approveBoardSubmissionAndCreateCrawlBoard() 인자 수정
   - console.log 추가

3. `src/components/admin/BoardSubmissionList.tsx`
   - 승인 버튼 onClick 핸들러에 console.log 추가

### 재사용된 파일:
- `src/components/developer/CollapsibleSection.tsx` (기존 컴포넌트 활용)

---

## 🔧 테스트 방법

### 1. UI 구조 확인
```bash
# http://localhost:5174/admin-page 접속
# 삼선바 메뉴에서 "크롤링 게시판 관리" 클릭
# 2개의 쪽 버튼 확인:
#   - 승인대기 크롤링 게시판 (기본 열림)
#   - 승인된 크롤링 게시판 (기본 닫힘)
```

### 2. 승인 기능 테스트
```bash
# F12 (개발자 도구) → Console 탭 열기
# "승인대기 크롤링 게시판" 섹션에서 [승인] 버튼 클릭
# 콘솔에서 다음 로그 확인:
#   [BoardSubmissionList] Approval clicked...
#   [AdminPage] Approving submission ID...
#   [BoardApprovalModal] Received submissionId...
#   [BoardApprovalModal] Found submission...
#   [BoardApprovalModal] Calling approve...

# 승인 모달에서 [승인하기] 버튼 클릭
# 성공 메시지 확인
# "승인된 크롤링 게시판" 섹션에서 새 게시판 확인
```

### 3. DB 검증
```sql
-- Supabase SQL Editor에서 실행

-- 1. 승인된 제출 확인
SELECT id, board_name, status, approved_at, approved_by
FROM dev_board_submissions
WHERE status = 'approved'
ORDER BY approved_at DESC;

-- 2. 생성된 크롤 게시판 확인
SELECT cb.id, cb.name, cb.region_display_name, cb.school_level, cb.is_active, dbs.id AS submission_id
FROM crawl_boards cb
LEFT JOIN dev_board_submissions dbs ON dbs.crawl_board_id = cb.id
WHERE dbs.status = 'approved';

-- 3. 지역 정보 복사 확인
SELECT
  dbs.board_name AS submission_name,
  dbs.region_code AS submission_region,
  dbs.subregion_code AS submission_subregion,
  cb.region_code AS board_region,
  cb.subregion_code AS board_subregion,
  cb.region_display_name
FROM dev_board_submissions dbs
JOIN crawl_boards cb ON dbs.crawl_board_id = cb.id
WHERE dbs.status = 'approved';
```

---

## 🐛 알려진 이슈 및 해결

### Issue #1: UUID undefined 오류
**증상**: `invalid input syntax for type uuid: "undefined"`
**원인**: `approveBoardSubmissionAndCreateCrawlBoard(submission.id)` 잘못된 인자 전달
**해결**: 전체 submission 객체 및 adminUserId 전달

### Issue #2: 독립 메뉴 구조
**증상**: "개발자 제출 승인"이 사이드바에 독립 메뉴로 표시
**원인**: ADMIN_TABS 배열에 별도 항목으로 추가
**해결**: CollapsibleSection으로 "크롤링 게시판 관리" 탭 내부에 통합

---

## 📊 현재 상태 요약

### ✅ 완료된 Phase:
- **Phase 1**: 지역 기반 DB 시스템 (regions 테이블, crawl_boards 확장)
- **Phase 2**: 개발자 제출 폼 (지역 선택, 학교급 선택)
- **Phase 3**: 관리자 승인 시스템 (승인/거부, crawl_boards 자동 생성)
- **Phase 3.5**: 관리자 페이지 UI 개선 (CollapsibleSection, 버그 수정) ← **2025-10-29 완료**

### ⏳ 남은 Phase:
- **Phase 4-1**: 크롤러 is_active 필터링
- **Phase 4-2**: 관리자 페이지 지역 필터 UI (부분 완료)
- **Phase 4-3**: 통계 대시보드
- **Phase 4-4**: 검증 스크립트

---

**최종 업데이트**: 2025-10-29 오후 8시
**작업자**: Claude (AI Assistant)
**다음 작업**: Phase 4-1 (크롤러 is_active 필터 구현)

---
---

# 🐛 버그 수정 및 완전 통합 완료 (2025-10-29 오후 9시)

> **작업일**: 2025-10-29 오후 8-9시
> **목적**: RLS 정책 오류 및 데이터 매핑 버그 수정, 전체 승인 워크플로우 완성

---

## 🔥 발견된 버그들

### Bug #1: RLS 정책 - WITH CHECK 제한 ❌
**증상**: `invalid input syntax for type uuid: "undefined"`
**원인**:
- 기존 RLS 정책: `WITH CHECK (status = 'pending')`
- 승인 시도: `UPDATE ... SET status = 'approved'`
- 결과: WITH CHECK이 새 값('approved')을 거부

**해결**:
- 파일: `supabase/migrations/20250210_fix_dev_board_submissions_rls.sql` 생성
- 정책 분리:
  1. 일반 사용자: 자신의 pending 제출만 수정
  2. 관리자: 모든 제출 승인/거부 가능

### Bug #2: user_profiles 테이블 PK 오류 ❌
**증상**: `column user_profiles.id does not exist`
**원인**: RLS 정책에서 `user_profiles.id` 참조했지만 실제 PK는 `user_id`
**해결**: `WHERE user_profiles.user_id = auth.uid()` 수정

### Bug #3: crawl_status enum 값 오류 ❌
**증상**: `invalid input value for enum crawl_status: "idle"`
**원인**:
- 코드: `status: 'idle'`
- DB enum: `('active', 'broken', 'blocked')`
**해결**:
- `src/lib/supabase/developer.ts` 수정
- `status: 'active'`, `isActive: false`로 변경

### Bug #4: 지역 정보 매핑 누락 ❌ (Critical)
**증상**:
- 승인 성공 메시지 표시
- DB에 crawl_board 생성 안 됨
- "승인된 크롤링 게시판" 목록에 안 나타남

**원인**:
- `mapCrawlBoardToDbRow()` 함수에서 지역 필드 4개 누락:
  - `regionCode` → `region_code`
  - `subregionCode` → `subregion_code`
  - `regionDisplayName` → `region_display_name`
  - `schoolLevel` → `school_level`

**해결**:
- `src/lib/supabase/queries.ts` Line 1263-1267 추가
- 모든 지역 필드 매핑 구현

---

## ✅ 최종 수정 파일 목록

### 1. Supabase 마이그레이션
- **`supabase/migrations/20250210_fix_dev_board_submissions_rls.sql`** (신규)
  - 기존 제한적인 UPDATE 정책 제거
  - 일반 사용자용 정책 추가
  - 관리자용 정책 추가 (user_profiles.roles 확인)

### 2. 백엔드 로직
- **`src/lib/supabase/developer.ts`** (수정)
  - Line 496-497: `isActive: false`, `status: 'active'` 변경
  - Line 499-503: 지역 정보 4개 필드 추가

### 3. 타입 정의
- **`src/types/index.ts`** (수정)
  - `CreateCrawlBoardInput` 인터페이스에 지역 필드 4개 추가

### 4. 쿼리 함수
- **`src/lib/supabase/queries.ts`** (수정)
  - Line 1263-1267: `mapCrawlBoardToDbRow()` 함수에 지역 필드 매핑 추가

### 5. 프론트엔드 컴포넌트 (이전 작업)
- **`src/pages/AdminPage.tsx`** (수정)
  - CollapsibleSection으로 UI 구조 변경
  - 디버깅 로그 추가
- **`src/components/admin/BoardApprovalModal.tsx`** (수정)
  - 함수 호출 인자 수정
  - supabase client import
  - 디버깅 로그 추가
- **`src/components/admin/BoardSubmissionList.tsx`** (수정)
  - 디버깅 로그 추가

---

## 🧪 최종 테스트 결과

### 테스트 케이스: 남양주교육지원청 구인구직 게시판

**1단계: 초기 상태**
```sql
SELECT id, board_name, status, crawl_board_id
FROM dev_board_submissions
WHERE board_name LIKE '%남양주%';
```
결과: `status = 'pending'`, `crawl_board_id = NULL`

**2단계: 관리자 승인**
- 브라우저: 관리자 페이지 > 크롤링 게시판 관리 > 승인대기 크롤링 게시판
- 남양주 게시판 [승인] 버튼 클릭
- [승인하기] 클릭

**3단계: 콘솔 로그 확인**
```
[BoardSubmissionList] Approval clicked for submission: {...}
[BoardSubmissionList] Submission ID: a8ef19c2-a2ac-4e05-8b09-fbf0a9ad2e7f
[AdminPage] Approving submission ID: a8ef19c2-...
[BoardApprovalModal] Received submissionId: a8ef19c2-...
[BoardApprovalModal] Found submission: {...}
[BoardApprovalModal] Calling approveBoardSubmissionAndCreateCrawlBoard with: {
  submission: {...},
  adminUserId: "85823de2-b69b-4829-8e1b-c3764c7d633c"
}
```
✅ 에러 없음!

**4단계: DB 검증**
```sql
-- dev_board_submissions 확인
SELECT status, approved_at, crawl_board_id
FROM dev_board_submissions
WHERE board_name LIKE '%남양주%';
```
결과:
- `status = 'approved'` ✅
- `approved_at = '2025-10-29 20:46:35'` ✅
- `crawl_board_id = [UUID]` ✅

```sql
-- crawl_boards 확인
SELECT id, name, board_url, is_active, status, region_display_name
FROM crawl_boards
WHERE name LIKE '%남양주%';
```
결과:
- `name = '남양주교육지원청 구인구직'` ✅
- `is_active = false` ✅ (크롤러 소스 작성 전)
- `status = 'active'` ✅
- `region_display_name = '경기도'` ✅

**5단계: UI 확인**
- ✅ "승인대기 크롤링 게시판": 승인됨 표시
- ✅ "승인된 크롤링 게시판": 남양주 게시판 나타남 (총 4개)

---

## 📊 최종 시스템 상태

### crawl_boards 테이블 (4개 게시판)
1. **경기도 교육청 구인정보조회**
   - region: 경기도
   - is_active: true
   - 크롤러 소스: ✅ 존재

2. **성남교육지원청 구인**
   - region: 경기도 > 성남시
   - is_active: true
   - 크롤러 소스: ✅ 존재

3. **의정부교육지원청 구인**
   - region: 경기도 > 의정부시
   - is_active: true
   - 크롤러 소스: ✅ 존재

4. **남양주교육지원청 구인구직** ← 새로 추가!
   - region: 경기도
   - is_active: false (크롤러 소스 작성 전)
   - 승인 방식: 개발자 제출 → 관리자 승인

---

## 🔑 핵심 배운 점

### 1. RLS 정책의 WITH CHECK 절
- `USING`: 현재 row를 읽을 수 있는지 확인 (UPDATE 전)
- `WITH CHECK`: 새 row가 정책을 만족하는지 확인 (UPDATE 후)
- 승인 워크플로우에서는 status 변경을 허용해야 함!

### 2. 데이터 매핑 함수의 중요성
- TypeScript 타입만 정의해도 안 됨
- DB row ↔ TS object 변환 함수에서 모든 필드를 명시적으로 매핑해야 함
- 누락된 필드는 DB에 `NULL` 또는 기본값으로 저장됨

### 3. 디버깅 로그의 가치
- 각 단계마다 console.log 추가
- 문제 발생 시 정확한 위치 파악 가능
- 승인 → 실패 → 원인 파악 → 수정 → 재테스트 사이클 단축

### 4. 트랜잭션 vs 단계별 처리
- 현재 구현: `approveBoardSubmission()` → `createCrawlBoard()` → `linkSubmission()`
- 문제: 중간에 실패 시 부분 완료 상태 발생 가능
- 개선 방향: Supabase Edge Function으로 트랜잭션 처리 고려

---

## 🚧 남은 작업 (Phase 4)

### Phase 4-1: 크롤러 is_active 필터링 (우선순위 1)
- ⏳ `crawler/lib/supabase.js` 수정
- ⏳ `WHERE is_active = true` 조건 추가
- ⏳ 남양주 게시판 크롤러 소스 작성 (`crawler/sources/namyangju.js`)
- ⏳ 관리자가 `is_active = true`로 활성화

### Phase 4-2: 관리자 페이지 지역 필터 UI (우선순위 2)
- ✅ pg_trgm 계층적 검색 (완료)
- ⏳ 17개 광역자치단체 드롭다운 필터
- ⏳ 시/군/구 검색 입력창
- ⏳ 각 게시판 카드에 "📍 경기도 > 남양주시" 표시

### Phase 4-3: 통계 대시보드 (우선순위 3)
- ⏳ `src/components/admin/CrawlStats.tsx` 생성
- ⏳ 지역별 게시판 개수
- ⏳ 승인 대기/승인됨 통계

### Phase 4-4: 검증 스크립트 (우선순위 4)
- ⏳ E2E 테스트 스크립트
- ⏳ 제출 → 승인 → crawl_board 생성 검증

---

## 📝 변경 이력 요약

### 2025-10-29 오후 8시 (Phase 3.5)
- AdminPage UI 구조 개선 (CollapsibleSection)
- UUID undefined 버그 수정
- 디버깅 로그 추가

### 2025-10-29 오후 9시 (Bug Fixes & Integration)
- **RLS 정책 수정**: dev_board_submissions UPDATE 정책 분리
- **user_profiles PK 수정**: `id` → `user_id`
- **crawl_status enum 수정**: `'idle'` → `'active'`
- **지역 정보 매핑 추가**: mapCrawlBoardToDbRow() 4개 필드 추가
- **최종 통합 테스트 성공**: 남양주 게시판 승인 완료 ✅

---

**최종 업데이트**: 2025-10-29 오후 9시
**작업자**: Claude (AI Assistant)
**현재 상태**: Phase 3 완전 완료 ✅, Phase 4 준비 완료
**다음 작업**: 남양주 크롤러 소스 작성 또는 Phase 4-2 (지역 필터 UI)
