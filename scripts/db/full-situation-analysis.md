# 지역 미상 문제 전체 상황 분석

## 확인된 사실

### 1. 크롤러 코드 생성 (GitHub Actions)
- ✅ AI 크롤러 생성 시 `REGION="가평"` 정상 전달
- ✅ 크롤러 코드에 `location: '가평'` 하드코딩됨 (확인: Line 283)
- ❌ **Gemini가 잘못된 셀렉터 추출**: `"location": "구리남양주"` (가평 페이지를 분석했는데!)

### 2. DB 상태
- ❌ `crawl_boards.region` = **NULL** (approve-submission-and-update-db.ts가 저장 안 함)
- ✅ `crawl_boards.is_local_government` = true
- ✅ `crawl_boards.crawler_source_code` = 크롤러 코드 정상 저장 (10954자)

### 3. 크롤러 실행 (crawler/index.js)
- ✅ Line 569: `finalLocation = rawJob.location || config.region || '미상'`
- ✅ rawJob.location = '가평' (크롤러 코드에서 하드코딩)
- ❌ config.region = NULL (DB에서 가져옴)
- **결과**: rawJob.location이 있으면 '가평', 없으면 NULL → '미상'

### 4. DB 저장 (crawler/lib/supabase.js)
- ❌ **치명적 문제**: Line 73에서 `crawl_source_id: crawlSourceId` 저장
- ❌ **DB 스키마는 `crawl_board_id` 컬럼 사용** (마이그레이션 20250121)
- **결과**: crawl_board_id = NULL로 저장됨

### 5. 실제 크롤링 결과
- ❌ 가평 게시판(de02eada-6569-45df-9f4d-45a4fcc51879)에서 크롤링된 공고: **0개**
- ⚠️ "지역 미상" 공고 10개 발견 (모두 crawl_board_id = NULL)
  - 분당초등학교, 이매중학교, 의정부고등학교 등
  - 생성일: 2025-11-04 02:31~02:32 (8시간 전)

### 6. 크롤러 실행 로그 (GitHub Actions)
```
📍 가평교육지원청 기간제교원 구인구직 크롤링 시작
📋 발견된 공고 수: 10개
  🔍 행 1 처리 중:
     제목: "기간제교원 채용 공고(담임)"
     날짜: "2025.11.04"
     링크: https://...
```
- ⚠️ **location 정보가 로그에 전혀 없음**
- 크롤러가 10개 공고를 발견했지만 저장은 안 됨 (가평 게시판 공고 0개)

## 문제 원인 분석

### 주요 문제 3가지

#### 문제 1: 필드명 불일치 (가장 치명적)
```javascript
// crawler/lib/supabase.js:73
crawl_source_id: crawlSourceId,  // ❌ 잘못된 필드명

// DB 스키마 (20250121 마이그레이션)
crawl_board_id UUID  // ✅ 실제 필드명
```
**결과**: crawl_board_id = NULL → 게시판 추적 불가

#### 문제 2: DB region 필드 NULL
```javascript
// approve-submission-and-update-db.ts:48
const region = submission.region || null;  // ❌ 항상 NULL
```
**결과**: config.region = NULL → 최후방어선 작동 안 함

#### 문제 3: 크롤러가 location 반환 안 함 (추측)
- 크롤러 코드에 `location: '가평'` 하드코딩되어 있음 ✅
- 하지만 실행 로그에 location이 없음 ❌
- **가능성**: 크롤러 실행 중 에러 또는 저장 실패

## 사용자가 본 "지역 미상" 카드의 정체

사용자가 본 카드들 (분당초, 이매중, 의정부고 등):
- crawl_board_id = NULL
- location = '미상'
- created_at = 2025-11-04 02:31~02:32

**추론**: 이들은 다른 게시판(성남, 의정부)에서 크롤링되었지만:
1. crawl_source_id를 저장하려 했지만 필드가 없어서 NULL
2. rawJob.location이 NULL이었음
3. config.region도 NULL
4. 결과: location = '미상', crawl_board_id = NULL

## 해결 방법 (우선순위)

### 1순위: crawler/lib/supabase.js 필드명 수정 (필수)
```javascript
// Line 73
crawl_board_id: crawlSourceId,  // ✅ 올바른 필드명
```

### 2순위: approve-submission-and-update-db.ts region 추출 (중요)
```javascript
// region_code/subregion_code에서 실제 지역명 추출
if (submission.is_local_government && submission.subregion_code) {
  const { data: city } = await supabase
    .from('regions')
    .select('name')
    .eq('code', submission.subregion_code)
    .single();
  region = city?.name.replace(/(시|군|구)$/, '') || null;
}
```
**이미 수정함** ✅

### 3순위: crawler/index.js 최후방어선 추가 (보험)
```javascript
// Line 569 다음에 추가
if (config.isLocalGovernment && (finalLocation === '미상' || !finalLocation)) {
  const match = config.name.match(/^([가-힣]+)(교육|교육지원청)/);
  finalLocation = match ? match[1] : config.region || '미상';
}
```

## 예상되는 결과

### 1순위 수정 후:
- ✅ crawl_board_id 정상 저장
- ✅ 게시판 추적 가능
- ⚠️ 기존 크롤러가 location을 반환하면 정상 작동
- ❌ 기존 크롤러가 location 안 반환하면 여전히 '미상'

### 2순위 수정 후:
- ✅ 새로운 게시판 등록 시 region 자동 저장
- ✅ config.region 사용 가능 (최후방어선)
- ❌ 기존 게시판(region=NULL)은 여전히 문제

### 3순위 수정 후:
- ✅ 모든 경우에 게시판 이름에서 지역 추출
- ✅ 완전무결한 최후방어선
- ✅ "지역 미상" 완전 차단

## 최종 권장 사항

**모든 3가지를 동시에 수정해야 완전무결한 해결**

1. crawler/lib/supabase.js: crawl_board_id 필드명 수정 (즉시)
2. approve-submission-and-update-db.ts: region 추출 (이미 완료)
3. crawler/index.js: 게시판 이름 기반 최후방어선 (보험)

**추가 작업**:
- 기존 crawl_boards에서 region=NULL인 게시판들의 region 수정
- 기존 "지역 미상" 공고들 삭제 또는 location 업데이트
