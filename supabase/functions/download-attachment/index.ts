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
    const response = await fetch(targetUrl);
    
    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: 'Failed to fetch file from source' }),
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

    headers.set(
      'Content-Disposition',
      `attachment; filename="${asciiFilename}"; filename*=UTF-8''${encodedFilename}`
    );

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
