# 셀미바이미 크롤링 시스템 계획

> 경기도 25개 교육지원청 구인 공고 자동 수집

---

## 🎯 목표

- **대상**: 경기도 교육지원청 25개 사이트
- **주기**: 매일 09:00, 13:00 (하루 2회)
- **규모**: 일 50-75건 (교육청당 평균 2-3건)
- **비용**: $0 (Gemini 무료 티어로 충분)

---

## 📊 크롤링 대상 사이트

### 성남교육지원청 (프로토타입)
- **URL**: https://www.goesn.kr/goesn/na/ntt/selectNttList.do?mi=23603&bbsId=17872
- **특징**: JavaScript 렌더링, 로그인 불필요, HWP 다운로드 가능
- **총 공고**: 24,765건 (역대 누적)

### 나머지 24개 교육청
```
수원, 용인, 화성오산, 안양과천, 광명, 군포의왕, 
부천, 김포, 고양, 파주, 양주, 의정부, 동두천양주,
남양주, 구리남양주, 광주하남, 여주, 이천, 안성,
평택, 시흥, 안산, 과천, 포천, 가평양평
```

---

## 🏗️ 시스템 아키텍처

```
GitHub Actions (스케줄러)
    ↓
Playwright (HTML 수집)
    ↓
Gemini AI (데이터 정규화)
    ↓
Gemini AI (검증)
    ↓
Supabase (저장)
    ↓
프론트엔드 (실시간 반영)
```

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

### Week 1: 프로토타입 (성남교육지원청)
1. Playwright로 HTML 수집
2. Gemini로 데이터 정규화
3. Supabase 저장 테스트
4. 정확도 95% 이상 확인

### Week 2: AI 파이프라인 완성
1. 3단계 검증 시스템
2. 에러 핸들링
3. 중복 감지
4. 관리자 알림

### Week 3: 확장 (5개 교육청)
1. 수원, 용인, 화성, 안양 추가
2. 공통 파서 추상화
3. 사이트별 설정 파일

### Week 4: 전체 배포 (25개)
1. 나머지 20개 추가
2. GitHub Actions 스케줄링
3. 모니터링 대시보드
4. 1주일 무인 운영 테스트

---

## 💾 데이터 구조

### Supabase 저장 형식
```json
{
  "source": "crawled",
  "crawl_source_id": "성남교육지원청 UUID",
  "organization": "성남교육지원청",
  "title": "영어 시간강사",
  "tags": ["영어", "시간강사", "중등"],
  "location": "성남 분당구",
  "compensation": "시급 30,000원",
  "deadline": "2025-10-25T18:00:00",
  "source_url": "https://www.goesn.kr/...",
  "attachments": {
    "hwp_url": "https://www.goesn.kr/download/..."
  },
  "ai_confidence": 0.95,
  "needs_review": false
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

## ⚙️ GitHub Actions 설정

```yaml
# .github/workflows/crawl.yml
name: Daily Crawl
on:
  schedule:
    - cron: '0 0,4 * * *'  # 09:00, 13:00 KST
jobs:
  crawl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npx playwright install chromium
      - run: node crawler/index.js
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
```

---

## 📁 디렉토리 구조

```
crawler/
├── index.js              # 메인 실행 파일
├── sources/
│   ├── seongnam.js       # 성남교육지원청
│   ├── suwon.js          # 수원교육지원청
│   └── ...               # 나머지 23개
├── lib/
│   ├── playwright.js     # 크롤링 유틸
│   ├── gemini.js         # AI 정규화
│   └── supabase.js       # DB 저장
├── config/
│   └── sources.json      # 25개 교육청 설정
└── .env
```

---

## 🎯 핵심 포인트

1. **HWP 파일**: 직접 다운로드 X, 링크만 추출
2. **AI 활용**: 정규화 + 검증에만 사용 (비용 $0)
3. **안정성**: 3단계 검증 + 자동 재시도
4. **확장성**: 1개 → 5개 → 25개 단계적 확장
5. **무인 운영**: GitHub Actions 자동 스케줄링

---

## 📊 예상 성과

| 지표 | 목표 |
|------|------|
| 정확도 | 95% 이상 |
| 일일 수집 | 50-75건 |
| 응답 시간 | 5분 이내 |
| 월 비용 | $0 |
| 유지보수 | 주 30분 |

---

## 🚦 다음 단계

1. **성남교육지원청 프로토타입 개발** (이번 주)
2. **AI 파이프라인 완성** (다음 주)
3. **5개 교육청 확장** (3주차)
4. **전체 25개 배포** (4주차)

---

이 계획을 따라 4주 내에 완전 자동화된 크롤링 시스템 구축 가능 🚀
