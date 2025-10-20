import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const supabaseUrl =
  Deno.env.get('SUPABASE_URL') ??
  Deno.env.get('PROJECT_URL') ??
  Deno.env.get('SB_URL') ??
  '';

const anonKey =
  Deno.env.get('SUPABASE_ANON_KEY') ??
  Deno.env.get('ANON_KEY') ??
  Deno.env.get('SB_ANON_KEY') ??
  '';
const serviceRoleKey =
  Deno.env.get('SERVICE_ROLE_KEY') ??
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
  '';
const githubToken = Deno.env.get('GITHUB_TOKEN') ?? '';
const githubRepo = Deno.env.get('GITHUB_REPO') ?? ''; // format: owner/repo

if (!supabaseUrl || !anonKey) {
  throw new Error('SUPABASE_URL 또는 SUPABASE_ANON_KEY 환경 변수가 설정되지 않았습니다.');
}

if (!serviceRoleKey) {
  console.warn('[admin-crawl-run] SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. 데이터베이스 쓰기 작업이 실패할 수 있습니다.');
}

type CrawlBoard = {
  id: string;
  name: string;
  board_url: string;
  status: string | null;
  is_active: boolean | null;
  crawl_batch_size?: number | null;
};

type TriggerResult = {
  ok: boolean;
  status: number;
  body?: unknown;
};

const isAdminUser = (user: any) => {
  const roles = user?.app_metadata?.roles;
  if (Array.isArray(roles) && roles.includes('admin')) {
    return true;
  }
  if (user?.app_metadata?.is_admin === true) {
    return true;
  }
  return false;
};

async function extractBoard(adminClient: ReturnType<typeof createClient>, boardId: string): Promise<CrawlBoard> {
  const { data, error } = await adminClient
    .from('crawl_boards')
    .select('id, name, board_url, status, is_active, crawl_batch_size')
    .eq('id', boardId)
    .single();

  if (error || !data) {
    console.error('[admin-crawl-run] crawl_boards 조회 실패', error);
    throw new Response(JSON.stringify({ message: '대상 게시판을 찾을 수 없습니다.' }), { status: 404 });
  }

  return data as CrawlBoard;
}

async function insertCrawlLog(adminClient: ReturnType<typeof createClient>, boardId: string) {
  const { data, error } = await adminClient
    .from('crawl_logs')
    .insert({
      board_id: boardId,
      status: 'pending',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error || !data) {
    console.error('[admin-crawl-run] crawl_logs 기록 실패', error);
    throw new Response(JSON.stringify({ message: '크롤링 로그를 생성하지 못했습니다.' }), { status: 500 });
  }

  return data.id as string;
}

async function markBoardCrawled(adminClient: ReturnType<typeof createClient>, boardId: string) {
  const { error } = await adminClient
    .from('crawl_boards')
    .update({ last_crawled_at: new Date().toISOString() })
    .eq('id', boardId);

  if (error) {
    console.warn('[admin-crawl-run] 마지막 크롤링 시간 업데이트 실패', error);
  }
}

async function triggerGitHubActions(board: CrawlBoard, logId: string, mode: 'run' | 'test'): Promise<TriggerResult | null> {
  console.log('[admin-crawl-run] triggerGitHubActions 시작');
  console.log('[admin-crawl-run] githubToken 존재:', !!githubToken, '길이:', githubToken?.length);
  console.log('[admin-crawl-run] githubRepo:', githubRepo);
  
  if (!githubToken || !githubRepo) {
    console.error('[admin-crawl-run] GITHUB_TOKEN 또는 GITHUB_REPO 미설정!');
    console.error('[admin-crawl-run] githubToken:', githubToken ? '존재' : '없음');
    console.error('[admin-crawl-run] githubRepo:', githubRepo || '없음');
    return null;
  }

  const url = `https://api.github.com/repos/${githubRepo}/actions/workflows/run-crawler.yml/dispatches`;
  console.log('[admin-crawl-run] GitHub API URL:', url);
  
  const payload = {
    ref: 'main',
    inputs: {
      board_id: board.id,
      log_id: logId,
      mode: mode,
    },
  };

  const headers: HeadersInit = {
    'Accept': 'application/vnd.github+json',
    'Authorization': `Bearer ${githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };

  console.log('[admin-crawl-run] GitHub API 호출 시작...');
  console.log('[admin-crawl-run] Payload:', JSON.stringify(payload));
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  console.log('[admin-crawl-run] GitHub API 응답 상태:', response.status);
  console.log('[admin-crawl-run] GitHub API 응답 OK:', response.ok);

  let body: unknown = undefined;
  try {
    const responseText = await response.clone().text();
    console.log('[admin-crawl-run] GitHub API 응답 본문:', responseText);
    if (responseText) {
      body = JSON.parse(responseText);
    }
  } catch (error) {
    console.error('[admin-crawl-run] GitHub API 응답 파싱 실패:', error);
  }

  if (!response.ok) {
    console.error('[admin-crawl-run] GitHub API 호출 실패!');
    console.error('[admin-crawl-run] 상태 코드:', response.status);
    console.error('[admin-crawl-run] 응답 본문:', body);
  } else {
    console.log('[admin-crawl-run] GitHub Actions 트리거 성공!');
  }

  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { 
      status: 405,
      headers: corsHeaders 
    });
  }

  try {
    // TODO: 임시로 인증 체크 비활성화 - 나중에 다시 활성화 필요
    console.log('[admin-crawl-run] 인증 체크 임시 비활성화됨');
    
    // const authHeader = req.headers.get('Authorization');
    // if (!authHeader) {
    //   return new Response(JSON.stringify({ message: '인증 정보가 없습니다.' }), { 
    //     status: 401,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    //   });
    // }

    // const supabase = createClient(supabaseUrl, anonKey, {
    //   global: {
    //     headers: { Authorization: authHeader },
    //   },
    // });

    // const { data: userData, error: userError } = await supabase.auth.getUser();
    // if (userError || !userData?.user) {
    //   console.error('[admin-crawl-run] 사용자 조회 실패', userError);
    //   return new Response(JSON.stringify({ message: '인증에 실패했습니다.' }), { 
    //     status: 401,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    //   });
    // }

    // if (!isAdminUser(userData.user)) {
    //   return new Response(JSON.stringify({ message: '관리자만 실행할 수 있습니다.' }), { 
    //     status: 403,
    //     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    //   });
    // }

    const body = await req.json().catch(() => null) as { boardId?: string; mode?: string } | null;
    if (!body?.boardId) {
      return new Response(JSON.stringify({ message: 'boardId가 필요합니다.' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const mode = body.mode === 'test' ? 'test' : 'run';

    if (!serviceRoleKey) {
      return new Response(JSON.stringify({ message: '서버 설정이 완료되지 않았습니다. (SERVICE_ROLE_KEY 누락)' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const board = await extractBoard(adminClient, body.boardId);
    if (!board.is_active) {
      return new Response(JSON.stringify({ message: '비활성화된 게시판입니다.' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    await markBoardCrawled(adminClient, board.id);
    const logId = await insertCrawlLog(adminClient, board.id);

    const triggerResult = await triggerGitHubActions(board, logId, mode);

    if (triggerResult && !triggerResult.ok) {
      await adminClient
        .from('crawl_logs')
        .update({ status: 'failed', error_log: `Trigger failed with status ${triggerResult.status}` })
        .eq('id', logId);

      return new Response(
        JSON.stringify({
          message: 'GitHub Actions 트리거에 실패했습니다.',
          logId,
          githubStatus: triggerResult.status,
          githubBody: triggerResult.body ?? null,
        }),
        { 
          status: 502,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        },
      );
    }

    if (triggerResult) {
      await adminClient
        .from('crawl_logs')
        .update({ status: 'running' })
        .eq('id', logId);
    }

    return new Response(
      JSON.stringify({
        message: '크롤링 작업이 GitHub Actions에 예약되었습니다.',
        logId,
        mode,
        githubStatus: triggerResult?.status ?? null,
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      },
    );
  } catch (error) {
    console.error('[admin-crawl-run] 처리 중 오류', error);
    return new Response(JSON.stringify({ message: '서버 오류가 발생했습니다.' }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
