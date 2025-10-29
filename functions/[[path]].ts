/**
 * Cloudflare Functions: 관리자 페이지 서버사이드 라우팅
 *
 * [[path]].ts → 모든 경로를 캐치하는 동적 라우팅 (TypeScript)
 * 예: /console-2025-secure, /dashboard-x7k9, /admin-portal 등
 */

// 환경변수 타입 정의
interface Env {
  ADMIN_PATH?: string;
  ADMIN_EMAIL?: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
}

// Supabase User 타입 정의
interface SupabaseUser {
  id: string;
  email: string;
  [key: string]: any;
}

// User Profile 타입 정의
interface UserProfile {
  user_id: string;
  roles?: string[];
  [key: string]: any;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const pathname = url.pathname

  // 서버 환경변수에서 관리자 경로 가져오기 (브라우저에 노출 안 됨!)
  const ADMIN_PATH = context.env.ADMIN_PATH || '/admin'
  const ADMIN_EMAIL = context.env.ADMIN_EMAIL

  console.log(`요청 경로: ${pathname}, 관리자 경로: ${ADMIN_PATH}`)

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 고정 진입점 체크: /admin-portal (프로필 모달 버튼용)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (pathname === '/admin-portal') {
    console.log('관리자 포털 진입점 감지')

    // 인증 체크
    const user = await verifyAuthentication(context)
    if (!user) {
      console.warn('인증 실패: 로그인 필요')
      return Response.redirect(url.origin + '/?error=login_required', 302)
    }

    // 이메일 검증
    if (user.email !== ADMIN_EMAIL) {
      console.warn(`이메일 불일치: ${user.email} !== ${ADMIN_EMAIL}`)
      return Response.redirect(url.origin + '/?error=unauthorized', 302)
    }

    // 역할 검증
    const profile = await fetchUserProfile(user.id, context.env)
    if (!profile?.roles?.includes('admin')) {
      console.warn(`역할 없음: ${user.email}의 roles = ${profile?.roles}`)
      return Response.redirect(url.origin + '/?error=forbidden', 302)
    }

    // ✅ 인증 성공 → 실제 관리자 경로로 리다이렉트
    console.log(`✅ 관리자 인증 성공: ${user.email} → ${ADMIN_PATH}`)
    return Response.redirect(url.origin + ADMIN_PATH, 302)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 정적 파일 처리 (assets, fonts, icons 등)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const staticPaths = ['/assets/', '/fonts/', '/pwa-icons/', '/favicon.ico', '/manifest.webmanifest', '/sw.js', '/workbox-']
  if (staticPaths.some(prefix => pathname.startsWith(prefix))) {
    return context.next()
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 실제 관리자 경로 체크 (서버사이드)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!pathname.startsWith(ADMIN_PATH)) {
    // 관리자 경로가 아니면 SPA fallback (context.next 사용)
    // 이렇게 해야 /note 같은 클라이언트 라우팅이 작동함
    return context.next()
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2단계: 인증 체크
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const authHeader = context.request.headers.get('Cookie')
  const accessToken = extractToken(authHeader)  // 쿠키에서 토큰 추출

  if (!accessToken) {
    // 로그인 안 됨 → 로그인 페이지로 리다이렉트
    console.warn('토큰 없음: 로그인 페이지로 리다이렉트')
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
    console.error('토큰 검증 실패')
    return new Response('Unauthorized: Invalid token', {
      status: 401,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4단계: 이메일 검증
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (user.email !== ADMIN_EMAIL) {
    console.warn(`이메일 불일치: ${user.email} !== ${ADMIN_EMAIL}`)
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
    console.warn(`역할 없음: ${user.email}의 roles = ${profile?.roles}`)
    return new Response('Forbidden: Admin role required', {
      status: 403,
      headers: { 'Content-Type': 'text/plain' }
    })
  }

  // ✅ 모든 체크 통과! AdminPage HTML 반환
  console.log(`✅ 관리자 인증 성공: ${user.email}`)
  // SPA fallback: context.next()를 사용하여 React 라우팅 활성화
  return context.next()
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 헬퍼 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * 쿠키에서 Supabase 액세스 토큰 추출
 */
function extractToken(cookieHeader: string | null): string | null {
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
async function verifySupabaseToken(
  token: string,
  supabaseUrl: string,
  anonKey: string
): Promise<SupabaseUser | null> {
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
async function fetchUserProfile(userId: string, env: Env): Promise<UserProfile | null> {
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

/**
 * 인증 체크 (재사용 가능한 함수)
 */
async function verifyAuthentication(context: EventContext<Env, any, any>): Promise<SupabaseUser | null> {
  const authHeader = context.request.headers.get('Cookie')
  const accessToken = extractToken(authHeader)

  if (!accessToken) return null

  return await verifySupabaseToken(
    accessToken,
    context.env.SUPABASE_URL,
    context.env.SUPABASE_ANON_KEY
  )
}
