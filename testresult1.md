# 크롤러 문제점 분석 및 수정 보고서

## 개요

서울과 인천 크롤러가 자동 헬스체크에서 문제가 발생한 원인을 분석하고 수정한 내용입니다.

---

## 1. 서울 크롤러 문제

### 증상
- 헬스체크 결과: **페이지 로딩 실패 (404 Not Found)**

### 원인
`health-check-worker.js` 파일에서 서울 교육청 URL이 잘못 설정되어 있었습니다.

### 수정 내용

**파일**: `crawler/health-check-worker.js` (11번째 줄)

```javascript
// 수정 전 (잘못된 URL - 404 에러 발생)
seoul: {
  name: '서울',
  boardUrl: 'https://work.sen.go.kr/recruit/job/pageListJob.do',  // ❌ 존재하지 않는 페이지
  domains: ['work.sen.go.kr']
}

// 수정 후 (정상 URL)
seoul: {
  name: '서울',
  boardUrl: 'https://work.sen.go.kr/work/search/recInfo/BD_selectSrchRecInfo.do',  // ✅ 실제 채용공고 페이지
  domains: ['work.sen.go.kr']
}
```

---

## 2. 인천 크롤러 문제

### 증상
- 헬스체크 결과: **16일간 미수집, 수집률 0%, 5건 누락**
- GitHub Actions 에러: `page.$$: selector: expected string, got undefined`

### 원인 분석

인천 크롤러(`incheon.js`)는 설정 파일에서 셀렉터 정보를 읽어와야 하는데, `sources.json`에 해당 설정이 누락되어 있었습니다.

#### 코드 흐름 (incheon.js 49번째 줄)

```javascript
// incheon.js에서 config.selectors.rows를 사용
const rows = await page.$$(config.selectors.rows);
//                        ↑
//                        이 값이 undefined여서 에러 발생!
```

#### 설정 비교

| 지역 | selectors 설정 | 결과 |
|------|---------------|------|
| 부산 | ✅ 있음 | 정상 작동 |
| 대구 | ✅ 있음 | 정상 작동 |
| **인천** | ❌ **없음** | **에러 발생** |

### 수정 내용

**파일**: `crawler/config/sources.json`

```json
// 수정 전 (selectors 누락)
"incheon": {
  "name": "인천교육청 채용공고",
  "baseUrl": "https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981",
  "detailUrlTemplate": "https://www.ice.go.kr/ice/na/ntt/selectNttInfo.do?mi=10997&bbsId=1981&nttSn=",
  "parserType": "ntt",
  "region": "인천",
  "isLocalGovernment": false,
  "active": true
  // ❌ selectors 객체가 없음!
}

// 수정 후 (selectors 추가)
"incheon": {
  "name": "인천교육청 채용공고",
  "baseUrl": "https://www.ice.go.kr/ice/na/ntt/selectNttList.do?mi=10997&bbsId=1981",
  "detailUrlTemplate": "https://www.ice.go.kr/ice/na/ntt/selectNttInfo.do?mi=10997&bbsId=1981&nttSn=",
  "parserType": "ntt",
  "region": "인천",
  "metropolitanRegion": "인천",        // ✅ 추가
  "isLocalGovernment": false,
  "active": true,
  "selectors": {                        // ✅ 추가
    "listContainer": "table tbody",
    "rows": "table tbody tr",
    "title": "a.nttInfoBtn, a[data-id], td.ta_l a, td:nth-child(5) a",
    "date": "td:nth-child(1)",
    "link": "a.nttInfoBtn, a[data-id]",
    "attachment": ".file-list a, .atch-file-list a"
  },
  "note": "별도 크롤러 사용 (incheon.js) - data-id 패턴 + goFileDown 첨부파일"
}
```

---

## 3. 수정 파일 요약

| 파일 | 수정 내용 |
|------|----------|
| `crawler/health-check-worker.js` | 서울 URL 수정 (11번째 줄) |
| `crawler/config/sources.json` | 인천 selectors 설정 추가 (306-324번째 줄) |

---

## 4. 검증 방법

수정 후 다음 명령어로 로컬 테스트 가능:

```bash
cd crawler

# 인천 크롤러 테스트
node index.js --source=incheon

# 서울 크롤러 테스트
node index.js --source=seoul
```

---

## 5. 시각적 요약

```
[문제 발생 흐름]

GitHub Actions (매일 01:00 UTC)
        │
        ▼
    ┌─────────────────┐
    │  index.js 실행   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  incheon.js     │
    │  크롤러 호출     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  config.selectors.rows 참조     │
    │  → undefined (설정 누락!)        │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────┐
    │  ❌ 에러 발생    │
    │  크롤링 실패     │
    └─────────────────┘


[수정 후 정상 흐름]

GitHub Actions (매일 01:00 UTC)
        │
        ▼
    ┌─────────────────┐
    │  index.js 실행   │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────┐
    │  incheon.js     │
    │  크롤러 호출     │
    └────────┬────────┘
             │
             ▼
    ┌─────────────────────────────────┐
    │  config.selectors.rows 참조     │
    │  → "table tbody tr" ✅          │
    └────────┬────────────────────────┘
             │
             ▼
    ┌─────────────────┐
    │  ✅ 정상 크롤링  │
    │  데이터 수집     │
    └─────────────────┘
```

---

## 6. 결론

- **서울**: URL 오타 문제 → URL 수정으로 해결
- **인천**: 설정 누락 문제 → selectors 객체 추가로 해결

이 수정으로 두 지역 모두 자동 크롤링이 정상 작동할 것으로 예상됩니다.
