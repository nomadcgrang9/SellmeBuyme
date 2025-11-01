const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function extractExtension(filename: string | null): string | null {
  if (!filename) {
    return null;
  }
  const match = filename.match(/\.([^.\s]+)$/);
  return match ? match[1].toLowerCase() : null;
}

function guessExtensionFromContentType(contentType: string | null): string | null {
  if (!contentType) {
    return null;
  }
  const normalized = contentType.split(';')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'application/haansofthwp': 'hwp',
    'application/x-hwp': 'hwp',
    'application/octet-stream': 'hwp',
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/vnd.ms-excel': 'xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'application/zip': 'zip',
  };
  return map[normalized] || null;
}

function parseFilenameFromDisposition(disposition: string | null): string | null {
  if (!disposition) {
    return null;
  }
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch (error) {
      console.warn('Failed to decode UTF-8 filename from Content-Disposition', error);
    }
  }
  const filenameMatch = disposition.match(/filename="?([^";]+)"?/i);
  if (filenameMatch?.[1]) {
    return filenameMatch[1];
  }
  return null;
}

// @ts-ignore: Deno global is available in Supabase Edge Functions
Deno.serve(async (req) => {
  // CORS preflight 처리
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const targetUrl = url.searchParams.get('url');
    const filename = url.searchParams.get('filename');

    // 디버깅 로그
    console.log('[download-attachment] Request received');
    console.log('[download-attachment] targetUrl:', targetUrl);
    console.log('[download-attachment] filename:', filename);
    console.log('[download-attachment] Full URL:', req.url);

    if (!targetUrl) {
      return new Response(
        JSON.stringify({ error: 'url parameter is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 외부 서버에서 파일 가져오기
    console.log('[download-attachment] Fetching from:', targetUrl);

    // 구리남양주(goegn.kr) SSL 인증서 문제: 미리 HTTP로 변환
    let fetchUrl = targetUrl;
    if (fetchUrl.includes('goegn.kr') && fetchUrl.startsWith('https://')) {
      fetchUrl = fetchUrl.replace('https://', 'http://');
      console.log('[download-attachment] goegn.kr detected, forced to HTTP:', fetchUrl);
    }

    // === 디버깅: fetch 직전 URL 상태 ===
    console.log('[DEBUG] fetchUrl value:', fetchUrl);
    console.log('[DEBUG] fetchUrl protocol:', fetchUrl.startsWith('http://') ? 'HTTP' : fetchUrl.startsWith('https://') ? 'HTTPS' : 'UNKNOWN');
    console.log('[DEBUG] fetchUrl includes goegn.kr:', fetchUrl.includes('goegn.kr'));

    // 구리남양주(goegn.kr) SSL 인증서 문제 해결: try-catch로 폴백 처리
    let response;

    try {
      // 먼저 일반 fetch 시도 (성남, 의정부, 경기도용)
      console.log('[DEBUG] About to fetch:', fetchUrl);
      response = await fetch(fetchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': '*/*',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
        },
      });

      // === 디버깅: fetch 직후 response 상태 ===
      console.log('[DEBUG] Fetch succeeded');
      console.log('[DEBUG] response.url (final URL after redirects):', response.url);
      console.log('[DEBUG] response.redirected:', response.redirected);
      console.log('[DEBUG] response.type:', response.type);
      console.log('[DEBUG] response.status:', response.status);

    } catch (sslError) {
      // SSL 에러 발생 시 (구리남양주용) - HTTP로 다시 시도
      console.log('[download-attachment] SSL error, retrying with HTTP:', sslError);
      console.log('[DEBUG] Error name:', sslError.name);
      console.log('[DEBUG] Error message:', sslError.message);

      // HTTPS를 HTTP로 변경하여 재시도
      const httpUrl = fetchUrl.replace('https://', 'http://');
      console.log('[download-attachment] Retrying with HTTP:', httpUrl);
      console.log('[DEBUG] httpUrl protocol:', httpUrl.startsWith('http://') ? 'HTTP' : 'OTHER');

      try {
        console.log('[DEBUG] About to retry fetch with HTTP:', httpUrl);
        response = await fetch(httpUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
          },
        });
        console.log('[download-attachment] HTTP fetch succeeded');
        console.log('[DEBUG] HTTP retry response.url:', response.url);
        console.log('[DEBUG] HTTP retry response.redirected:', response.redirected);
        console.log('[DEBUG] HTTP retry response.status:', response.status);

      } catch (httpError) {
        console.error('[download-attachment] HTTP fetch also failed:', httpError);
        console.log('[DEBUG] HTTP retry error name:', httpError.name);
        console.log('[DEBUG] HTTP retry error message:', httpError.message);
        throw httpError; // 상위 catch로 전달
      }
    }

    console.log('[download-attachment] Response status:', response.status, response.statusText);
    console.log('[download-attachment] Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      console.error('[download-attachment] Fetch failed:', response.status, response.statusText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch file from source', status: response.status, statusText: response.statusText }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // 응답 헤더 구성
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    
    const contentType = response.headers.get('Content-Type') || 'application/octet-stream';
    headers.set('Content-Type', contentType);

    const upstreamDisposition = response.headers.get('Content-Disposition');
    const upstreamFilename = parseFilenameFromDisposition(upstreamDisposition);

    const baseName = filename?.trim() || upstreamFilename?.trim() || '공고문';
    let finalFilename = baseName;

    if (!extractExtension(finalFilename)) {
      const fallbackExtension = extractExtension(upstreamFilename) || guessExtensionFromContentType(contentType) || 'hwp';
      finalFilename = `${finalFilename}.${fallbackExtension}`;
    }

    const encodedFilename = encodeURIComponent(finalFilename);
    const asciiFilename = finalFilename
      .normalize('NFKD')
      .replace(/[^ -\x7f]/g, '_')
      .replace(/\s+/g, ' ')
      .trim() || 'download';

    const contentDisposition = `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`;

    // 디버깅 로그
    console.log('[download-attachment] Final filename:', finalFilename);
    console.log('[download-attachment] Content-Disposition:', contentDisposition);

    headers.set('Content-Disposition', contentDisposition);

    // 스트림을 그대로 전달
    return new Response(response.body, { 
      status: 200,
      headers 
    });
  } catch (error) {
    console.error('Download proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
