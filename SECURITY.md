# 🔒 관리자 페이지 보안 강화 계획

**프로젝트**: SellmeBuyme
**작성일**: 2025-10-25
**상태**: 계획 수립 완료, 구현 대기 중

---

## 📋 목차

1. [현재 보안 문제점](#-현재-보안-문제점)
2. [VITE_ 환경변수의 한계](#-vite_-환경변수의-한계)
3. [teacherspot 보안 전략 분석](#-teacherspot-보안-전략-분석)
4. [최종 보안 강화 방안](#-최종-보안-강화-방안)
5. [구현 계획](#-구현-계획)
6. [환경변수 구조](#-환경변수-구조)
7. [보안 검증 체크리스트](#-보안-검증-체크리스트)
8. [추가 보안 옵션](#-추가-보안-옵션)

---

## 🚨 현재 보안 문제점

### 1. 예측 가능한 URL
```
현재 관리자 페이지: http://localhost:5173/admin
                    https://sellmebuyme.pages.dev/admin
```
- ❌ 누구나 URL을 알 수 있음
- ❌ `/admin`은 가장 흔한 관리자 경로
- ❌ 브루트포스 공격에 취약

### 2. 인증 체크 부재
```typescript
// main.tsx (현재)
if (pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />  // ← 인증 없이 바로 렌더링!
}
```
- ❌ 로그인 체크 없음
- ❌ 관리자 권한 체크 없음
- ❌ 누구나 접속 가능

### 3. 클라이언트 사이드 라우팅
- ❌ 브라우저에서 라우팅 처리
- ❌ JavaScript 번들에 `/admin` 경로 노출
- ❌ 개발자 도구로 쉽게 확인 가능

### 4. useAdminAuth 훅 미사용
```typescript
// src/lib/hooks/useAdminAuth.ts 존재하지만 사용 안 함
export function useAdminAuth() {
  // 관리자 권한 체크 로직 구현되어 있음
  // 하지만 AdminPage에서 사용하지 않음
}
```

---

## ⚠️ VITE_ 환경변수의 한계

### 잘못된 접근 방식 ❌

```bash
# .env 파일
VITE_ADMIN_PATH=/dashboard-x7k9m2p  # ← 이렇게 하면?
```

```typescript
// main.tsx
const adminPath = import.meta.env.VITE_ADMIN_PATH  // "/dashboard-x7k9m2p"

if (pathname.startsWith(adminPath)) {
  rootComponent = <AdminPage />
}
```

### 문제점

**Vite는 `VITE_` 프리픽스가 붙은 모든 환경변수를 브라우저 번들에 포함시킵니다.**

```javascript
// 빌드 후 번들 파일 (dist/assets/index-abc123.js)
const adminPath = "/dashboard-x7k9m2p"  // ← 누구나 볼 수 있음!
```

**검증 방법**:
1. Chrome 개발자도구 → Sources 탭
2. dist/assets/index-*.js 파일 열기
3. `dashboard-x7k9m2p` 검색 → 찾아짐!

**결론**: VITE_ 환경변수는 보안 수단이 아닙니다! ⛔

---

## 💡 teacherspot 보안 전략 분석

### 핵심 패턴: 환경 분기 처리

teacherspot 프로젝트의 API 키 보호 전략을 관리자 페이지 보안에 응용합니다.

```javascript
// teacherspot의 aiChatService.js
const isLocalDev = import.meta.env.DEV && import.meta.env.VITE_GEMINI_API_KEY

if (isLocalDev) {
  // ✅ 로컬: 직접 API 호출 (개인 컴퓨터라 안전)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  fetch(`https://api.google.com/...?key=${apiKey}`)
} else {
  // ✅ 프로덕션: Cloudflare Functions 우회 (서버에서 처리)
  fetch('/api/gemini-chat', { ... })
}
```

### teacherspot의 Cloudflare Functions

```javascript
// functions/api/gemini-chat.js
export async function onRequest(context) {
  const apiKey = context.env.GEMINI_API_KEY  // ← 서버 환경 변수 (VITE_ 없음!)
  // API 호출 후 결과만 반환
  // 브라우저에서 API 키 절대 노출 안 됨!
}
```

### 핵심 교훈 3가지

1. **VITE_ 환경변수 ≠ 보안**
   - 번들에 노출되므로 보안 수단 아님
   - 공개되어도 괜찮은 정보만 사용

2. **서버사이드 처리 = 진짜 보안**
   - Cloudflare Functions (teacherspot)
   - Supabase Edge Functions (SellmeBuyme 가능)
   - 민감 정보는 서버에만

3. **환경 분기로 두 마리 토끼**
   - 로컬: 편의성 (VITE_ 사용 OK)
   - 프로덕션: 보안 (서버사이드)

---

## 🎯 최종 보안 강화 방안

### 핵심 전략: Cloudflare Functions 동적 라우팅

**SellmeBuyme는 Cloudflare Pages에 배포**되므로 Cloudflare Functions를 사용할 수 있습니다.

### 아키텍처

```
사용자 요청
    ↓
Cloudflare Functions (서버사이드)
    ↓
1. URL 체크 (환경변수와 비교)
    ↓
2. 인증 체크 (Supabase Auth)
    ↓
3. 이메일 검증 (ADMIN_EMAIL)
    ↓
4. 역할 검증 (user_profiles.roles)
    ↓
✅ 모두 통과 → AdminPage HTML 반환
❌ 실패 → 403 / 로그인 페이지
```

### 보안 강화 효과

| 항목 | 클라이언트 라우팅 (현재) | 서버사이드 라우팅 (개선) |
|------|------------------------|------------------------|
| **URL 노출** | ❌ 번들에 노출 | ✅ 서버만 알고 있음 |
| **환경변수** | `VITE_ADMIN_PATH` (공개) | `ADMIN_PATH` (비공개) |
| **인증 체크** | ❌ 없음 | ✅ 서버사이드 검증 |
| **우회 가능성** | ❌ 쉽게 우회 | ✅ 우회 불가능 |
| **보안 강도** | ⭐⭐☆☆☆ | ⭐⭐⭐⭐⭐ |
| **URL 변경** | 코드 수정 필요 | 환경변수만 변경 |

---

## 🚀 구현 계획

### Phase 1: Cloudflare Functions 생성

#### 1.1 파일 구조

```
functions/
├── [[admin]].js          # 동적 라우팅 (모든 경로 캐치)
└── api/
    └── admin-check.js    # API 전용 (선택사항)
```

#### 1.2 `functions/[[admin]].js` 구현

```javascript
/**
 * Cloudflare Functions: 관리자 페이지 서버사이드 라우팅
 *
 * [[admin]].js → 모든 경로를 캐치하는 동적 라우팅
 * 예: /console-2025-secure, /dashboard-x7k9 등
 */

export async function onRequest(context) {
  const url = new URL(context.request.url)
  const pathname = url.pathname

  // 서버 환경변수에서 관리자 경로 가져오기 (브라우저에 노출 안 됨!)
  const ADMIN_PATH = context.env.ADMIN_PATH || '/admin'
  const ADMIN_EMAIL = context.env.ADMIN_EMAIL

  console.log(`요청 경로: ${pathname}, 관리자 경로: ${ADMIN_PATH}`)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1단계: URL 체크 (서버사이드)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!pathname.startsWith(ADMIN_PATH)) {
    // 관리자 경로가 아니면 일반 페이지로 전달
    return context.next()
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2단계: 인증 체크
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const authHeader = context.request.headers.get('Cookie')
  const accessToken = extractToken(authHeader)  // 쿠키에서 토큰 추출

  if (!accessToken) {
    // 로그인 안 됨 → 로그인 페이지로 리다이렉트
    return Response.redirect(
      url.origin + '/?login=required&redirect=' + encodeURIComponent(pathname),
      302
    )
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3단계: Supabase Auth 검증
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const user = await verifySupabaseToken(
    accessToken,
    context.env.SUPABASE_URL,
    context.env.SUPABASE_ANON_KEY
  )

  if (!user) {
    return new Response('Unauthorized: Invalid token', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4단계: 이메일 검증
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (user.email !== ADMIN_EMAIL) {
    return new Response('Forbidden: Admin only', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5단계: 역할 검증 (user_profiles 테이블 조회)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const profile = await fetchUserProfile(user.id, context.env)

  if (!profile?.roles?.includes('admin')) {
    return new Response('Forbidden: Admin role required', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // ✅ 모든 체크 통과! AdminPage HTML 반환
  console.log(`✅ 관리자 인증 성공: ${user.email}`)
  return context.next()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 헬퍼 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 쿠키에서 Supabase 액세스 토큰 추출
 */
function extractToken(cookieHeader) {
  if (!cookieHeader) return null

  // Supabase는 여러 쿠키 형식 사용 가능
  const patterns = [
    /sb-access-token=([^;]+)/,
    /sb-[^-]+-auth-token=([^;]+)/
  ]

  for (const pattern of patterns) {
    const match = cookieHeader.match(pattern)
    if (match) return match[1]
  }

  return null
}

/**
 * Supabase Auth 토큰 검증
 */
async function verifySupabaseToken(token, supabaseUrl, anonKey) {
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': anonKey
      }
    })

    if (!response.ok) {
      console.error('토큰 검증 실패:', response.status)
      return null
    }

    return await response.json()
  } catch (error) {
    console.error('토큰 검증 오류:', error)
    return null
  }
}

/**
 * 사용자 프로필 조회 (user_profiles 테이블)
 */
async function fetchUserProfile(userId, env) {
  try {
    const response = await fetch(
      `${env.SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.${userId}&select=*`,
      {
        headers: {
          'apikey': env.SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${env.SUPABASE_ANON_KEY}`
        }
      }
    )

    if (!response.ok) {
      console.error('프로필 조회 실패:', response.status)
      return null
    }

    const data = await response.json()
    return data[0] || null
  } catch (error) {
    console.error('프로필 조회 오류:', error)
    return null
  }
}
```

---

### Phase 2: main.tsx 수정

```typescript
// src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import AdminPage from './pages/AdminPage'
import AuthCallback from './pages/AuthCallback'
import './index.css'

const pathname = window.location.pathname

let rootComponent = <App />

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 주의: 관리자 경로는 더 이상 클라이언트에서 체크하지 않음!
// Cloudflare Functions에서 모든 체크 처리
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// 로컬 개발 환경에서만 /admin 접근 허용
if (import.meta.env.DEV && pathname.startsWith('/admin')) {
  rootComponent = <AdminPage />
}
// 프로덕션: Cloudflare Functions가 처리하므로 별도 체크 불필요
// 단, AdminPage 컴포넌트는 번들에 포함되어야 함

else if (pathname.startsWith('/auth/callback')) {
  rootComponent = <AuthCallback />
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {rootComponent}
  </React.StrictMode>,
)
```

---

### Phase 3: AdminPage 보안 강화

```typescript
// src/pages/AdminPage.tsx

import { useEffect } from 'react'
import { useAdminAuth } from '@/lib/hooks/useAdminAuth'
import { useAuthStore } from '@/stores/authStore'

export default function AdminPage() {
  const { isAdmin, isLoading, user } = useAdminAuth()
  const { initialize } = useAuthStore()

  useEffect(() => {
    void initialize()
  }, [initialize])

  // 로딩 중
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-gray-600">권한 확인 중...</p>
        </div>
      </div>
    )
  }

  // 로그인 안 됨
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔒</div>
          <h1 className="text-2xl font-bold mb-2">로그인이 필요합니다</h1>
          <p className="text-gray-600 mb-4">관리자 페이지는 로그인 후 이용 가능합니다.</p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // 관리자 권한 없음
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🚫</div>
          <h1 className="text-2xl font-bold mb-2">접근 권한이 없습니다</h1>
          <p className="text-gray-600 mb-4">
            관리자 권한이 필요합니다.
            <br />
            현재 계정: {user.email}
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // ✅ 모든 체크 통과 - 기존 AdminPage 렌더링
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 기존 AdminPage 내용 */}
      {/* ... */}
    </div>
  )
}
```

---

## 🔐 환경변수 구조

### 로컬 개발 환경 (`.env`)

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 클라이언트용 (VITE_ 프리픽스 필요, 공개 OK)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_SUPABASE_URL=https://qpwnsvsiduvvqdijyxio.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 서버용 (Cloudflare Functions, VITE_ 없음!)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN_PATH=/admin                          # 로컬은 단순하게
ADMIN_EMAIL=l30417305@gmail.com
SUPABASE_URL=https://qpwnsvsiduvvqdijyxio.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 기타
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GEMINI_API_KEY=AIzaSyCF8kwWLkECabDKb28UwZnUjnlW0WgHP3U
```

### Cloudflare Pages 환경변수 (프로덕션)

Cloudflare Dashboard → Pages → SellmeBuyme → Settings → Environment variables

#### Production 환경에 추가:

```bash
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 관리자 페이지 (VITE_ 없음! 서버 전용)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ADMIN_PATH=/console-2025-secure-x7k9m2p    # 복잡하고 추측 불가능한 경로
ADMIN_EMAIL=l30417305@gmail.com

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Supabase (서버용, VITE_ 없음!)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SUPABASE_URL=https://qpwnsvsiduvvqdijyxio.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# 클라이언트용 (VITE_ 유지)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
VITE_SUPABASE_URL=https://qpwnsvsiduvvqdijyxio.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**중요 규칙**:
- ✅ Cloudflare Functions에서 사용하는 변수: `VITE_` 없음
- ✅ 클라이언트(브라우저)에서 사용하는 변수: `VITE_` 필요
- ✅ 민감한 정보(ADMIN_PATH, ADMIN_EMAIL): 서버 전용으로만

---

## 🔍 보안 검증 체크리스트

### 배포 후 필수 확인사항

#### 1. URL 노출 테스트 ✅
```bash
# 브라우저 개발자도구
1. Sources 탭 열기
2. dist/assets/index-*.js 파일 열기
3. 검색:
   - "admin" → 나오면 안 됨 ❌
   - "console-2025-secure" → 나오면 안 됨 ❌
   - ADMIN_PATH → 나오면 안 됨 ❌

✅ 예상 결과: 아무것도 찾을 수 없음
```

#### 2. 환경변수 노출 테스트 ✅
```bash
# 브라우저 콘솔
console.log(import.meta.env)

✅ 예상 결과:
{
  VITE_SUPABASE_URL: "...",
  VITE_SUPABASE_ANON_KEY: "...",
  // ADMIN_PATH 없어야 함!
  // ADMIN_EMAIL 없어야 함!
}
```

#### 3. 인증 우회 테스트 ❌
```bash
# 시나리오 1: 로그인 없이 접근
https://sellmebuyme.pages.dev/console-2025-secure-x7k9m2p

✅ 예상 결과: 로그인 페이지로 리다이렉트 또는 401 Unauthorized
```

```bash
# 시나리오 2: 일반 사용자로 접근
1. 일반 계정(admin 역할 없음)으로 로그인
2. /console-2025-secure-x7k9m2p 접근

✅ 예상 결과: 403 Forbidden
```

```bash
# 시나리오 3: 다른 이메일로 접근
1. admin 역할은 있지만 l30417305@gmail.com이 아닌 계정으로 로그인
2. /console-2025-secure-x7k9m2p 접근

✅ 예상 결과: 403 Forbidden
```

#### 4. 정상 접근 테스트 ✅
```bash
# 시나리오: 올바른 관리자 계정
1. l30417305@gmail.com으로 로그인
2. user_profiles.roles = ['admin']
3. /console-2025-secure-x7k9m2p 접근

✅ 예상 결과: 관리자 페이지 정상 표시
```

#### 5. Cloudflare Functions 로그 확인 ✅
```bash
Cloudflare Dashboard → Pages → SellmeBuyme → Functions → Logs

✅ 확인 사항:
- 요청 경로 로그
- 인증 성공/실패 로그
- 에러 발생 시 스택 트레이스
```

---

## 🛡️ 추가 보안 옵션

### Option 1: 시간 기반 동적 경로

매일 자동으로 관리자 URL이 변경됩니다.

```javascript
// functions/[[admin]].js
export async function onRequest(context) {
  // 오늘 날짜 기반 경로 생성
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const ADMIN_PATH_BASE = context.env.ADMIN_PATH_BASE || '/admin-'
  const ADMIN_PATH = ADMIN_PATH_BASE + today  // "/admin-20251025"

  console.log(`Today's admin path: ${ADMIN_PATH}`)

  if (!pathname.startsWith(ADMIN_PATH)) {
    return context.next()
  }

  // 나머지 인증 로직...
}
```

**환경변수**:
```bash
ADMIN_PATH_BASE=/console-
# 결과: /console-20251025 (매일 변경)
```

**장점**:
- ✅ 매일 자동으로 URL 변경
- ✅ 예측 불가능

**단점**:
- ❌ 관리자가 매일 새 URL 확인 필요
- ❌ 북마크 불가능

---

### Option 2: IP 화이트리스트

특정 IP에서만 접근 가능합니다.

```javascript
// functions/[[admin]].js
export async function onRequest(context) {
  // 1단계: IP 체크
  const allowedIPs = (context.env.ALLOWED_IPS || '').split(',')
  const clientIP = context.request.headers.get('CF-Connecting-IP')

  if (allowedIPs.length > 0 && !allowedIPs.includes(clientIP)) {
    console.warn(`차단된 IP에서 접근 시도: ${clientIP}`)
    return new Response('Forbidden: IP not allowed', { status: 403 })
  }

  // 2단계: URL 체크
  // 3단계: 인증 체크
  // ...
}
```

**환경변수**:
```bash
ALLOWED_IPS=123.456.789.0,111.222.333.444
```

**장점**:
- ✅ 추가 보안 레이어
- ✅ 알려진 IP만 허용

**단점**:
- ❌ 동적 IP 사용 시 불편
- ❌ VPN 사용 시 문제

---

### Option 3: 2FA (TOTP)

2단계 인증을 추가합니다.

```javascript
// functions/[[admin]].js
import { TOTP } from '@levminer/speakeasy'

export async function onRequest(context) {
  // 1-4단계: 기본 인증 통과 후

  // 5단계: 2FA 체크
  const totpToken = url.searchParams.get('totp')

  if (!totpToken) {
    return new Response('2FA token required', { status: 401 })
  }

  const verified = TOTP.verify({
    secret: context.env.TOTP_SECRET,
    token: totpToken,
    window: 1
  })

  if (!verified) {
    return new Response('Invalid 2FA token', { status: 401 })
  }

  // ✅ 2FA 통과
  return context.next()
}
```

**사용 방법**:
```
1. Google Authenticator 앱 설치
2. TOTP_SECRET 생성 및 등록
3. /console-2025-secure?totp=123456 형식으로 접근
```

**장점**:
- ✅ 최고 수준 보안
- ✅ 비밀번호 유출되어도 안전

**단점**:
- ❌ 사용 불편
- ❌ 추가 앱 필요

---

### Option 4: Rate Limiting

무차별 대입 공격을 방어합니다.

```javascript
// functions/[[admin]].js
const attemptCache = new Map()  // IP별 접근 시도 횟수

export async function onRequest(context) {
  const clientIP = context.request.headers.get('CF-Connecting-IP')
  const now = Date.now()

  // 1분 내 접근 시도 횟수 체크
  const attempts = attemptCache.get(clientIP) || []
  const recentAttempts = attempts.filter(time => now - time < 60000)

  if (recentAttempts.length >= 5) {
    console.warn(`Rate limit exceeded: ${clientIP}`)
    return new Response('Too many requests', { status: 429 })
  }

  // 접근 시도 기록
  attemptCache.set(clientIP, [...recentAttempts, now])

  // 나머지 인증 로직...
}
```

**효과**:
- ✅ 1분에 5회 이상 접근 시 차단
- ✅ 무차별 대입 공격 방어

---

### Option 5: 접근 로그 기록

모든 접근 시도를 Supabase에 기록합니다.

```javascript
// functions/[[admin]].js
async function logAccessAttempt(context, user, success, reason) {
  const { data, error } = await fetch(
    `${context.env.SUPABASE_URL}/rest/v1/admin_access_logs`,
    {
      method: 'POST',
      headers: {
        'apikey': context.env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${context.env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_email: user?.email,
        ip_address: context.request.headers.get('CF-Connecting-IP'),
        user_agent: context.request.headers.get('User-Agent'),
        success: success,
        reason: reason,
        timestamp: new Date().toISOString()
      })
    }
  )
}

export async function onRequest(context) {
  try {
    // 인증 로직...

    if (success) {
      await logAccessAttempt(context, user, true, 'Authenticated')
    }
  } catch (error) {
    await logAccessAttempt(context, null, false, error.message)
  }
}
```

**Supabase 테이블**:
```sql
CREATE TABLE admin_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT,
  ip_address TEXT,
  user_agent TEXT,
  success BOOLEAN,
  reason TEXT,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 📝 구현 단계별 체크리스트

### ✅ Phase 1: 준비 단계

- [ ] `functions/` 폴더 생성
- [ ] `functions/[[admin]].js` 파일 작성
- [ ] `.env` 파일에 `ADMIN_PATH`, `ADMIN_EMAIL` 추가
- [ ] `.gitignore`에 `.env` 포함 확인

### ✅ Phase 2: 코드 수정

- [ ] `src/main.tsx` 수정 (로컬 개발 분기 처리)
- [ ] `src/pages/AdminPage.tsx` 보안 강화 (useAdminAuth 사용)
- [ ] `src/lib/hooks/useAdminAuth.ts` 검토 및 테스트

### ✅ Phase 3: 로컬 테스트

- [ ] Wrangler 설치: `npm install -g wrangler`
- [ ] 로컬 Functions 테스트: `wrangler pages dev dist`
- [ ] `/admin` 접근 테스트
- [ ] 인증 체크 동작 확인

### ✅ Phase 4: Cloudflare 환경변수 설정

- [ ] Cloudflare Dashboard 로그인
- [ ] Pages → SellmeBuyme → Settings → Environment variables
- [ ] Production 환경에 변수 추가:
  - `ADMIN_PATH=/console-2025-secure-x7k9m2p`
  - `ADMIN_EMAIL=l30417305@gmail.com`
  - `SUPABASE_URL=...`
  - `SUPABASE_ANON_KEY=...`

### ✅ Phase 5: 배포

- [ ] Git 커밋: `git add . && git commit -m "feat: 관리자 페이지 보안 강화"`
- [ ] Git 푸시: `git push`
- [ ] Cloudflare Pages 자동 배포 확인
- [ ] 배포 로그 확인

### ✅ Phase 6: 검증

- [ ] 브라우저 번들에서 URL 노출 확인 (없어야 함)
- [ ] 로그인 없이 접근 → 리다이렉트 확인
- [ ] 일반 사용자로 접근 → 403 확인
- [ ] 관리자 계정으로 접근 → 정상 확인
- [ ] Cloudflare Functions 로그 확인

---

## 🚨 문제 해결 가이드

### 오류 1: "404 Not Found" - Functions가 실행 안 됨

**원인**: `functions/` 폴더가 제대로 배포되지 않음

**해결**:
1. Git에 `functions/` 폴더 커밋 확인
2. Cloudflare Pages 빌드 로그 확인
3. `functions/[[admin]].js` 파일명 확인 (대괄호 2개!)

---

### 오류 2: "환경 변수가 정의되지 않음"

**원인**: Cloudflare 환경 변수 설정 안 됨

**해결**:
1. Cloudflare Dashboard → Pages → Settings → Environment variables
2. Production 환경 선택
3. `ADMIN_PATH`, `ADMIN_EMAIL` 추가
4. 변경 후 재배포 (Deployments → Retry deployment)

---

### 오류 3: "Unauthorized" - 토큰 검증 실패

**원인**: Supabase 쿠키 형식 문제

**해결**:
```javascript
// extractToken 함수 디버깅
function extractToken(cookieHeader) {
  console.log('Cookie header:', cookieHeader)
  // 쿠키 형식 확인 후 패턴 조정
}
```

---

### 오류 4: CORS 오류

**원인**: Cloudflare Functions CORS 헤더 누락

**해결**:
```javascript
// functions/[[admin]].js
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  })
}
```

---

## 📚 참고 자료

### Cloudflare Pages Functions
- [공식 문서](https://developers.cloudflare.com/pages/platform/functions/)
- [동적 라우팅](https://developers.cloudflare.com/pages/platform/functions/routing/)
- [환경 변수](https://developers.cloudflare.com/pages/platform/functions/bindings/)

### Supabase Auth
- [Auth API](https://supabase.com/docs/reference/javascript/auth-api)
- [서버사이드 렌더링](https://supabase.com/docs/guides/auth/server-side-rendering)

### 보안 베스트 프랙티스
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security](https://developers.cloudflare.com/fundamentals/security/)

---

## 📊 보안 레벨 비교

| 보안 레벨 | 구현 방법 | 보안 강도 | 구현 난이도 | 추천 |
|----------|----------|----------|------------|------|
| **Level 0** | 현재 상태 (인증 없음) | ⭐☆☆☆☆ | - | ❌ |
| **Level 1** | 클라이언트 체크만 | ⭐⭐☆☆☆ | 쉬움 | ❌ |
| **Level 2** | VITE_ 환경변수 사용 | ⭐⭐☆☆☆ | 쉬움 | ❌ |
| **Level 3** | Cloudflare Functions 기본 | ⭐⭐⭐⭐☆ | 중간 | ✅ |
| **Level 4** | Functions + 이메일 검증 | ⭐⭐⭐⭐⭐ | 중간 | ✅✅ |
| **Level 5** | Level 4 + IP 화이트리스트 | ⭐⭐⭐⭐⭐ | 중간 | ⭐ |
| **Level 6** | Level 4 + 2FA | ⭐⭐⭐⭐⭐ | 어려움 | ⭐⭐ |

**추천**: Level 4 (Cloudflare Functions + 이메일 검증)

---

## 🎯 최종 요약

### 핵심 원칙

1. **VITE_ 환경변수는 보안 수단이 아닙니다**
   - 브라우저 번들에 노출됨
   - 공개되어도 괜찮은 정보만 사용

2. **진짜 보안은 서버사이드에서만 가능합니다**
   - Cloudflare Functions 활용
   - 민감 정보는 서버 환경변수로만

3. **다층 방어 전략**
   - URL 난독화 (서버사이드)
   - 인증 체크 (Supabase Auth)
   - 이메일 검증 (ADMIN_EMAIL)
   - 역할 검증 (user_profiles.roles)

### 구현 후 보안 효과

- ✅ URL 노출 방지 (서버 환경변수로만 관리)
- ✅ 무단 접근 차단 (3단계 인증)
- ✅ 관리자 전용 접근 (이메일 + 역할 검증)
- ✅ 유연한 URL 관리 (환경변수만 변경)
- ✅ 접근 로그 기록 (선택사항)

---

**작업 상태**: ✅ 계획 수립 완료
**다음 단계**: Phase 1 구현 시작

**문의**: 구현 중 문제 발생 시 이 문서의 "문제 해결 가이드" 참고
