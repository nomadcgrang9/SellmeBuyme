# 카카오톡 로그인 구현 계획

## 📋 현재 상태 분석

### ✅ 이미 구현된 부분

1. **UI 컴포넌트** ([SocialSignupModal.tsx](src/components/auth/SocialSignupModal.tsx))
   - 카카오 버튼 UI 준비 완료 (Line 34-43)
   - 아이콘: `IconMessageCircle`
   - 색상: `bg-[#FFF4D6] text-[#3C1E1E]` (카카오 노란색 스타일)
   - **문제**: login 모드에서 카카오가 필터링됨 (Line 74-76)

2. **OAuth 로직** ([Header.tsx](src/components/layout/Header.tsx))
   - `signInWithOAuth` 구현 완료 (Line 137-143)
   - 카카오 전용 쿼리 파라미터: `{ prompt: 'login' }` (Line 141)
   - redirectTo 설정 완료

3. **콜백 처리** ([AuthCallback.tsx](src/pages/AuthCallback.tsx))
   - OAuth 콜백 처리 로직 완료
   - code exchange 처리 (Line 29-37)
   - 프로필 확인 및 생성 플로우 (Line 69-80)

### ❌ 구현 필요 부분

1. **Supabase 설정**
   - 카카오 OAuth Provider 활성화 필요
   - Client ID, Client Secret 등록
   - Redirect URL 설정

2. **카카오 개발자 콘솔 설정**
   - 카카오 애플리케이션 생성
   - OAuth Redirect URI 등록
   - 동의 항목 설정 (이메일, 프로필 정보)

3. **프론트엔드 수정**
   - SocialSignupModal의 login 모드 필터 제거 또는 수정

---

## 🎯 구현 단계

### Phase 1: 카카오 개발자 콘솔 설정 (필수 사전 작업)

#### 1-1. 카카오 애플리케이션 생성
1. [카카오 개발자 콘솔](https://developers.kakao.com/) 접속
2. 내 애플리케이션 > 애플리케이션 추가하기
3. 앱 이름: "셀미바이미" 또는 "SellmeBuyme"
4. 사업자명: (해당되는 경우)

#### 1-2. 플랫폼 설정
1. 내 애플리케이션 > 앱 설정 > 플랫폼
2. Web 플랫폼 등록
   - 사이트 도메인:
     - `http://localhost:5173` (개발)
     - `https://yourdomain.com` (프로덕션)

#### 1-3. Kakao Login 설정
1. 제품 설정 > 카카오 로그인
2. 카카오 로그인 활성화: ON
3. Redirect URI 등록:
   ```
   http://localhost:5173/auth/callback
   https://yourdomain.com/auth/callback
   ```

#### 1-4. 동의 항목 설정
1. 제품 설정 > 카카오 로그인 > 동의 항목
2. 필수 동의 항목:
   - 닉네임 (필수)
   - 이메일 (필수)
3. 선택 동의 항목:
   - 프로필 사진 (선택)

#### 1-5. 앱 키 확보
1. 내 애플리케이션 > 앱 설정 > 요약 정보
2. 저장할 정보:
   - **REST API 키** (Client ID로 사용)
   - **JavaScript 키** (웹 SDK용)
3. 내 애플리케이션 > 제품 설정 > 카카오 로그인 > 보안
4. **Client Secret** 생성:
   - Client Secret > 코드 생성 클릭
   - 생성된 키 저장 (한 번만 보임!)

---

### Phase 2: Supabase 설정

#### 2-1. Kakao OAuth Provider 활성화

**방법 1: Supabase Dashboard UI**
1. [Supabase Dashboard](https://supabase.com/dashboard) 접속
2. 프로젝트 선택
3. Authentication > Providers > Kakao
4. Enable 토글 ON
5. 다음 정보 입력:
   - **Client ID**: 카카오 REST API 키
   - **Client Secret**: 카카오에서 생성한 Client Secret
   - **Redirect URL** 확인:
     - `https://<project-ref>.supabase.co/auth/v1/callback`
     - 이 URL을 카카오 개발자 콘솔에도 추가 등록

**방법 2: Supabase Management API** (선택사항)
```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

# Configure Kakao auth provider
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "external_kakao_enabled": true,
    "external_kakao_client_id": "your-kakao-rest-api-key",
    "external_kakao_secret": "your-kakao-client-secret"
  }'
```

#### 2-2. Redirect URLs 설정 확인
1. Authentication > URL Configuration
2. Site URL 확인:
   - 개발: `http://localhost:5173`
   - 프로덕션: `https://yourdomain.com`
3. Redirect URLs에 다음 추가:
   ```
   http://localhost:5173/auth/callback
   https://yourdomain.com/auth/callback
   ```

---

### Phase 3: 프론트엔드 코드 수정

#### 3-1. SocialSignupModal 수정

**파일**: `src/components/auth/SocialSignupModal.tsx`

**현재 코드** (Line 74-76):
```typescript
const availableProviderConfigs = mode === 'login'
  ? providerConfigs.filter(({ id }) => id === 'google')
  : providerConfigs;
```

**수정 방안 A: 로그인 모드에서도 카카오 표시 (권장)**
```typescript
const availableProviderConfigs = providerConfigs; // 모든 프로바이더 표시
```

**수정 방안 B: 카카오만 점진적으로 활성화**
```typescript
const availableProviderConfigs = mode === 'login'
  ? providerConfigs.filter(({ id }) => id === 'google' || id === 'kakao') // 구글 + 카카오
  : providerConfigs;
```

**수정 방안 C: 환경변수로 제어 (유연성 최대)**
```typescript
// .env에 추가
VITE_ENABLE_KAKAO_LOGIN=true

// SocialSignupModal.tsx
const availableProviderConfigs = mode === 'login'
  ? providerConfigs.filter(({ id }) => {
      if (id === 'google') return true;
      if (id === 'kakao' && import.meta.env.VITE_ENABLE_KAKAO_LOGIN === 'true') return true;
      return false;
    })
  : providerConfigs;
```

#### 3-2. Header.tsx 확인 (수정 불필요)

현재 코드가 이미 카카오를 지원하고 있음:
```typescript
const { error } = await supabase.auth.signInWithOAuth({
  provider,
  options: {
    redirectTo,
    queryParams: provider === 'kakao' ? { prompt: 'login' } : undefined
  } as Record<string, unknown>
});
```

---

### Phase 4: 테스트 및 검증

#### 4-1. 로컬 개발 환경 테스트
1. `npm run dev` 실행
2. 회원가입 버튼 클릭
3. "카카오톡으로 가입하기" 버튼 클릭
4. 카카오 로그인 페이지로 리다이렉트 확인
5. 로그인 후 `/auth/callback`으로 돌아오는지 확인
6. 프로필 설정 모달이 뜨는지 확인 (신규 사용자)
7. 로그아웃 후 "로그인" 버튼 클릭
8. "카카오톡으로 로그인하기" 버튼 클릭
9. 기존 사용자 로그인 확인

#### 4-2. 에러 케이스 테스트
- [ ] 카카오 로그인 취소 (사용자가 취소 버튼 클릭)
- [ ] 동의 항목 거부
- [ ] 네트워크 오류
- [ ] 잘못된 Redirect URL

#### 4-3. 프로덕션 배포 전 체크리스트
- [ ] 카카오 개발자 콘솔에 프로덕션 도메인 등록
- [ ] Supabase Redirect URLs에 프로덕션 URL 추가
- [ ] 환경변수 확인 (프로덕션 환경)
- [ ] SSL 인증서 확인 (HTTPS 필수)

---

## 🔧 기술 스택 요약

### Supabase Auth (OAuth 2.0)
- **Provider**: `kakao`
- **Flow**: Authorization Code Grant with PKCE
- **Method**: `supabase.auth.signInWithOAuth({ provider: 'kakao' })`

### Kakao OAuth API
- **Authorization Endpoint**: `https://kauth.kakao.com/oauth/authorize`
- **Token Endpoint**: `https://kauth.kakao.com/oauth/token`
- **User Info Endpoint**: `https://kapi.kakao.com/v2/user/me`

### Context7 참고 문서
- Supabase Kakao OAuth: `/supabase/supabase`
- 주요 메서드:
  ```typescript
  await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: 'http://localhost:5173/auth/callback',
      queryParams: { prompt: 'login' }
    }
  })
  ```

---

## 📝 추가 고려사항

### 1. 사용자 경험 (UX)
- 카카오 로그인 버튼 색상이 카카오 브랜드 가이드라인에 맞는지 확인
- 로딩 상태 표시 ("연결 중..." 텍스트)
- 에러 메시지 한글화

### 2. 보안
- Client Secret은 절대 프론트엔드에 노출되지 않음 (Supabase가 서버 측에서 처리)
- HTTPS 사용 필수 (프로덕션)
- PKCE 자동 적용 (Supabase Auth가 처리)

### 3. 데이터 매핑
카카오에서 받는 사용자 정보:
- `email`: 이메일 (동의 시)
- `nickname`: 닉네임
- `profile_image`: 프로필 사진 URL (동의 시)

Supabase `auth.users` 테이블 매핑:
- `email` → `auth.users.email`
- `user_metadata.full_name` → 카카오 닉네임
- `user_metadata.avatar_url` → 카카오 프로필 사진
- `app_metadata.provider` → 'kakao'

### 4. 프로필 설정 플로우
현재 구현 (AuthCallback.tsx:69-80):
1. OAuth 로그인 완료 후 `fetchUserProfile(userId)` 호출
2. 프로필 없으면 → `sessionStorage.setItem('profileSetupPending', 'true')`
3. 홈으로 리다이렉트 → ProfileSetupModal 자동 표시

**카카오 로그인 시 자동 채우기 가능 항목:**
- 프로필 사진 (카카오 제공)
- 닉네임 초기값 (카카오 닉네임)

---

## 🚀 빠른 시작 가이드

### 최소 구현 (5단계)

1. **카카오 앱 생성** → REST API 키 + Client Secret 확보
2. **Supabase Dashboard** → Kakao Provider 활성화 + 키 입력
3. **Redirect URL 등록** (양쪽 다):
   - 카카오: `http://localhost:5173/auth/callback`
   - Supabase: 동일
4. **코드 수정**: `SocialSignupModal.tsx:74-76` 필터 제거
5. **테스트**: 로컬에서 카카오 로그인 시도

---

## 📚 참고 자료

- [Supabase Kakao OAuth 공식 문서](https://supabase.com/docs/guides/auth/social-login/auth-kakao)
- [카카오 개발자 문서 - 카카오 로그인](https://developers.kakao.com/docs/latest/ko/kakaologin/common)
- [Supabase Auth JavaScript Client](https://supabase.com/docs/reference/javascript/auth-signinwithoauth)

---

## ⚠️ 주의사항

1. **Client Secret 보안**
   - `.env` 파일에 절대 커밋하지 말 것
   - Supabase Dashboard에서만 설정
   - 프론트엔드 코드에 노출 금지

2. **Redirect URL 일치**
   - 카카오 개발자 콘솔과 Supabase 설정이 **완전히 동일**해야 함
   - 슬래시(`/`) 유무까지 정확히 일치

3. **동의 항목**
   - 이메일을 필수로 설정하지 않으면 사용자 식별 어려움
   - 필수 동의 항목 변경 시 기존 사용자 재인증 필요할 수 있음

4. **테스트 계정**
   - 카카오 개발자 콘솔에서 테스트 계정 등록 가능
   - 앱 검수 전까지는 테스트 계정만 로그인 가능

---

## 🎬 다음 단계

계획 검토 후:
1. 카카오 개발자 콘솔 접속 및 앱 생성
2. Supabase Dashboard에서 Kakao Provider 설정
3. 프론트엔드 코드 수정 (SocialSignupModal)
4. 로컬 테스트
5. 프로덕션 배포

---

**작성일**: 2025-11-05
**작성자**: Claude Code
**프로젝트**: 셀미바이미 (SellmeBuyme)
