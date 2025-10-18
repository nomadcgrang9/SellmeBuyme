# 경기도교육청 크롤러 테스트 가이드

## 구현 완료 사항
✅ `crawler/config/sources.json`에 경기도교육청 설정 추가  
✅ `crawler/sources/gyeonggi.js` 크롤러 모듈 생성  
✅ `crawler/index.js`에서 `--source=gyeonggi` 지원  

---

## 테스트 방법 (단계별)

### 1단계: 터미널 열기
- VS Code에서 `Ctrl + ~` (물결표) 키를 누르면 하단에 터미널이 열립니다.
- 또는 상단 메뉴 → `터미널` → `새 터미널`

### 2단계: crawler 폴더로 이동
터미널에 아래 명령어를 **복사해서 붙여넣고** Enter:
```
cd crawler
```

### 3단계: 크롤러 실행
아래 명령어를 **복사해서 붙여넣고** Enter:
```
node index.js --source=gyeonggi
```

### 4단계: 결과 확인
- 터미널에 다음과 같은 메시지가 나오면 성공:
  ```
  📍 경기도교육청 크롤링 시작
  📋 발견된 공고 수: X개
  ✅ 완료: (공고 제목)
  ✅ 저장 완료: (공고 제목)
  ```
- 에러가 나면 메시지를 복사해서 저에게 보내주세요.

---

## 자주 발생하는 문제

### 문제 1: "node를 찾을 수 없습니다"
**해결**: Node.js가 설치되지 않았습니다.
1. https://nodejs.org/ 접속
2. LTS 버전 다운로드 → 설치
3. 터미널 재시작 후 다시 시도

### 문제 2: "playwright를 찾을 수 없습니다"
**해결**: 패키지 설치 필요
```
npm install
```
실행 후 다시 `node index.js --source=gyeonggi` 실행

### 문제 3: "GEMINI_API_KEY가 없습니다"
**해결**: `.env` 파일에 API 키 설정 필요
1. `.env` 파일 열기
2. `GEMINI_API_KEY=여기에_키_입력` 확인
3. 키가 없으면 https://aistudio.google.com/apikey 에서 발급

---

## 다음 단계

크롤러가 정상 작동하면:
1. Supabase에 데이터가 저장되었는지 확인
2. 관리자 UI의 "즉시 실행" 버튼과 연결 (Edge Function 필요)
3. 정기 스케줄러 설정

---

## 도움이 필요하면
에러 메시지 전체를 복사해서 보내주세요. 바로 해결해 드리겠습니다.
