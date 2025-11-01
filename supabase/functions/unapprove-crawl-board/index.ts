/**
 * Supabase Edge Function: unapprove-crawl-board
 *
 * 목적: 승인된 크롤 게시판의 승인을 취소하고 관련 데이터를 정리합니다.
 *
 * 처리 내용:
 * 1. job_postings 삭제 (crawl_source_id 기준) - SERVICE_ROLE_KEY 사용
 * 2. crawl_logs 삭제 (board_id 기준) - SERVICE_ROLE_KEY 사용
 * 3. crawl_boards 승인 취소 (approved_at, approved_by NULL) - SERVICE_ROLE_KEY 사용
 * 4. dev_board_submissions status → 'pending' - SERVICE_ROLE_KEY 사용
 *
 * 요청 포맷:
 * POST /functions/v1/unapprove-crawl-board
 * Content-Type: application/json
 * Authorization: Bearer <user_jwt_token>
 *
 * {
 *   "boardId": "uuid"
 * }
 *
 * 응답:
 * {
 *   "success": true,
 *   "message": "승인 취소 완료",
 *   "data": {
 *     "jobsDeleted": 9,
 *     "logsDeleted": 15,
 *     "boardId": "uuid"
 *   }
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

// 환경변수
const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ??
  Deno.env.get('PROJECT_URL') ??
  '';

const anonKey =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('ANON_KEY') ??
  '';

const serviceRoleKey =
  Deno.env.get('SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  '';

// 유효성 검사
if (!supabaseUrl) {
  throw new Error('[unapprove-crawl-board] SUPABASE_URL 환경변수가 없습니다.');
}

if (!anonKey) {
  throw new Error('[unapprove-crawl-board] SUPABASE_ANON_KEY 환경변수가 없습니다.');
}

if (!serviceRoleKey) {
  throw new Error('[unapprove-crawl-board] SERVICE_ROLE_KEY 환경변수가 없습니다.');
}

// 타입 정의
interface RequestBody {
  boardId?: string;
}

interface UnapproveResult {
  jobsDeleted: number;
  logsDeleted: number;
  boardId: string;
}

interface ErrorResponse {
  success: false;
  error: string;
  statusCode: number;
}

interface SuccessResponse {
  success: true;
  message: string;
  data: UnapproveResult;
}

type ApiResponse = SuccessResponse | ErrorResponse;

// 관리자 체크
const isAdminUser = (user: any): boolean => {
  const roles = user?.app_metadata?.roles;
  if (Array.isArray(roles) && roles.includes('admin')) {
    return true;
  }
  if (user?.app_metadata?.is_admin === true) {
    return true;
  }
  return false;
};

// CORS 헤더
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // POST만 허용
  if (req.method !== 'POST') {
    const error: ErrorResponse = {
      success: false,
      error: 'Method Not Allowed',
      statusCode: 405,
    };
    return new Response(JSON.stringify(error), {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // 1. 요청 본문 파싱
    console.log('[unapprove-crawl-board] 요청 수신');
    const body = (await req.json().catch(() => null)) as RequestBody | null;

    if (!body?.boardId) {
      const error: ErrorResponse = {
        success: false,
        error: 'boardId가 필요합니다.',
        statusCode: 400,
      };
      return new Response(JSON.stringify(error), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const boardId = body.boardId;
    console.log(`[unapprove-crawl-board] boardId: ${boardId}`);

    // 2. 인증 확인
    console.log('[unapprove-crawl-board] 인증 확인 중...');
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      const error: ErrorResponse = {
        success: false,
        error: '인증 정보가 없습니다.',
        statusCode: 401,
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 사용자 정보 조회 (ANON_KEY로 충분)
    const supabaseClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: userData, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !userData?.user) {
      console.error('[unapprove-crawl-board] 사용자 조회 실패:', userError);
      const error: ErrorResponse = {
        success: false,
        error: '인증에 실패했습니다.',
        statusCode: 401,
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // 관리자 확인
    if (!isAdminUser(userData.user)) {
      console.error('[unapprove-crawl-board] 관리자 권한 없음');
      const error: ErrorResponse = {
        success: false,
        error: '관리자만 실행할 수 있습니다.',
        statusCode: 403,
      };
      return new Response(JSON.stringify(error), {
        status: 403,
        headers: corsHeaders,
      });
    }

    console.log(`[unapprove-crawl-board] 관리자 인증 완료: ${userData.user.id}`);

    // 3. Service Role 클라이언트 생성 (RLS 우회)
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    console.log('[unapprove-crawl-board] Service Role 클라이언트 생성 완료');

    // 4. job_postings 삭제 (Step 1)
    console.log(`[Step 1] job_postings 삭제 시작 (crawl_source_id=${boardId})`);
    const { error: jobsError, count: jobsDeleteCount } = await adminClient
      .from('job_postings')
      .delete()
      .eq('crawl_source_id', boardId)
      .select('id', { count: 'exact' });

    if (jobsError) {
      console.error('[Step 1 실패] job_postings 삭제 오류:', jobsError);
      const error: ErrorResponse = {
        success: false,
        error: `job_postings 삭제 실패: ${jobsError.message}`,
        statusCode: 500,
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`[Step 1 완료] ${jobsDeleteCount || 0}개 job_postings 삭제됨`);

    // 5. crawl_logs 삭제 (Step 2)
    console.log(`[Step 2] crawl_logs 삭제 시작 (board_id=${boardId})`);
    const { error: logsError, count: logsDeleteCount } = await adminClient
      .from('crawl_logs')
      .delete()
      .eq('board_id', boardId)
      .select('id', { count: 'exact' });

    if (logsError) {
      console.error('[Step 2 실패] crawl_logs 삭제 오류:', logsError);
      const error: ErrorResponse = {
        success: false,
        error: `crawl_logs 삭제 실패: ${logsError.message}`,
        statusCode: 500,
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`[Step 2 완료] ${logsDeleteCount || 0}개 crawl_logs 삭제됨`);

    // 6. crawl_boards 승인 취소 (Step 3)
    console.log(`[Step 3] crawl_boards 승인 취소 (id=${boardId})`);
    const { error: boardError } = await adminClient
      .from('crawl_boards')
      .update({
        approved_at: null,
        approved_by: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', boardId);

    if (boardError) {
      console.error('[Step 3 실패] crawl_boards 승인 취소 오류:', boardError);
      const error: ErrorResponse = {
        success: false,
        error: `crawl_boards 승인 취소 실패: ${boardError.message}`,
        statusCode: 500,
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log('[Step 3 완료] crawl_boards 승인 취소됨');

    // 7. dev_board_submissions status 변경 (Step 4)
    console.log(`[Step 4] dev_board_submissions status 변경 (crawl_board_id=${boardId})`);
    const { error: submissionError } = await adminClient
      .from('dev_board_submissions')
      .update({
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('crawl_board_id', boardId);

    if (submissionError) {
      console.error('[Step 4 실패] dev_board_submissions status 변경 오류:', submissionError);
      const error: ErrorResponse = {
        success: false,
        error: `dev_board_submissions status 변경 실패: ${submissionError.message}`,
        statusCode: 500,
      };
      return new Response(JSON.stringify(error), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log('[Step 4 완료] dev_board_submissions status → pending');

    // 8. 성공 응답
    console.log(`\n✅ 승인 취소 완료: ${boardId}`);
    const response: SuccessResponse = {
      success: true,
      message: '승인 취소 완료',
      data: {
        jobsDeleted: jobsDeleteCount || 0,
        logsDeleted: logsDeleteCount || 0,
        boardId,
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: corsHeaders,
    });
  } catch (error) {
    console.error('[unapprove-crawl-board] 처리 중 오류:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    const response: ErrorResponse = {
      success: false,
      error: `서버 오류: ${errorMsg}`,
      statusCode: 500,
    };
    return new Response(JSON.stringify(response), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
