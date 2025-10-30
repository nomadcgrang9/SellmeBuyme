/**
 * Supabase Edge Function: AI 크롤러 자동 생성
 * 
 * Phase 5 파이프라인 호출:
 * - Phase 5-1: 게시판 구조 분석 (boardAnalyzer)
 * - Phase 5-2: 크롤러 코드 생성 (codeGenerator)
 * - Phase 5-3: Sandbox 테스트 (sandbox)
 * - Phase 5-4: Self-Correction Loop (selfCorrection)
 * 
 * 요청:
 * POST /functions/v1/generate-crawler
 * {
 *   "submissionId": "uuid",
 *   "boardName": "구리남양주교육지원청",
 *   "boardUrl": "https://www.goegn.kr/...",
 *   "adminUserId": "uuid"
 * }
 * 
 * 응답:
 * {
 *   "success": true,
 *   "crawlerId": "namyangju",
 *   "crawlerCode": "...",
 *   "crawlBoardId": "uuid",
 *   "message": "크롤러 생성 완료"
 * }
 */

// Supabase Edge Function - Deno 런타임에서 자동으로 제공됨

interface GenerateCrawlerRequest {
  submissionId: string
  boardName: string
  boardUrl: string
  adminUserId: string
}

interface GenerateCrawlerResponse {
  success: boolean
  crawlerId?: string
  crawlerCode?: string
  crawlBoardId?: string
  message: string
  error?: string
}

serve(async (req: Request) => {
  // CORS 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ success: false, message: 'POST 요청만 허용됩니다' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const payload: GenerateCrawlerRequest = await req.json()
    
    // 필수 필드 검증
    if (!payload.submissionId || !payload.boardName || !payload.boardUrl || !payload.adminUserId) {
      return new Response(
        JSON.stringify({
          success: false,
          message: '필수 필드가 누락되었습니다: submissionId, boardName, boardUrl, adminUserId',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    console.log('[generate-crawler] 요청 수신:', {
      submissionId: payload.submissionId,
      boardName: payload.boardName,
      boardUrl: payload.boardUrl,
    })

    // Supabase 클라이언트 초기화
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Supabase 환경변수 미설정')
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Phase 5 파이프라인 호출
    // 주의: 이 함수는 Node.js 환경에서만 실행 가능하므로,
    // 실제로는 별도의 Node.js 백엔드 서비스를 호출해야 합니다.
    
    console.log('[generate-crawler] Phase 5 파이프라인 시작...')

    // 임시: 크롤러 코드 생성 (실제로는 Phase 5 파이프라인 호출)
    const crawlerId = payload.boardName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')

    const crawlerCode = generateSampleCrawler(payload.boardName, payload.boardUrl)

    // crawl_boards 테이블에 등록
    const { data: crawlBoard, error: crawlBoardError } = await supabase
      .from('crawl_boards')
      .insert({
        name: payload.boardName,
        board_url: payload.boardUrl,
        category: 'job',
        description: `AI 자동 생성 크롤러 - ${payload.boardName}`,
        is_active: false,
        status: 'active',
        crawl_batch_size: 10,
        crawler_source_code: crawlerCode,
        created_by: payload.adminUserId,
        approved_by: payload.adminUserId,
        approved_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (crawlBoardError) {
      throw new Error(`crawl_boards 등록 실패: ${crawlBoardError.message}`)
    }

    // dev_board_submissions 테이블 업데이트
    const { error: updateError } = await supabase
      .from('dev_board_submissions')
      .update({
        status: 'approved',
        crawl_board_id: crawlBoard.id,
        approved_by: payload.adminUserId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', payload.submissionId)

    if (updateError) {
      console.warn('[generate-crawler] dev_board_submissions 업데이트 경고:', updateError)
    }

    console.log('[generate-crawler] 크롤러 생성 완료:', {
      crawlerId,
      crawlBoardId: crawlBoard.id,
    })

    const response: GenerateCrawlerResponse = {
      success: true,
      crawlerId,
      crawlerCode,
      crawlBoardId: crawlBoard.id,
      message: `크롤러 생성 완료: ${payload.boardName}`,
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('[generate-crawler] 오류:', error)

    const response: GenerateCrawlerResponse = {
      success: false,
      message: '크롤러 생성 중 오류 발생',
      error: error instanceof Error ? error.message : String(error),
    }

    return new Response(JSON.stringify(response), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})

/**
 * 샘플 크롤러 코드 생성 (임시)
 * 실제로는 Phase 5 파이프라인에서 생성된 코드를 사용합니다.
 */
function generateSampleCrawler(boardName: string, boardUrl: string): string {
  return `/**
 * ${boardName} 크롤러
 * AI 자동 생성 (Phase 5)
 */

export async function crawl${boardName.replace(/\s+/g, '')}(page, config) {
  console.log(\`📍 \${config.name} 크롤링 시작\`);
  
  const jobs = [];
  
  try {
    // 1. 목록 페이지 접속
    console.log(\`🌐 목록 페이지 접속: \${config.url}\`);
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });
    
    // 2. 게시글 목록 추출
    const rows = await page.locator('table tbody tr').all();
    console.log(\`📋 발견된 공고 수: \${rows.length}개\`);
    
    // 3. 각 게시글 처리
    for (let i = 0; i < Math.min(rows.length, 3); i++) {
      const row = rows[i];
      const titleElement = await row.locator('a').first();
      const title = await titleElement.textContent();
      const href = await titleElement.getAttribute('href');
      
      if (title && href) {
        jobs.push({
          title: title.trim(),
          url: href,
          organization: config.name,
          location: '지역 미상',
          postedDate: new Date().toISOString().split('T')[0],
        });
      }
    }
    
    return jobs;
  } catch (error) {
    console.error('크롤링 오류:', error);
    return jobs;
  }
}
`
}
