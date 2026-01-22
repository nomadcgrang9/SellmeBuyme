/**
 * 크롤러 상태 점검 Edge Function
 * 1. 원본 교육청 사이트에서 HTML 가져오기
 * 2. Gemini API로 게시글 목록 파싱
 * 3. DB 데이터와 비교
 * 4. 결과 반환
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleGenerativeAI } from "npm:@google/generative-ai@0.21.0";
import { corsHeaders } from "../_shared/cors.ts";

interface RegionConfig {
  code: string;
  name: string;
  boardUrl: string;
  active: boolean;
  assignee: string;
}

interface HealthCheckResult {
  regionCode: string;
  regionName: string;
  assignee: string;
  boardUrl: string;
  originalCount: number;
  originalTitles: string[];
  dbCount: number;
  latestCrawlDate: string | null;
  daysSinceCrawl: number | null;
  matchCount: number;
  missingCount: number;
  collectionRate: number;
  missingTitles: string[];
  status: 'healthy' | 'warning' | 'critical' | 'inactive' | 'error';
  statusReason: string;
  aiComment: string;
  checkedAt: string;
}

// 지역별 도메인 매핑
const REGION_DOMAINS: Record<string, string[]> = {
  seoul: ['work.sen.go.kr'],
  busan: ['www.pen.go.kr'],
  daegu: ['www.dge.go.kr'],
  incheon: ['www.ice.go.kr'],
  gwangju: ['www.gen.go.kr'],
  daejeon: ['www.dje.go.kr'],
  ulsan: ['use.go.kr'],
  sejong: ['www.sje.go.kr'],
  gyeonggi: ['www.goe.go.kr'],
  gangwon: ['www.gwe.go.kr'],
  chungbuk: ['www.cbe.go.kr'],
  chungnam: ['www.cne.go.kr'],
  jeonbuk: ['www.jbe.go.kr', '222.120.4.134', 'www.goeujb.kr'],
  jeonnam: ['www.jne.go.kr'],
  gyeongbuk: ['www.gbe.kr'],
  gyeongnam: ['www.gne.go.kr'],
  jeju: ['www.jje.go.kr'],
};

/**
 * HTML 정제 (Script, Style 제거)
 */
function cleanHtml(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gim, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gim, "")
    .replace(/<!--[\s\S]*?-->/g, ""); // 주석 제거
}

/**
 * Gemini API로 HTML에서 게시글 제목 목록 추출
 */
async function extractTitlesWithGemini(
  html: string,
  geminiApiKey: string,
  regionName: string
): Promise<string[]> {
  const genAI = new GoogleGenerativeAI(geminiApiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // 1. HTML 정제 (스크립트/스타일 제거)
  const cleanedHtml = cleanHtml(html);

  // 2. HTML이 너무 길면 잘라냄 (정제 후 50k자면 충분히 많은 내용을 담음)
  const truncatedHtml = cleanedHtml.length > 50000 ? cleanedHtml.substring(0, 50000) : cleanedHtml;

  const prompt = `
당신은 웹 스크래핑 전문가입니다.
아래는 ${regionName} 교육청 채용 공고 게시판의 HTML입니다.

**작업**: 게시판에 있는 모든 채용 공고 제목을 추출하세요.

**주의사항**:
- 제목만 추출 (날짜, 조회수, 작성자 제외)
- 공지사항이 아닌 일반 게시글의 제목만
- 중복 제거
- 최대 50개까지만 (가능한 많이)

**응답 형식** (반드시 이 JSON 형식으로만 응답):
{
  "titles": ["제목1", "제목2", "제목3"]
}

HTML:
${truncatedHtml}
`;

  try {
    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // JSON 추출
    const jsonMatch = responseText.match(/\{[\s\S]*"titles"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini 응답에서 JSON을 찾을 수 없습니다:", responseText.substring(0, 500));
      return [];
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.titles || [];
  } catch (error) {
    console.error("Gemini 파싱 실패:", error);
    return [];
  }
}

/**
 * 원본 사이트 HTML 가져오기
 */
async function fetchBoardHtml(boardUrl: string): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(boardUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * DB에서 해당 지역 공고 조회
 */
async function getDbPostings(
  supabase: ReturnType<typeof createClient>,
  regionCode: string
): Promise<{ titles: string[]; latestDate: string | null; count: number }> {
  const domains = REGION_DOMAINS[regionCode] || [];

  if (domains.length === 0) {
    return { titles: [], latestDate: null, count: 0 };
  }

  const allTitles: string[] = [];
  let latestDate: string | null = null;
  let totalCount = 0;

  for (const domain of domains) {
    const { data, error } = await supabase
      .from('job_postings')
      .select('title, created_at')
      .ilike('source_url', `%${domain}%`)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error(`DB 쿼리 에러 (${domain}):`, error);
      continue;
    }

    if (data && data.length > 0) {
      totalCount += data.length;
      allTitles.push(...data.map(d => d.title));

      if (!latestDate || new Date(data[0].created_at) > new Date(latestDate)) {
        latestDate = data[0].created_at;
      }
    }
  }

  return {
    titles: [...new Set(allTitles)], // 중복 제거
    latestDate,
    count: totalCount
  };
}

/**
 * 제목 유사도 비교 (정규화 후 비교)
 */
function normalizeTitle(title: string): string {
  return title
    .replace(/\s+/g, ' ')
    .replace(/[^\w가-힣\s]/g, '')
    .trim()
    .toLowerCase();
}

function findMatchingTitles(
  originalTitles: string[],
  dbTitles: string[]
): { matchCount: number; missingTitles: string[] } {
  const normalizedDbTitles = dbTitles.map(normalizeTitle);

  let matchCount = 0;
  const missingTitles: string[] = [];

  for (const original of originalTitles) {
    const normalizedOriginal = normalizeTitle(original);

    // 부분 일치도 허용 (70% 이상 겹치면 매칭)
    const isMatch = normalizedDbTitles.some(dbTitle => {
      if (dbTitle === normalizedOriginal) return true;
      if (dbTitle.includes(normalizedOriginal) || normalizedOriginal.includes(dbTitle)) return true;
      return false;
    });

    if (isMatch) {
      matchCount++;
    } else {
      missingTitles.push(original);
    }
  }

  return { matchCount, missingTitles };
}

/**
 * 상태 결정
 */
function determineStatus(
  collectionRate: number,
  daysSinceCrawl: number | null,
  active: boolean,
  fetchError: boolean
): { status: HealthCheckResult['status']; reason: string } {
  if (!active) {
    return { status: 'inactive', reason: '비활성화된 지역' };
  }

  if (fetchError) {
    return { status: 'error', reason: '원본 사이트 접속 실패' };
  }

  if (daysSinceCrawl !== null && daysSinceCrawl >= 7) {
    return { status: 'critical', reason: `${daysSinceCrawl}일간 미수집` };
  }

  if (collectionRate < 50) {
    return { status: 'critical', reason: `수집률 ${collectionRate.toFixed(0)}% (위험)` };
  }

  if (collectionRate < 80 || (daysSinceCrawl !== null && daysSinceCrawl >= 3)) {
    const reasons = [];
    if (collectionRate < 80) reasons.push(`수집률 ${collectionRate.toFixed(0)}%`);
    if (daysSinceCrawl !== null && daysSinceCrawl >= 3) reasons.push(`${daysSinceCrawl}일 경과`);
    return { status: 'warning', reason: reasons.join(', ') };
  }

  return { status: 'healthy', reason: '정상' };
}

/**
 * 일수 계산
 */
function calculateDaysSince(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * AI 코멘트 생성
 */
function generateAiComment(
  status: HealthCheckResult['status'],
  regionName: string,
  collectionRate: number,
  missingCount: number,
  daysSinceCrawl: number | null
): string {
  switch (status) {
    case 'critical':
      if (daysSinceCrawl !== null && daysSinceCrawl >= 7) {
        return `${regionName} 지역 크롤러가 ${daysSinceCrawl}일간 작동하지 않았습니다. 즉시 확인이 필요합니다.`;
      }
      return `${regionName} 지역에서 ${missingCount}개 공고가 누락되었습니다. 크롤러 점검이 필요합니다.`;
    case 'warning':
      return `${regionName} 지역 수집률이 ${collectionRate.toFixed(0)}%입니다. 모니터링을 강화해주세요.`;
    case 'error':
      return `${regionName} 교육청 사이트에 접속할 수 없습니다. 사이트 상태를 확인해주세요.`;
    case 'inactive':
      return `${regionName} 지역은 현재 비활성화 상태입니다.`;
    default:
      return `${regionName} 지역 크롤러가 정상 작동 중입니다. (수집률 ${collectionRate.toFixed(0)}%)`;
  }
}

serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { regionCode, regionConfig } = await req.json() as {
      regionCode: string;
      regionConfig: RegionConfig;
    };

    console.log(`[crawler-health-check] 점검 시작: ${regionConfig.name} (${regionCode})`);

    // 환경 변수
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const geminiApiKey = Deno.env.get('GEMINI_API_KEY')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    let originalTitles: string[] = [];
    let fetchError = false;

    // 1. 원본 사이트 HTML 가져오기
    try {
      console.log(`[crawler-health-check] HTML 가져오기: ${regionConfig.boardUrl}`);
      const html = await fetchBoardHtml(regionConfig.boardUrl);
      console.log(`[crawler-health-check] HTML 길이: ${html.length}`);

      // 2. Gemini로 제목 추출
      console.log(`[crawler-health-check] Gemini 분석 시작`);
      originalTitles = await extractTitlesWithGemini(html, geminiApiKey, regionConfig.name);
      console.log(`[crawler-health-check] 추출된 제목 수: ${originalTitles.length}`);
    } catch (error) {
      console.error(`[crawler-health-check] 원본 사이트 접속 실패:`, error);
      fetchError = true;
    }

    // 3. DB 데이터 조회
    console.log(`[crawler-health-check] DB 조회 시작`);
    const dbData = await getDbPostings(supabase, regionCode);
    console.log(`[crawler-health-check] DB 공고 수: ${dbData.count}`);

    // 4. 비교
    const { matchCount, missingTitles } = findMatchingTitles(originalTitles, dbData.titles);
    const missingCount = originalTitles.length - matchCount;
    const collectionRate = originalTitles.length > 0
      ? (matchCount / originalTitles.length) * 100
      : (dbData.count > 0 ? 100 : 0);

    const daysSinceCrawl = calculateDaysSince(dbData.latestDate);

    // 5. 상태 결정
    const { status, reason } = determineStatus(
      collectionRate,
      daysSinceCrawl,
      regionConfig.active,
      fetchError
    );

    // 6. 결과 생성
    const result: HealthCheckResult = {
      regionCode,
      regionName: regionConfig.name,
      assignee: regionConfig.assignee,
      boardUrl: regionConfig.boardUrl,
      originalCount: originalTitles.length,
      originalTitles: originalTitles.slice(0, 10), // 처음 10개만
      dbCount: dbData.count,
      latestCrawlDate: dbData.latestDate,
      daysSinceCrawl,
      matchCount,
      missingCount,
      collectionRate,
      missingTitles: missingTitles.slice(0, 5), // 처음 5개만
      status,
      statusReason: reason,
      aiComment: generateAiComment(status, regionConfig.name, collectionRate, missingCount, daysSinceCrawl),
      checkedAt: new Date().toISOString(),
    };

    console.log(`[crawler-health-check] 점검 완료: ${status} - ${reason}`);

    return new Response(
      JSON.stringify(result),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('[crawler-health-check] 에러:', error);

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
