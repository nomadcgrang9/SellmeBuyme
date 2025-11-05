const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;

interface KakaoAddress {
  city: string; // "성남"
  district: string; // "분당"
}

interface KakaoGeocodingResponse {
  documents: Array<{
    address: {
      region_1depth_name: string; // "경기도"
      region_2depth_name: string; // "성남시"
      region_3depth_name: string; // "분당구"
    };
  }>;
}

/**
 * 좌표를 주소로 변환 (Reverse Geocoding)
 */
export async function reverseGeocode(lat: number, lng: number): Promise<KakaoAddress> {
  if (!KAKAO_REST_API_KEY) {
    throw new Error('Kakao API key not configured');
  }

  try {
    const response = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2address.json?x=${lng}&y=${lat}`,
      {
        headers: {
          Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error('Geocoding API request failed');
    }

    const data: KakaoGeocodingResponse = await response.json();

    if (!data.documents || data.documents.length === 0) {
      // Fallback: 좌표 범위로 대략적 지역 추정
      return getCityFromCoordinates(lat, lng);
    }

    const address = data.documents[0].address;

    console.log('🗺️ [Kakao API 응답]');
    console.log('  - region_1depth_name:', address.region_1depth_name);
    console.log('  - region_2depth_name:', address.region_2depth_name);
    console.log('  - region_3depth_name:', address.region_3depth_name);

    // region_2depth_name: "성남시"
    // region_3depth_name: "분당구"
    const city = address.region_2depth_name.replace(/시$/, ''); // "성남시" → "성남"
    const district = address.region_3depth_name.replace(/구$/, ''); // "분당구" → "분당"

    console.log('✅ [정규화 후]');
    console.log('  - city:', city);
    console.log('  - district:', district);

    return {
      city,      // "성남"
      district,  // "분당"
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback: 좌표 범위로 대략적 지역 추정
    return getCityFromCoordinates(lat, lng);
  }
}

/**
 * Fallback: API 오류 시 좌표 범위로 지역 추정
 */
function getCityFromCoordinates(lat: number, lng: number): KakaoAddress {
  // 경기도 주요 도시 좌표 범위 (대략적)
  const cityRanges = [
    { city: '성남', lat: [37.3, 37.5], lng: [127.0, 127.2] },
    { city: '수원', lat: [37.2, 37.35], lng: [126.9, 127.1] },
    { city: '의정부', lat: [37.7, 37.8], lng: [127.0, 127.15] },
    { city: '안양', lat: [37.35, 37.45], lng: [126.9, 127.0] },
    { city: '부천', lat: [37.48, 37.55], lng: [126.75, 126.85] },
    { city: '광명', lat: [37.45, 37.5], lng: [126.85, 126.9] },
    { city: '평택', lat: [36.95, 37.05], lng: [127.0, 127.15] },
    { city: '동두천', lat: [37.9, 38.0], lng: [127.05, 127.15] },
    { city: '안산', lat: [37.3, 37.35], lng: [126.8, 126.9] },
    { city: '고양', lat: [37.6, 37.7], lng: [126.75, 126.9] },
    { city: '과천', lat: [37.42, 37.45], lng: [126.98, 127.02] },
    { city: '구리', lat: [37.58, 37.62], lng: [127.12, 127.16] },
    { city: '남양주', lat: [37.6, 37.7], lng: [127.1, 127.3] },
    { city: '오산', lat: [37.13, 37.18], lng: [127.05, 127.1] },
    { city: '시흥', lat: [37.35, 37.45], lng: [126.75, 126.85] },
    { city: '군포', lat: [37.35, 37.4], lng: [126.93, 126.98] },
    { city: '의왕', lat: [37.32, 37.37], lng: [126.95, 127.0] },
    { city: '하남', lat: [37.52, 37.57], lng: [127.18, 127.24] },
    { city: '용인', lat: [37.2, 37.35], lng: [127.1, 127.3] },
    { city: '파주', lat: [37.75, 37.85], lng: [126.7, 126.85] },
    { city: '이천', lat: [37.25, 37.3], lng: [127.4, 127.5] },
    { city: '안성', lat: [37.0, 37.05], lng: [127.25, 127.35] },
    { city: '김포', lat: [37.6, 37.7], lng: [126.6, 126.75] },
    { city: '화성', lat: [37.15, 37.25], lng: [126.9, 127.1] },
    { city: '광주', lat: [37.4, 37.45], lng: [127.25, 127.3] },
    { city: '양주', lat: [37.75, 37.85], lng: [127.0, 127.1] },
    { city: '포천', lat: [37.85, 37.95], lng: [127.15, 127.25] },
    { city: '여주', lat: [37.25, 37.35], lng: [127.6, 127.7] },
    { city: '연천', lat: [38.05, 38.15], lng: [127.05, 127.15] },
    { city: '가평', lat: [37.8, 37.9], lng: [127.45, 127.55] },
    { city: '양평', lat: [37.45, 37.55], lng: [127.45, 127.55] },
    // 서울
    { city: '서울', lat: [37.45, 37.65], lng: [126.8, 127.2] },
    // 인천
    { city: '인천', lat: [37.35, 37.55], lng: [126.5, 126.8] },
  ];

  for (const range of cityRanges) {
    if (
      lat >= range.lat[0] && lat <= range.lat[1] &&
      lng >= range.lng[0] && lng <= range.lng[1]
    ) {
      return { city: range.city, district: '' };
    }
  }

  // 매칭 실패 시 빈 값 반환
  return { city: '', district: '' };
}
