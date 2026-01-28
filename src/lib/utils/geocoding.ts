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

    // region_1depth_name: "경기도" → "경기" (광역시/도)
    // region_2depth_name: "성남시" → "성남" (시/군)
    const province = address.region_1depth_name
      .replace(/특별시$/, '')
      .replace(/광역시$/, '')
      .replace(/특별자치시$/, '')
      .replace(/특별자치도$/, '')
      .replace(/도$/, ''); // "경기도" → "경기", "서울특별시" → "서울"
    const city = address.region_2depth_name.replace(/시$|군$/, ''); // "성남시" → "성남"

    console.log('✅ [정규화 후]');
    console.log('  - city (광역):', province);
    console.log('  - district (시군):', city);

    return {
      city: province,   // "경기" (대시보드 ALL_REGIONS와 매칭)
      district: city,   // "성남"
    };
  } catch (error) {
    console.error('Geocoding error:', error);
    // Fallback: 좌표 범위로 대략적 지역 추정
    return getCityFromCoordinates(lat, lng);
  }
}

/**
 * Fallback: API 오류 시 좌표 범위로 광역시/도 추정
 */
function getCityFromCoordinates(lat: number, lng: number): KakaoAddress {
  // 광역시/도 단위 좌표 범위 (대시보드 ALL_REGIONS와 매칭)
  const provinceRanges = [
    { province: '서울', lat: [37.45, 37.65], lng: [126.8, 127.2] },
    { province: '인천', lat: [37.35, 37.55], lng: [126.5, 126.8] },
    { province: '경기', lat: [36.9, 38.2], lng: [126.5, 127.8] },
    { province: '부산', lat: [35.0, 35.3], lng: [128.8, 129.3] },
    { province: '대구', lat: [35.7, 36.0], lng: [128.4, 128.8] },
    { province: '광주', lat: [35.0, 35.25], lng: [126.7, 127.0] },
    { province: '대전', lat: [36.2, 36.5], lng: [127.2, 127.5] },
    { province: '울산', lat: [35.4, 35.7], lng: [129.0, 129.5] },
    { province: '세종', lat: [36.4, 36.7], lng: [127.0, 127.3] },
    { province: '강원', lat: [37.0, 38.5], lng: [127.5, 129.5] },
    { province: '충북', lat: [36.4, 37.2], lng: [127.2, 128.2] },
    { province: '충남', lat: [36.0, 36.9], lng: [126.0, 127.3] },
    { province: '전북', lat: [35.3, 36.2], lng: [126.3, 127.5] },
    { province: '전남', lat: [34.0, 35.5], lng: [126.0, 127.8] },
    { province: '경북', lat: [35.5, 37.2], lng: [128.0, 130.0] },
    { province: '경남', lat: [34.5, 35.8], lng: [127.5, 129.5] },
    { province: '제주', lat: [33.0, 34.0], lng: [126.0, 127.0] },
  ];

  for (const range of provinceRanges) {
    if (
      lat >= range.lat[0] && lat <= range.lat[1] &&
      lng >= range.lng[0] && lng <= range.lng[1]
    ) {
      return { city: range.province, district: '' };
    }
  }

  // 매칭 실패 시 빈 값 반환
  return { city: '', district: '' };
}
