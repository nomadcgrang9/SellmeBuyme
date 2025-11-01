# GitHub Personal Access Token (PAT) 설정 가이드

AI 크롤러 자동 생성 기능에서 GitHub Actions를 안전하게 트리거하기 위해 GitHub Personal Access Token이 필요합니다.

## 보안 아키텍처

```
[관리자 페이지]
    ↓ (submission_id, board_name, board_url 전송 - 브라우저에서 안전)
[Edge Function]
    ↓ (GH_PAT 사용, 브라우저에 노출 안 됨 - 서버측에서만 실행)
[GitHub Actions]
    ↓ (Playwright + Gemini Vision으로 완전한 크롤러 생성)
[Database 업데이트]
```

**중요**: GitHub PAT 토큰은 Edge Function 환경 변수에만 저장되며, 절대 브라우저에 노출되지 않습니다!

## 1. GitHub PAT 생성

### 1단계: GitHub 토큰 페이지 접속
https://github.com/settings/tokens/new 로 이동합니다.

### 2단계: 토큰 정보 입력
- **Note**: `SellmeBuyme AI Crawler Generator` (또는 원하는 이름)
- **Expiration**: `90 days` (또는 원하는 기간)
- **Select scopes**: `repo` 권한 전체 체크
  - ✅ `repo` (전체 체크)
    - ✅ `repo:status`
    - ✅ `repo_deployment`
    - ✅ `public_repo`
    - ✅ `repo:invite`
    - ✅ `security_events`

### 3단계: 토큰 생성 및 복사
- 페이지 하단의 **"Generate token"** 버튼 클릭
- 생성된 토큰을 복사 (예: `ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`)
- ⚠️ **중요**: 이 토큰은 다시 볼 수 없으므로 안전한 곳에 저장하세요!

## 2. Supabase Edge Function 환경 변수 설정

GitHub PAT 토큰은 **Edge Function 환경 변수로만 설정**되며, 프론트엔드(.env 파일)에는 설정하지 않습니다.

### Supabase CLI로 설정
```bash
supabase secrets set GH_PAT=ghp_your_actual_token_here
```

### Supabase Dashboard로 설정
1. Supabase Dashboard 접속
2. 프로젝트 선택
3. **Settings** → **Edge Functions** → **Manage secrets**
4. **Add new secret** 클릭
5. Name: `GH_PAT`
6. Value: `ghp_your_actual_token_here`
7. **Save** 클릭

**참고**: `.env` 파일에는 GitHub PAT를 추가하지 마세요! 보안상 Edge Function 환경 변수로만 관리됩니다.

## 3. GitHub Actions 시크릿 설정 (프로덕션 배포용)

### 1단계: GitHub 리포지토리 설정 페이지 이동
1. GitHub 리포지토리 페이지로 이동
2. **Settings** 탭 클릭
3. 좌측 메뉴에서 **Secrets and variables** → **Actions** 클릭

### 2단계: 필수 시크릿 추가
다음 시크릿들이 모두 설정되어 있는지 확인:

| 이름 | 설명 | 예시 |
|------|------|------|
| `VITE_SUPABASE_URL` | Supabase 프로젝트 URL | `https://qpwnsvsiduvvqdijyxio.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | Supabase Anon Key | `eyJhbGciOiJIUzI1NiIs...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Service Role Key | `eyJhbGciOiJIUzI1NiIs...` |
| `GEMINI_API_KEY` | Gemini AI API Key | `AIzaSyD1V9kMp2w3G...` |
| `VITE_GITHUB_PAT` | GitHub Personal Access Token | `ghp_xxxxxxxxxxxx...` |

### 3단계: 새 시크릿 추가 방법
1. **"New repository secret"** 버튼 클릭
2. **Name**: 시크릿 이름 입력 (예: `VITE_GITHUB_PAT`)
3. **Secret**: 실제 토큰 값 붙여넣기
4. **"Add secret"** 클릭

## 4. 동작 확인

### 로컬 테스트
1. 개발 서버 실행: `npm run dev`
2. 관리자 페이지 접속
3. "AI 크롤러 생성" 버튼 클릭
4. 브라우저 콘솔에서 다음 로그 확인:
   ```
   [BoardApprovalModal] GitHub Actions 트리거 시작
   [BoardApprovalModal] GitHub Actions 트리거 성공
   ```

### GitHub Actions 실행 확인
1. GitHub 리포지토리의 **Actions** 탭 이동
2. **"Generate Crawler with AI"** 워크플로우 실행 확인
3. 워크플로우 로그에서 다음 단계 확인:
   - ✅ Generate crawler with AI
   - ✅ Approve submission and update DB

### 데이터베이스 확인
1. Supabase Dashboard → Table Editor
2. `crawl_boards` 테이블에서 새 레코드 확인
3. `crawler_source_code` 필드 길이가 5841자 이상인지 확인
4. `dev_board_submissions` 테이블에서 `status='approved'` 확인

## 5. 보안 주의사항

### ⚠️ 절대 하지 말아야 할 것
- GitHub PAT를 코드에 직접 작성 (하드코딩)
- GitHub PAT를 공개 리포지토리에 커밋
- GitHub PAT를 로그에 출력
- 만료된 토큰 방치

### ✅ 권장 사항
- 토큰은 `.env` 파일에만 저장 (`.gitignore`에 등록됨)
- 정기적으로 토큰 갱신 (90일마다)
- 사용하지 않는 토큰은 즉시 삭제
- 필요한 최소 권한만 부여 (`repo` 권한만)

## 6. 문제 해결

### 에러: "GitHub PAT 토큰이 설정되지 않았습니다"
**원인**: `.env` 파일에 `VITE_GITHUB_PAT` 미설정

**해결**:
1. `.env` 파일 확인
2. `VITE_GITHUB_PAT=ghp_xxxxx` 추가
3. 개발 서버 재시작

### 에러: "GitHub Actions 트리거 실패: 401 Unauthorized"
**원인**: 토큰이 만료되었거나 권한이 부족

**해결**:
1. GitHub에서 새 토큰 생성
2. `repo` 권한 확인
3. `.env` 파일 업데이트

### 에러: "GitHub Actions 트리거 실패: 403 Forbidden"
**원인**: 리포지토리 접근 권한 없음

**해결**:
1. 토큰 생성 시 올바른 GitHub 계정 사용 확인
2. 리포지토리 소유자 또는 관리자 권한 확인
3. 토큰의 `repo` 권한 재확인

### GitHub Actions가 실행되지 않음
**원인**: 워크플로우 파일 문제 또는 시크릿 누락

**해결**:
1. `.github/workflows/generate-crawler-ai.yml` 파일 확인
2. GitHub Settings → Actions → General에서 워크플로우 활성화 확인
3. 모든 필수 시크릿 설정 확인

## 7. 추가 정보

### GitHub API 제한
- **인증된 요청**: 5,000 requests/hour
- **비인증 요청**: 60 requests/hour

AI 크롤러 생성 버튼은 인증된 요청을 사용하므로 충분한 한도를 가집니다.

### 토큰 관리
- 토큰 목록 확인: https://github.com/settings/tokens
- 사용하지 않는 토큰은 **"Delete"** 버튼으로 삭제
- 토큰 만료 30일 전에 이메일 알림 수신

### 참고 문서
- [GitHub Personal Access Tokens 공식 문서](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token)
- [GitHub Actions repository_dispatch 이벤트](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#repository_dispatch)
