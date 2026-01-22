# Public 저장소 전환 체크리스트

## ✅ 완료된 작업

### 1. 하드코딩 제거
- [x] `useKakaoMaps.ts`: KAKAO_APP_KEY 하드코딩 제거
- [x] `generate-crawler.ts`: SUPABASE_URL 하드코딩 제거
- [x] `.env.example`: 실제 ANON_KEY 제거 및 Kakao 키 추가

### 2. 가이드 문서 작성
- [x] `CLOUDFLARE_ENV_SETUP.md`: 환경변수 설정 가이드
- [x] `PUBLIC_CONVERSION_CHECKLIST.md`: 전환 체크리스트 (이 파일)

---

## ⏳ Public 전환 전 필수 작업

### 1단계: 새로운 Kakao API 키 발급
- [ ] [Kakao Developers](https://developers.kakao.com) 접속
- [ ] 앱 선택 → 앱 키 → JavaScript 키 확인/재발급
- [ ] 플랫폼 등록:
  - [ ] Web: `https://sellmebuyme.pages.dev`
  - [ ] Web: `http://localhost:5173`

### 2단계: Cloudflare Pages 환경변수 추가
- [ ] Cloudflare Dashboard → Pages → sellmebuyme → Settings → Environment variables
- [ ] 다음 변수 추가 (Production + Preview 모두):
  - [ ] `VITE_KAKAO_MAP_KEY` = (새로 발급받은 키)
  - [ ] `VITE_SUPABASE_URL` = `https://qpwnsvsiduvvqdijyxio.supabase.co`
  - [ ] `VITE_SUPABASE_ANON_KEY` = (현재 키)
  - [ ] `VITE_KAKAO_REST_API_KEY` = (REST API 키)
  - [ ] `VITE_TEAM_CONSOLE_PASSWORD` = (현재 비밀번호)
  - [ ] `VITE_TEAM_CONSOLE_PATH` = (현재 경로)

### 3단계: 로컬 테스트
- [ ] 로컬 .env 파일 생성 (`.env.example` 복사)
- [ ] 실제 키 값 입력
- [ ] `npm run dev` 실행
- [ ] 지도 로딩 확인
- [ ] 공고 검색 확인

### 4단계: 코드 푸시 및 배포 테스트
- [ ] 현재 브랜치 커밋
- [ ] main에 푸시
- [ ] Cloudflare Pages 자동 배포 대기
- [ ] Production 사이트에서 지도 작동 확인

### 5단계: GitHub 저장소 Public 전환
- [ ] GitHub → Settings → General → Danger Zone
- [ ] "Change repository visibility" → Public 선택
- [ ] 저장소 이름 입력하여 확인
- [ ] 전환 완료

---

## 🎯 전환 후 확인사항

- [ ] GitHub Actions가 정상 실행되는지 확인 (Track Deployment)
- [ ] 오전 10시/오후 6시 크롤링이 정상 실행되는지 확인
- [ ] 팀원들에게 `.env` 파일 설정 가이드 공유
- [ ] 모든 환경에서 지도가 정상 작동하는지 확인

---

## 📝 팀원 가이드

### 로컬 개발 환경 설정

1. 저장소 클론 후:
   ```bash
   cp .env.example .env
   ```

2. `.env` 파일에 실제 키 값 입력 (팀 관리자에게 요청)

3. 개발 서버 실행:
   ```bash
   npm install
   npm run dev
   ```

### 주의사항
- `.env` 파일은 절대 Git에 커밋하지 마세요!
- 키 값은 팀 내부에서만 공유하세요
- Public 저장소이므로 민감한 정보를 코드에 작성하지 마세요

---

## ✅ 전환 완료 후 혜택

- ✅ GitHub Actions 완전 무료 (무제한)
- ✅ 크롤링 하루 2회 정상 실행
- ✅ 비용 부담 없음
- ✅ 오픈소스로 포트폴리오 가능
