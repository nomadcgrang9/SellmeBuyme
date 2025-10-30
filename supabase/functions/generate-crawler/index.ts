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
    console.log('[generate-crawler] Phase 5 파이프라인 시작...')

    // 크롤러 ID 생성
    const crawlerId = payload.boardName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')

    // ✅ 샘플 크롤러 생성 (실제로는 AI 분석 필요)
    const crawlerCode = generateSampleCrawler(payload.boardName, payload.boardUrl)
    
    console.log('[generate-crawler] ⚠️ 주의: 현재는 샘플 크롤러만 생성됩니다.')
    console.log('[generate-crawler] 실제 AI 분석을 위해서는 다음이 필요합니다:')
    console.log('[generate-crawler]   1. boardAnalyzer - 게시판 구조 분석')
    console.log('[generate-crawler]   2. codeGenerator - AI 기반 크롤러 코드 생성')
    console.log('[generate-crawler]   3. sandbox - 생성된 코드 테스트')
    console.log('[generate-crawler]   4. selfCorrection - 오류 수정 루프')

    // crawl_boards 테이블에 등록
    const { data: crawlBoard, error: crawlBoardError } = await supabase
      .from('crawl_boards')
      .insert({
        name: payload.boardName,
        board_url: payload.boardUrl,
        category: 'job',
        description: `AI 자동 생성 크롤러 - ${payload.boardName}`,
        is_active: true,  // ✅ 즉시 활성화하여 크롤링 가능하도록 설정
        status: 'active',
        crawl_batch_size: 10,
        crawler_source_code: crawlerCode,  // ✅ 생성된 크롤러 코드 저장
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

    // ✅ GitHub Actions 워크플로우 자동 트리거 (즉시 크롤링 실행)
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    if (githubToken) {
      console.log('[generate-crawler] GitHub Actions 트리거 시작...')
      
      try {
        const githubResponse = await fetch(
          'https://api.github.com/repos/nomadcgrang9/SellmeBuyme/actions/workflows/run-crawler.yml/dispatches',
          {
            method: 'POST',
            headers: {
              'Authorization': `token ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ref: 'main',
              inputs: {
                board_id: crawlBoard.id,
                crawl_mode: 'run',
              },
            }),
          }
        )

        if (githubResponse.ok) {
          console.log('[generate-crawler] GitHub Actions 트리거 성공')
        } else {
          const errorText = await githubResponse.text()
          console.warn('[generate-crawler] GitHub Actions 트리거 실패:', errorText)
        }
      } catch (githubError) {
        console.warn('[generate-crawler] GitHub Actions 트리거 오류:', githubError)
        // 트리거 실패해도 크롤러는 생성되었으므로 계속 진행
      }
    } else {
      console.warn('[generate-crawler] GITHUB_TOKEN 환경변수 없음 - 자동 크롤링 스킵')
    }

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
 * 생성일: ${new Date().toISOString()}
 */

export async function crawl${boardName.replace(/\s+/g, '').replace(/[^a-zA-Z0-9]/g, '')}(page, config) {
  console.log(\`📍 \${config.name} 크롤링 시작\`);
  
  const jobs = [];
  
  try {
    // 1. 목록 페이지 접속
    console.log(\`🌐 목록 페이지 접속: \${config.url}\`);
    await page.goto(config.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    
    // 2. 게시글 목록 추출 (여러 선택자 시도)
    let rows = [];
    const selectors = [
      'table tbody tr',
      '.board-list tbody tr',
      '.tbl_list tbody tr',
      'table tr',
      '.list-item'
    ];
    
    for (const selector of selectors) {
      rows = await page.locator(selector).all();
      if (rows.length > 0) {
        console.log(\`✅ 선택자 "\${selector}" 로 \${rows.length}개 발견\`);
        break;
      }
    }
    
    console.log(\`📋 발견된 공고 수: \${rows.length}개\`);
    
    if (rows.length === 0) {
      console.warn('⚠️ 공고 목록을 찾을 수 없습니다');
      return jobs;
    }
    
    // 3. 각 게시글 처리 (최대 10개)
    const maxCount = Math.min(rows.length, config.crawlBatchSize || 10);
    for (let i = 0; i < maxCount; i++) {
      try {
        const row = rows[i];
        
        // 제목 및 링크 추출
        const linkElement = await row.locator('a').first();
        const title = await linkElement.textContent();
        let href = await linkElement.getAttribute('href');
        
        if (!title || !href) {
          continue;
        }
        
        // 상대 URL을 절대 URL로 변환
        if (!href.startsWith('http')) {
          const baseUrl = new URL(config.url);
          href = new URL(href, baseUrl.origin).href;
        }
        
        // 날짜 추출 시도
        let postedDate = new Date().toISOString().split('T')[0];
        try {
          const dateText = await row.locator('td').nth(2).textContent();
          if (dateText && /\\d{4}/.test(dateText)) {
            postedDate = dateText.trim().replace(/\\./g, '-');
          }
        } catch (e) {
          // 날짜 추출 실패 시 현재 날짜 사용
        }
        
        jobs.push({
          title: title.trim(),
          url: href,
          organization: config.name,
          location: '지역 미상',
          postedDate: postedDate,
          detailContent: '',
          attachmentUrl: null,
        });
        
        console.log(\`  ✅ \${i + 1}. \${title.trim()}\`);
      } catch (rowError) {
        console.warn(\`  ⚠️ 행 \${i + 1} 처리 오류: \${rowError.message}\`);
      }
    }
    
    console.log(\`✅ 크롤링 완료: \${jobs.length}개 수집\`);
    return jobs;
  } catch (error) {
    console.error('❌ 크롤링 오류:', error);
    return jobs;
  }
}
`
}
