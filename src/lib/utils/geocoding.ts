const KAKAO_REST_API_KEY = import.meta.env.VITE_KAKAO_REST_API_KEY;

interface KakaoAddress {
  city: string; // "성남"
  district: string; // "분당"
}

interface KakaoAddressDetail {
  region_1depth_name: string; // "경기도" 또는 "경기"
  region_2depth_name: string; // "성남시" 또는 "안성시"
  region_3depth_name: string; // "분당구" 또는 "죽산면"
}

interface KakaoGeocodingResponse {
  documents: Array<{
    address: KakaoAddressDetail | null; // 지번 주소 (없을 수 있음)
    road_address: KakaoAddressDetail | null; // 도로명 주소 (없을 수 있음)
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

    const doc = data.documents[0];
    // address가 null일 수 있음 (특정 좌표에서 지번 주소가 없는 경우)
    // road_address를 fallback으로 사용
    const addressData = doc.address || doc.road_address;

    if (!addressData || !addressData.region_1depth_name) {
      return getCityFromCoordinates(lat, lng);
    }


    // region_1depth_name: "경기도" → "경기" (광역시/도)
    // region_2depth_name: "성남시" → "성남" (시/군)
    const province = addressData.region_1depth_name
      .replace(/특별시$/, '')
      .replace(/광역시$/, '')
      .replace(/특별자치시$/, '')
      .replace(/특별자치도$/, '')
      .replace(/도$/, ''); // "경기도" → "경기", "서울특별시" → "서울"
    const city = addressData.region_2depth_name?.replace(/시$|군$/, '') || ''; // "성남시" → "성남"


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

// ========================================
// 주소 → 좌표 변환 (Forward Geocoding)
// ========================================

declare global {
  interface Window {
    kakao: any;
  }
}

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 주소를 좌표로 변환 (Geocoding)
 * 랜덤 오프셋을 적용하여 정확한 위치 노출 방지 (개인정보 보호)
 *
 * @param address - 전체 주소 문자열 (예: "경기도 용인시 기흥구")
 * @param offsetMeters - 랜덤 오프셋 범위 (미터 단위, 기본값: 500m)
 * @returns Promise<Coordinates> - 랜덤 오프셋이 적용된 좌표
 */
export async function getRandomizedCoordsFromAddress(
  address: string,
  offsetMeters: number = 500
): Promise<Coordinates> {
  return new Promise((resolve, reject) => {
    if (!window.kakao?.maps?.services) {
      reject(new Error('Kakao Maps API가 로드되지 않았습니다.'));
      return;
    }

    const geocoder = new window.kakao.maps.services.Geocoder();
    geocoder.addressSearch(address, (result: any[], status: any) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { x, y } = result[0];

        // 미터를 위도/경도 오프셋으로 변환 (대략적 계산)
        // 위도 1도 ≈ 111km, 경도 1도 ≈ 88km (한국 기준)
        const latOffset = offsetMeters / 111000;
        const lngOffset = offsetMeters / 88000;

        // 랜덤 오프셋 생성 (-1 ~ 1 범위)
        const randomLat = (Math.random() - 0.5) * 2 * latOffset;
        const randomLng = (Math.random() - 0.5) * 2 * lngOffset;

        resolve({
          lat: parseFloat(y) + randomLat,
          lng: parseFloat(x) + randomLng
        });
      } else {
        reject(new Error('주소를 찾을 수 없습니다.'));
      }
    });
  });
}

/**
 * 좌표가 유효한 한국 영역 범위 내인지 확인
 * (한국 영역 대략적 범위: 33°~43° N, 124°~132° E)
 */
export function isValidKoreaCoords(coords: Coordinates): boolean {
  return (
    coords.lat >= 33 && coords.lat <= 43 &&
    coords.lng >= 124 && coords.lng <= 132
  );
}
