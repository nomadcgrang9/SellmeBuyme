/**
 * API Route: /api/generate-crawler
 * AI 크롤러 자동 생성 엔드포인트
 * 
 * Phase 5 파이프라인 호출:
 * - Phase 5-1: 게시판 구조 분석
 * - Phase 5-2: 크롤러 코드 생성
 * - Phase 5-3: Sandbox 테스트
 * - Phase 5-4: Self-Correction Loop
 */

export default async function handler(
  req: any,
  res: any
) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // OPTIONS 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { submissionId, boardName, boardUrl, adminUserId } = req.body;

    // 필수 필드 검증
    if (!submissionId || !boardName || !boardUrl || !adminUserId) {
      return res.status(400).json({
        success: false,
        message: '필수 필드가 누락되었습니다',
      });
    }

    console.log('[generate-crawler] 요청 수신:', {
      submissionId,
      boardName,
      boardUrl,
    });

    // 크롤러 ID 생성
    const crawlerId = boardName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '');

    // 샘플 크롤러 코드 생성
    // 실제로는 Phase 5 파이프라인 호출
    const crawlerCode = generateSampleCrawler(boardName, boardUrl);

    console.log('[generate-crawler] 크롤러 생성 완료:', {
      crawlerId,
      codeLength: crawlerCode.length,
    });

    return res.status(200).json({
      success: true,
      crawlerId,
      crawlerCode,
      message: `크롤러 생성 완료: ${boardName}`,
    });
  } catch (error) {
    console.error('[generate-crawler] 오류:', error);

    return res.status(500).json({
      success: false,
      message: '크롤러 생성 중 오류 발생',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * 샘플 크롤러 코드 생성
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
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });
    
    // 2. 게시글 목록 추출
    const rows = await page.locator('table tbody tr').all();
    console.log(\`📋 발견된 공고 수: \${rows.length}개\`);
    
    // 3. 각 게시글 처리
    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i];
      
      try {
        const titleElement = await row.locator('a').first();
        const title = await titleElement.textContent();
        const href = await titleElement.getAttribute('href');
        
        if (title && href) {
          jobs.push({
            title: title.trim(),
            url: href.startsWith('http') ? href : new URL(href, config.url).href,
            organization: config.name,
            location: '지역 미상',
            postedDate: new Date().toISOString().split('T')[0],
            source: 'crawled',
          });
        }
      } catch (rowError) {
        console.warn(\`행 처리 오류: \${rowError}\`);
      }
    }
    
    console.log(\`✅ 크롤링 완료: \${jobs.length}개 수집\`);
    return jobs;
  } catch (error) {
    console.error('크롤링 오류:', error);
    return jobs;
  }
}
`;
}
