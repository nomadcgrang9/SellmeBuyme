/**
 * Supabase Service Role Admin Client
 *
 * NOTE: 이 클라이언트는 SERVICE_ROLE_KEY를 사용하여 RLS 정책을 우회합니다.
 * 서버 사이드(Edge Functions, Node.js scripts)에서만 사용해야 합니다.
 * 절대 클라이언트 사이드(브라우저)에서 사용하면 안 됩니다!
 *
 * 사용 사례:
 * - 관리자 권한의 대량 삭제
 * - 데이터 마이그레이션
 * - 승인/승인취소 시 관련 데이터 정리
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// 환경변수 확인
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 유효성 검사
if (!supabaseUrl) {
  throw new Error('[Admin Client] VITE_SUPABASE_URL 환경변수가 없습니다. 서버 환경에서만 실행하세요.');
}

if (!supabaseServiceRoleKey) {
  throw new Error('[Admin Client] SUPABASE_SERVICE_ROLE_KEY 환경변수가 없습니다. GitHub Actions Secrets를 확인하세요.');
}

/**
 * Service Role Key를 사용하는 Supabase 클라이언트
 * RLS 정책을 완전히 우회하므로 관리자 권한의 작업에만 사용
 */
export const supabaseAdmin = createSupabaseClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export default supabaseAdmin;
