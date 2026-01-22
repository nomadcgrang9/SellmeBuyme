/**
 * API Route: /api/generate-crawler
 * AI 크롤러 자동 생성 엔드포인트
 *
 * Supabase Edge Function 'generate-crawler' 호출
 * - AI 기반 게시판 구조 분석
 * - 크롤러 코드 자동 생성
 * - 페이지네이션 로직 포함
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[generate-crawler] ❌ Supabase 환경변수가 설정되지 않았습니다.');
  throw new Error('VITE_SUPABASE_URL 및 VITE_SUPABASE_ANON_KEY 필요');
}

export default async function handler(
  req: any,
  res: any
) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

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

    console.log('[generate-crawler API] Supabase Edge Function 호출:', {
      submissionId,
      boardName,
      boardUrl,
      adminUserId,
    });

    // Supabase Edge Function 호출
    const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/generate-crawler`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        submissionId,
        boardName,
        boardUrl,
        adminUserId,
        maxPages: 3,
        maxItems: 30,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[generate-crawler API] Edge Function 오류:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText,
      });

      return res.status(response.status).json({
        success: false,
        message: `Edge Function 호출 실패: ${response.statusText}`,
        error: errorText,
      });
    }

    const result = await response.json();

    console.log('[generate-crawler API] Edge Function 응답:', {
      success: result.success,
      crawlerCodeLength: result.crawlerCode?.length,
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('[generate-crawler API] 오류:', error);

    return res.status(500).json({
      success: false,
      message: '크롤러 생성 중 오류 발생',
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
