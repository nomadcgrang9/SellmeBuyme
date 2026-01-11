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
      // 대중교통: 카카오맵 외부 링크로 안내 (API 미지원)
      // 직선 거리 및 예상 시간만 반환
      const R = 6371000; // 지구 반지름 (미터)
      const lat1 = origin.lat * Math.PI / 180;
      const lat2 = destination.lat * Math.PI / 180;
      const deltaLat = (destination.lat - origin.lat) * Math.PI / 180;
      const deltaLng = (destination.lng - origin.lng) * Math.PI / 180;

      const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(deltaLng/2) * Math.sin(deltaLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = Math.round(R * c);

      // 예상 시간: 평균 시속 25km (대중교통) 기준 + 환승/대기 10분
      const estimatedTime = Math.round(distance / 25000 * 60) + 10;

      console.log(`[get-directions] Transit: returning estimate, distance=${distance}m, time=${estimatedTime}min`);

      result = {
        type: 'transit_estimate',
        distance,
        estimatedTime,
        message: '대중교통 상세 경로는 카카오맵에서 확인하세요',
        kakaoMapUrl: `https://map.kakao.com/link/from/출발지,${origin.lat},${origin.lng}/to/도착지,${destination.lat},${destination.lng}`
      };
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
