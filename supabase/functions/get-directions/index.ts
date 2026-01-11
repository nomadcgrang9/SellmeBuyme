/**
 * get-directions Edge Function
 *
 * 카카오 모빌리티 API (자동차 길찾기) 및 TMAP API (대중교통 길찾기)를 프록시합니다.
 * API 키를 서버 측에 안전하게 보관하여 클라이언트에 노출되지 않도록 합니다.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DirectionsRequest {
  type: 'car' | 'transit' | 'walk';
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
}

// @ts-ignore: Deno global is available in Supabase Edge Functions
Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { type, origin, destination }: DirectionsRequest = await req.json();

    // 입력 검증
    if (!type || !origin || !destination) {
      return new Response(
        JSON.stringify({ error: 'type, origin, destination are required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (!['car', 'transit', 'walk'].includes(type)) {
      return new Response(
        JSON.stringify({ error: 'type must be one of: car, transit, walk' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[get-directions] Request: type=${type}, origin=(${origin.lat}, ${origin.lng}), destination=(${destination.lat}, ${destination.lng})`);

    let result;

    if (type === 'car' || type === 'walk') {
      // 카카오 모빌리티 API (자동차 및 도보)
      // @ts-ignore: Deno global is available in Supabase Edge Functions
      const KAKAO_KEY = Deno.env.get('KAKAO_MOBILITY_API_KEY');

      if (!KAKAO_KEY) {
        console.error('[get-directions] KAKAO_MOBILITY_API_KEY not set');
        return new Response(
          JSON.stringify({ error: 'Server configuration error: Kakao API key not set' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // 카카오 모빌리티 API는 lng,lat 순서 사용
      const apiUrl = `https://apis-navi.kakaomobility.com/v1/directions?origin=${origin.lng},${origin.lat}&destination=${destination.lng},${destination.lat}`;

      console.log(`[get-directions] Calling Kakao Mobility API: ${apiUrl}`);

      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `KakaoAK ${KAKAO_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[get-directions] Kakao API error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({
            error: 'Kakao API request failed',
            status: response.status,
            details: errorText
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      result = await response.json();
      console.log(`[get-directions] Kakao API success, routes: ${result.routes?.length || 0}`);

    } else if (type === 'transit') {
      // TMAP API (대중교통)
      // @ts-ignore: Deno global is available in Supabase Edge Functions
      const TMAP_KEY = Deno.env.get('TMAP_API_KEY');

      if (!TMAP_KEY) {
        console.error('[get-directions] TMAP_API_KEY not set');
        return new Response(
          JSON.stringify({ error: 'Server configuration error: TMAP API key not set' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // TMAP 대중교통 경로 API
      const apiUrl = 'https://apis.openapi.sk.com/transit/routes';

      const requestBody = {
        startX: origin.lng.toString(),
        startY: origin.lat.toString(),
        endX: destination.lng.toString(),
        endY: destination.lat.toString(),
        lang: 0, // 0: 한국어, 1: 영어
        format: 'json',
        count: 1, // 추천 경로 개수
      };

      console.log(`[get-directions] Calling TMAP API`, requestBody);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'appKey': TMAP_KEY,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[get-directions] TMAP API error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({
            error: 'TMAP API request failed',
            status: response.status,
            details: errorText
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      result = await response.json();

      // TMAP 에러 체크
      if (result.error || result.resultCode !== '0') {
        console.error(`[get-directions] TMAP API returned error:`, result.error || result.resultMessage);
        return new Response(
          JSON.stringify({
            error: 'TMAP API returned error',
            details: result.error || result.resultMessage
          }),
          {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      console.log(`[get-directions] TMAP API success, paths: ${result.metaData?.plan?.itineraries?.length || 0}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('[get-directions] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
