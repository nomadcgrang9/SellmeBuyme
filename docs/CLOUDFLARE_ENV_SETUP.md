# Cloudflare Pages 환경변수 설정 가이드

## Public 전환 전 필수 작업

### 1. Cloudflare Pages 대시보드 접속

1. https://dash.cloudflare.com 로그인
2. Pages 메뉴 클릭
3. `sellmebuyme` 프로젝트 선택
4. Settings 탭 → Environment variables

### 2. 환경변수 추가

| 변수명 | 값 | 설명 |
|--------|---|------|
| `VITE_KAKAO_MAP_KEY` | `새로_발급받은_키` | 카카오 지도 API 키 |
| `VITE_SUPABASE_URL` | `https://qpwnsvsiduvvqdijyxio.supabase.co` | Supabase URL |
| `VITE_SUPABASE_ANON_KEY` | `(현재_키)` | Supabase Anon Key |
| `VITE_KAKAO_REST_API_KEY` | `(REST_API_키)` | 카카오 REST API 키 |
| `VITE_TEAM_CONSOLE_PASSWORD` | `(현재_비밀번호)` | 팀 콘솔 비밀번호 |
| `VITE_TEAM_CONSOLE_PATH` | `(현재_경로)` | 팀 콘솔 경로 |

**주의:** Production과 Preview 모두에 추가해야 합니다!

### 3. 배포 환경 선택

- **Production**: main 브랜치 배포 시 사용
- **Preview**: PR 및 다른 브랜치 배포 시 사용

모든 변수를 **Both**로 설정하는 것을 권장합니다.

### 4. 재배포

환경변수 추가 후:
1. Settings → Builds & deployments
2. 최근 배포에서 "Retry deployment" 클릭
3. 또는 main에 새로운 커밋 푸시

---

## 참고: 현재 환경변수 위치

### GitHub Actions Secrets
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (절대 Cloudflare에 추가 금지!)
- `GEMINI_API_KEY` (절대 Cloudflare에 추가 금지!)

### Cloudflare Pages (VITE_ 접두사 필요)
- `VITE_KAKAO_MAP_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_KAKAO_REST_API_KEY`
- `VITE_TEAM_CONSOLE_PASSWORD`
- `VITE_TEAM_CONSOLE_PATH`

---

## 체크리스트

- [ ] 새로운 Kakao API 키 발급
- [ ] Cloudflare Pages에 환경변수 추가
- [ ] 하드코딩 제거 후 로컬 테스트
- [ ] .env.example 파일 생성
- [ ] 팀원들에게 .env 설정 가이드 공유
- [ ] 재배포 후 production 테스트
- [ ] GitHub 저장소 Public 전환
