# 의정부교육지원청 크롤러 구현

## 개요
의정부교육지원청 구인 게시판 크롤러를 성남교육지원청과 동일한 구조로 구현했습니다.

## 구현 파일

### 1. 크롤러 소스 파일
- **파일**: `crawler/sources/uijeongbu.js`
- **기능**: 의정부교육지원청 게시판 크롤링 로직
- **구조**: 성남 크롤러와 동일한 패턴 사용
  - 목록 페이지에서 공고 추출
  - 각 공고의 상세 페이지 방문
  - 본문, 첨부파일, 스크린샷 수집

### 2. 설정 파일 업데이트
- **파일**: `crawler/config/sources.json`
- **추가 내용**:
```json
{
  "uijeongbu": {
    "name": "의정부교육지원청",
    "baseUrl": "http://222.120.4.134/goeujb/na/ntt/selectNttList.do?mi=7019&bbsId=4117",
    "detailUrlTemplate": "http://222.120.4.134/goeujb/na/ntt/selectNttInfo.do?mi=7019&bbsId=4117&nttSn=",
    "parserType": "html",
    "selectors": {
      "listContainer": "table.board-list, .board_list, .tbl_list",
      "rows": "tbody tr",
      "title": "td.ta_l a, .nttInfoBtn",
      "date": "td:nth-child(3)",
      "link": ".nttInfoBtn",
      "attachment": "a[href*='.hwp'], a[href*='download']"
    },
    "region": "의정부",
    "active": true
  }
}
```

### 3. 메인 크롤러 통합
- **파일**: `crawler/index.js`
- **변경사항**:
  - `crawlUijeongbu` 함수 import 추가
  - 크롤링 실행 로직에 의정부 케이스 추가

### 4. 테스트 파일
- **파일**: `crawler/test-uijeongbu.js`
- **기능**: 의정부 크롤러 단독 테스트
- **실행**: `node test-uijeongbu.js` 또는 `test-uijeongbu.bat`

### 5. 실행 배치 파일
- **테스트용**: `test-uijeongbu.bat` - 크롤러 기능만 테스트
- **실행용**: `run-uijeongbu.bat` - AI 정규화 포함 전체 파이프라인 실행

## 사용 방법

### 테스트 실행 (크롤링만)
```bash
# 방법 1: 배치 파일 실행
test-uijeongbu.bat

# 방법 2: Node.js 직접 실행
node test-uijeongbu.js
```

### 전체 파이프라인 실행 (AI 정규화 + DB 저장)
```bash
# 방법 1: 배치 파일 실행
run-uijeongbu.bat

# 방법 2: Node.js 직접 실행
node index.js --source=uijeongbu
```

## 크롤링 대상 URL
- **목록 페이지**: http://222.120.4.134/goeujb/na/ntt/selectNttList.do?mi=7019&bbsId=4117
- **상세 페이지**: http://222.120.4.134/goeujb/na/ntt/selectNttInfo.do?mi=7019&bbsId=4117&nttSn={게시글ID}

## 주요 기능

### 1. 목록 페이지 크롤링
- 게시판 테이블에서 공고 목록 추출
- 제목, 날짜, 게시글 ID 수집
- 배치 크기만큼만 처리 (기본 3개, DB 설정 가능)

### 2. 상세 페이지 크롤링
- 본문 내용 추출 (불필요한 네비게이션 제거)
- HWP/PDF 첨부파일 URL 추출
- 전체 페이지 스크린샷 캡처 (PNG, Base64)

### 3. 동적 첨부파일 처리
- 정적 링크 우선 탐색
- JavaScript 이벤트 핸들러 분석
- `previewAjax()`, `preListen()` 함수 파라미터 추출
- 다운로드 이벤트 캡처

### 4. 데이터 정규화
- Gemini Vision API로 스크린샷 분석
- Gemini Text API로 본문 정규화
- 구조화된 JSON 데이터 생성

## 데이터 구조

### 크롤링 결과 (Raw)
```javascript
{
  title: "공고 제목",
  date: "2025-01-19",
  link: "상세 페이지 URL",
  detailContent: "본문 텍스트",
  attachmentUrl: "첨부파일 URL",
  attachmentFilename: "파일명.hwp",
  screenshotBase64: "Base64 인코딩된 스크린샷"
}
```

### 정규화 후 (Normalized)
```javascript
{
  title: "정규화된 제목",
  organization: "학교명",
  job_type: "기간제교원",
  compensation: "급여 정보",
  deadline: "마감일",
  tags: ["과목1", "과목2"],
  application_period: "접수 기간",
  work_period: "근무 기간",
  contact: "연락처",
  qualifications: ["자격요건1", "자격요건2"],
  work_time: "근무시간",
  detail_content: "원본 본문",
  attachment_url: "다운로드 URL",
  structured_content: "구조화된 본문"
}
```

## 성남 크롤러와의 차이점
- **URL 구조**: 동일 (게시판 형식)
- **HTML 구조**: 유사 (같은 CMS 사용 추정)
- **선택자**: 동일한 CSS 클래스 사용
- **첨부파일 처리**: 동일한 로직 적용

## 주의사항
1. **IP 주소 기반 URL**: 도메인이 아닌 IP 주소 사용 (http://222.120.4.134)
2. **HTTP 프로토콜**: HTTPS가 아닌 HTTP 사용
3. **배치 크기**: DB의 `crawl_sources` 테이블에서 `crawl_batch_size` 설정 가능
4. **중복 체크**: 동일 URL의 공고는 자동으로 건너뜀

## 다음 단계
1. 테스트 실행으로 크롤링 동작 확인
2. HTML 구조가 예상과 다를 경우 선택자 조정
3. DB에 크롤링 소스 등록 (자동 생성됨)
4. GitHub Actions 워크플로우에 추가 (선택사항)

## 문제 해결

### 공고를 찾을 수 없는 경우
1. 웹사이트 접속 확인: http://222.120.4.134/goeujb/na/ntt/selectNttList.do?mi=7019&bbsId=4117
2. HTML 구조 변경 확인
3. 선택자 수정 필요 시 `sources.json` 업데이트

### 첨부파일을 찾을 수 없는 경우
1. 상세 페이지에서 첨부파일 링크 확인
2. JavaScript 함수명 확인 (previewAjax, preListen 등)
3. 필요시 `uijeongbu.js`의 첨부파일 추출 로직 수정

### 스크린샷이 너무 큰 경우
- Playwright의 스크린샷 옵션 조정 가능
- `fullPage: false`로 변경하여 뷰포트만 캡처
