# 셀미바이미 크롤러

경기도 교육지원청 구인 공고 자동 수집 시스템

## 🚀 빠른 시작

### 1. 환경 설정

```bash
cd crawler
npm install
```

### 2. 환경 변수 설정

`.env` 파일 생성:

```bash
cp .env.example .env
```

`.env` 파일 편집:

```env
SUPABASE_URL=https://qpwnsvsiduvvqdijyxio.supabase.co
SUPABASE_ANON_KEY=your_actual_key_here
GEMINI_API_KEY=your_gemini_key_here
```

### 3. Playwright 설치

```bash
npx playwright install chromium
```

### 4. 크롤링 실행

```bash
npm run crawl:seongnam
```

## 📁 디렉토리 구조

```
crawler/
├── index.js              # 메인 실행 파일
├── package.json          # 의존성 관리
├── .env                  # 환경 변수 (gitignore)
├── .env.example          # 환경 변수 템플릿
├── README.md             # 이 파일
├── sources/
│   └── seongnam.js       # 성남교육지원청 크롤러
├── lib/
│   ├── playwright.js     # 브라우저 자동화
│   ├── gemini.js         # AI 정규화/검증
│   └── supabase.js       # DB 저장
└── config/
    └── sources.json      # 크롤링 대상 설정
```

## 🔧 주요 기능

### 1. 다중 선택자 전략
HTML 구조 변경에 대응하기 위해 여러 선택자를 순차적으로 시도:

```javascript
"title": "td.subject a, td:nth-child(2) a, .subject a"
```

### 2. AI 정규화
Gemini AI로 비정형 데이터를 표준 JSON으로 변환:

```javascript
입력: "2025.10.20(월) ~ 10.25(금) 18:00까지"
출력: "2025-10-25"
```

### 3. 중복 방지
URL 기준으로 중복 공고 자동 스킵

### 4. 에러 핸들링
- 네트워크 타임아웃: 30초
- AI 파싱 실패: 자동 스킵
- 페이지 구조 변경: 경고 출력

## 🧪 테스트

### HTML 구조 확인

```bash
node index.js --test
```

### 단일 소스 크롤링

```bash
npm run crawl:seongnam
```

## 📊 예상 결과

```
🚀 셀미바이미 크롤러 시작
==================================================
📌 크롤링 소스 ID: xxx-xxx-xxx

📍 성남교육지원청 크롤링 시작
🌐 페이지 로딩: https://www.goesn.kr/...
✅ 페이지 로딩 완료
📋 발견된 공고 수: 15개
  1. 영어 시간강사 모집
  2. 방과후 코딩 강사 모집
  ...

🤖 AI 정규화 시작...
🤖 AI 정규화 완료: 영어 시간강사
✅ 저장 완료: 영어 시간강사
...

==================================================
📊 크롤링 결과
==================================================
✅ 성공: 12개
❌ 실패: 3개
📈 성공률: 80.0%
==================================================

✨ 크롤링 완료!
```

## ⚠️ 문제 해결

### 1. "공고 목록을 찾을 수 없습니다"

**원인**: HTML 선택자가 실제 페이지 구조와 맞지 않음

**해결**:
1. 브라우저에서 https://www.goesn.kr/... 접속
2. 개발자 도구(F12) 열기
3. 공고 목록의 실제 HTML 구조 확인
4. `config/sources.json`의 선택자 수정

### 2. "Gemini API 호출 실패"

**원인**: API 키 오류 또는 할당량 초과

**해결**:
1. `.env` 파일의 `GEMINI_API_KEY` 확인
2. https://aistudio.google.com/apikey 에서 키 재발급
3. 무료 티어 한도 확인 (분당 15회)

### 3. "Supabase 저장 실패"

**원인**: RLS 정책 또는 스키마 불일치

**해결**:
1. Supabase 콘솔에서 `crawl_sources` 테이블 존재 확인
2. RLS 정책 확인 (익명 사용자 INSERT 허용 필요)
3. 마이그레이션 재실행

## 🔜 다음 단계

Phase 1 완료 후:
- [ ] 정확도 95% 이상 확인
- [ ] 프론트엔드에서 데이터 확인
- [ ] Phase 2: 5개 교육청 확장 준비
