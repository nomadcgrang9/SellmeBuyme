/**
 * 클러스터 유틸리티
 * 직방 스타일 지역별 클러스터링을 위한 유틸리티 함수
 */

import type { JobPostingCard } from '@/types';

/**
 * 클러스터 데이터 인터페이스
 */
export interface ClusterData {
  regionKey: string;      // 지역 키 (예: "경기_성남")
  regionName: string;     // 표시명 (예: "성남")
  province: string;       // 광역시도 (예: "경기")
  center: { lat: number; lng: number } | null;
  count: number;
  jobs: JobPostingCard[];
}

/**
 * 지역 추출 결과
 */
interface ExtractedRegion {
  key: string;    // 유니크 키 (예: "경기_성남")
  name: string;   // 표시명 (예: "성남")
  province: string; // 광역시도
}

/**
 * 주요 지역 중심 좌표 (Fallback용)
 * 좌표가 없는 공고들을 위한 기본 좌표
 */
export const REGION_CENTER_COORDS: Record<string, { lat: number; lng: number }> = {
  // 서울
  '서울_종로구': { lat: 37.5729, lng: 126.9793 },
  '서울_중구': { lat: 37.5636, lng: 126.9976 },
  '서울_용산구': { lat: 37.5323, lng: 126.9906 },
  '서울_성동구': { lat: 37.5633, lng: 127.0371 },
  '서울_광진구': { lat: 37.5385, lng: 127.0823 },
  '서울_동대문구': { lat: 37.5744, lng: 127.0396 },
  '서울_중랑구': { lat: 37.6063, lng: 127.0929 },
  '서울_성북구': { lat: 37.5894, lng: 127.0167 },
  '서울_강북구': { lat: 37.6396, lng: 127.0255 },
  '서울_도봉구': { lat: 37.6688, lng: 127.0472 },
  '서울_노원구': { lat: 37.6542, lng: 127.0565 },
  '서울_은평구': { lat: 37.6027, lng: 126.9291 },
  '서울_서대문구': { lat: 37.5791, lng: 126.9368 },
  '서울_마포구': { lat: 37.5663, lng: 126.9014 },
  '서울_양천구': { lat: 37.5169, lng: 126.8664 },
  '서울_강서구': { lat: 37.5509, lng: 126.8495 },
  '서울_구로구': { lat: 37.4954, lng: 126.8875 },
  '서울_금천구': { lat: 37.4566, lng: 126.8954 },
  '서울_영등포구': { lat: 37.5263, lng: 126.8963 },
  '서울_동작구': { lat: 37.5124, lng: 126.9393 },
  '서울_관악구': { lat: 37.4784, lng: 126.9516 },
  '서울_서초구': { lat: 37.4837, lng: 127.0323 },
  '서울_강남구': { lat: 37.5172, lng: 127.0473 },
  '서울_송파구': { lat: 37.5145, lng: 127.1060 },
  '서울_강동구': { lat: 37.5301, lng: 127.1238 },

  // 경기
  '경기_수원': { lat: 37.2636, lng: 127.0286 },
  '경기_성남': { lat: 37.4201, lng: 127.1265 },
  '경기_고양': { lat: 37.6584, lng: 126.8320 },
  '경기_용인': { lat: 37.2411, lng: 127.1775 },
  '경기_부천': { lat: 37.5034, lng: 126.7660 },
  '경기_안산': { lat: 37.3219, lng: 126.8309 },
  '경기_안양': { lat: 37.3943, lng: 126.9568 },
  '경기_남양주': { lat: 37.6360, lng: 127.2165 },
  '경기_화성': { lat: 37.1996, lng: 126.8312 },
  '경기_평택': { lat: 36.9921, lng: 127.1121 },
  '경기_의정부': { lat: 37.7381, lng: 127.0336 },
  '경기_시흥': { lat: 37.3800, lng: 126.8029 },
  '경기_파주': { lat: 37.7597, lng: 126.7797 },
  '경기_광명': { lat: 37.4785, lng: 126.8645 },
  '경기_김포': { lat: 37.6153, lng: 126.7159 },
  '경기_군포': { lat: 37.3617, lng: 126.9352 },
  '경기_광주': { lat: 37.4295, lng: 127.2550 },
  '경기_이천': { lat: 37.2791, lng: 127.4350 },
  '경기_양주': { lat: 37.7854, lng: 127.0459 },
  '경기_오산': { lat: 37.1499, lng: 127.0770 },
  '경기_구리': { lat: 37.5944, lng: 127.1295 },
  '경기_안성': { lat: 37.0079, lng: 127.2797 },
  '경기_포천': { lat: 37.8949, lng: 127.2003 },
  '경기_의왕': { lat: 37.3449, lng: 126.9681 },
  '경기_하남': { lat: 37.5391, lng: 127.2146 },
  '경기_여주': { lat: 37.2981, lng: 127.6375 },
  '경기_양평': { lat: 37.4917, lng: 127.4875 },
  '경기_동두천': { lat: 37.9037, lng: 127.0606 },
  '경기_과천': { lat: 37.4292, lng: 126.9876 },
  '경기_가평': { lat: 37.8315, lng: 127.5096 },
  '경기_연천': { lat: 38.0965, lng: 127.0750 },
  '경기_구리남양주': { lat: 37.6152, lng: 127.1730 },

  // 인천
  '인천_중구': { lat: 37.4736, lng: 126.6214 },
  '인천_동구': { lat: 37.4737, lng: 126.6432 },
  '인천_미추홀구': { lat: 37.4638, lng: 126.6503 },
  '인천_연수구': { lat: 37.4101, lng: 126.6783 },
  '인천_남동구': { lat: 37.4469, lng: 126.7316 },
  '인천_부평구': { lat: 37.5074, lng: 126.7219 },
  '인천_계양구': { lat: 37.5371, lng: 126.7378 },
  '인천_서구': { lat: 37.5451, lng: 126.6759 },
  '인천_강화군': { lat: 37.7469, lng: 126.4879 },
  '인천_옹진군': { lat: 37.4467, lng: 126.6369 },

  // 부산
  '부산_중구': { lat: 35.1064, lng: 129.0323 },
  '부산_서구': { lat: 35.0980, lng: 129.0244 },
  '부산_동구': { lat: 35.1294, lng: 129.0456 },
  '부산_영도구': { lat: 35.0912, lng: 129.0680 },
  '부산_부산진구': { lat: 35.1631, lng: 129.0530 },
  '부산_동래구': { lat: 35.1978, lng: 129.0858 },
  '부산_남구': { lat: 35.1366, lng: 129.0849 },
  '부산_북구': { lat: 35.1972, lng: 128.9903 },
  '부산_해운대구': { lat: 35.1631, lng: 129.1635 },
  '부산_사하구': { lat: 35.1046, lng: 128.9747 },
  '부산_금정구': { lat: 35.2431, lng: 129.0923 },
  '부산_강서구': { lat: 35.2122, lng: 128.9803 },
  '부산_연제구': { lat: 35.1761, lng: 129.0799 },
  '부산_수영구': { lat: 35.1458, lng: 129.1133 },
  '부산_사상구': { lat: 35.1526, lng: 128.9908 },
  '부산_기장군': { lat: 35.2446, lng: 129.2225 },

  // 대구
  '대구_중구': { lat: 35.8695, lng: 128.6061 },
  '대구_동구': { lat: 35.8865, lng: 128.6357 },
  '대구_서구': { lat: 35.8718, lng: 128.5592 },
  '대구_남구': { lat: 35.8461, lng: 128.5976 },
  '대구_북구': { lat: 35.8858, lng: 128.5828 },
  '대구_수성구': { lat: 35.8584, lng: 128.6308 },
  '대구_달서구': { lat: 35.8299, lng: 128.5329 },
  '대구_달성군': { lat: 35.7746, lng: 128.4314 },

  // 광주
  '광주_동구': { lat: 35.1459, lng: 126.9234 },
  '광주_서구': { lat: 35.1520, lng: 126.8895 },
  '광주_남구': { lat: 35.1332, lng: 126.9024 },
  '광주_북구': { lat: 35.1747, lng: 126.9119 },
  '광주_광산구': { lat: 35.1395, lng: 126.7937 },

  // 대전
  '대전_동구': { lat: 36.3119, lng: 127.4549 },
  '대전_중구': { lat: 36.3254, lng: 127.4214 },
  '대전_서구': { lat: 36.3552, lng: 127.3836 },
  '대전_유성구': { lat: 36.3623, lng: 127.3563 },
  '대전_대덕구': { lat: 36.3467, lng: 127.4157 },

  // 울산
  '울산_중구': { lat: 35.5664, lng: 129.3324 },
  '울산_남구': { lat: 35.5443, lng: 129.3302 },
  '울산_동구': { lat: 35.5049, lng: 129.4165 },
  '울산_북구': { lat: 35.5826, lng: 129.3610 },
  '울산_울주군': { lat: 35.5224, lng: 129.0949 },

  // 세종
  '세종': { lat: 36.4801, lng: 127.2892 },

  // 강원
  '강원_춘천': { lat: 37.8813, lng: 127.7298 },
  '강원_원주': { lat: 37.3422, lng: 127.9202 },
  '강원_강릉': { lat: 37.7519, lng: 128.8760 },
  '강원_동해': { lat: 37.5247, lng: 129.1142 },
  '강원_태백': { lat: 37.1640, lng: 128.9856 },
  '강원_속초': { lat: 38.2070, lng: 128.5918 },
  '강원_삼척': { lat: 37.4497, lng: 129.1650 },
  '강원_홍천': { lat: 37.6977, lng: 127.8886 },
  '강원_횡성': { lat: 37.4917, lng: 127.9847 },
  '강원_영월': { lat: 37.1838, lng: 128.4617 },
  '강원_평창': { lat: 37.3708, lng: 128.3903 },
  '강원_정선': { lat: 37.3808, lng: 128.6608 },
  '강원_철원': { lat: 38.1465, lng: 127.3132 },
  '강원_화천': { lat: 38.1063, lng: 127.7082 },
  '강원_양구': { lat: 38.1097, lng: 127.9897 },
  '강원_인제': { lat: 38.0697, lng: 128.1706 },
  '강원_고성': { lat: 38.3802, lng: 128.4677 },
  '강원_양양': { lat: 38.0754, lng: 128.6189 },

  // 충북
  '충북_청주': { lat: 36.6424, lng: 127.4890 },
  '충북_충주': { lat: 36.9910, lng: 127.9259 },
  '충북_제천': { lat: 37.1327, lng: 128.1900 },
  '충북_보은': { lat: 36.4890, lng: 127.7296 },
  '충북_옥천': { lat: 36.3060, lng: 127.5708 },
  '충북_영동': { lat: 36.1746, lng: 127.7833 },
  '충북_증평': { lat: 36.7850, lng: 127.5815 },
  '충북_진천': { lat: 36.8554, lng: 127.4356 },
  '충북_괴산': { lat: 36.8152, lng: 127.7868 },
  '충북_음성': { lat: 36.9400, lng: 127.6906 },
  '충북_단양': { lat: 36.9845, lng: 128.3654 },

  // 충남
  '충남_천안': { lat: 36.8151, lng: 127.1139 },
  '충남_공주': { lat: 36.4465, lng: 127.1190 },
  '충남_보령': { lat: 36.3335, lng: 126.6127 },
  '충남_아산': { lat: 36.7897, lng: 127.0018 },
  '충남_서산': { lat: 36.7847, lng: 126.4503 },
  '충남_논산': { lat: 36.1872, lng: 127.0987 },
  '충남_계룡': { lat: 36.2747, lng: 127.2485 },
  '충남_당진': { lat: 36.8896, lng: 126.6458 },
  '충남_금산': { lat: 36.1086, lng: 127.4881 },
  '충남_부여': { lat: 36.2759, lng: 126.9098 },
  '충남_서천': { lat: 36.0803, lng: 126.6919 },
  '충남_청양': { lat: 36.4591, lng: 126.8022 },
  '충남_홍성': { lat: 36.6012, lng: 126.6608 },
  '충남_예산': { lat: 36.6826, lng: 126.8491 },
  '충남_태안': { lat: 36.7456, lng: 126.2979 },

  // 전북
  '전북_전주': { lat: 35.8242, lng: 127.1480 },
  '전북_군산': { lat: 35.9676, lng: 126.7368 },
  '전북_익산': { lat: 35.9483, lng: 126.9576 },
  '전북_정읍': { lat: 35.5700, lng: 126.8560 },
  '전북_남원': { lat: 35.4164, lng: 127.3903 },
  '전북_김제': { lat: 35.8036, lng: 126.8807 },
  '전북_완주': { lat: 35.9044, lng: 127.1617 },
  '전북_진안': { lat: 35.7918, lng: 127.4247 },
  '전북_무주': { lat: 36.0067, lng: 127.6608 },
  '전북_장수': { lat: 35.6473, lng: 127.5212 },
  '전북_임실': { lat: 35.6178, lng: 127.2889 },
  '전북_순창': { lat: 35.3745, lng: 127.1372 },
  '전북_고창': { lat: 35.4358, lng: 126.7019 },
  '전북_부안': { lat: 35.7316, lng: 126.7331 },

  // 전남
  '전남_목포': { lat: 34.8118, lng: 126.3922 },
  '전남_여수': { lat: 34.7604, lng: 127.6622 },
  '전남_순천': { lat: 34.9506, lng: 127.4872 },
  '전남_나주': { lat: 35.0159, lng: 126.7108 },
  '전남_광양': { lat: 34.9407, lng: 127.6958 },
  '전남_담양': { lat: 35.3211, lng: 126.9883 },
  '전남_곡성': { lat: 35.2822, lng: 127.2922 },
  '전남_구례': { lat: 35.2026, lng: 127.4625 },
  '전남_고흥': { lat: 34.6114, lng: 127.2853 },
  '전남_보성': { lat: 34.7714, lng: 127.0803 },
  '전남_화순': { lat: 35.0644, lng: 126.9869 },
  '전남_장흥': { lat: 34.6814, lng: 126.9069 },
  '전남_강진': { lat: 34.6419, lng: 126.7672 },
  '전남_해남': { lat: 34.5714, lng: 126.5992 },
  '전남_영암': { lat: 34.8003, lng: 126.6969 },
  '전남_무안': { lat: 34.9903, lng: 126.4817 },
  '전남_함평': { lat: 35.0658, lng: 126.5167 },
  '전남_영광': { lat: 35.2772, lng: 126.5119 },
  '전남_장성': { lat: 35.3018, lng: 126.7847 },
  '전남_완도': { lat: 34.3108, lng: 126.7550 },
  '전남_진도': { lat: 34.4867, lng: 126.2628 },
  '전남_신안': { lat: 34.8269, lng: 126.1075 },

  // 경북
  '경북_포항': { lat: 36.0190, lng: 129.3435 },
  '경북_경주': { lat: 35.8562, lng: 129.2247 },
  '경북_김천': { lat: 36.1398, lng: 128.1136 },
  '경북_안동': { lat: 36.5684, lng: 128.7294 },
  '경북_구미': { lat: 36.1196, lng: 128.3443 },
  '경북_영주': { lat: 36.8057, lng: 128.6240 },
  '경북_영천': { lat: 35.9733, lng: 128.9386 },
  '경북_상주': { lat: 36.4108, lng: 128.1590 },
  '경북_문경': { lat: 36.5866, lng: 128.1867 },
  '경북_경산': { lat: 35.8252, lng: 128.7414 },
  '경북_군위': { lat: 36.2428, lng: 128.5728 },
  '경북_의성': { lat: 36.3527, lng: 128.6969 },
  '경북_청송': { lat: 36.4361, lng: 129.0571 },
  '경북_영양': { lat: 36.6667, lng: 129.1125 },
  '경북_영덕': { lat: 36.4150, lng: 129.3656 },
  '경북_청도': { lat: 35.6472, lng: 128.7339 },
  '경북_고령': { lat: 35.7265, lng: 128.2631 },
  '경북_성주': { lat: 35.9191, lng: 128.2828 },
  '경북_칠곡': { lat: 35.9955, lng: 128.4019 },
  '경북_예천': { lat: 36.6572, lng: 128.4525 },
  '경북_봉화': { lat: 36.8931, lng: 128.7325 },
  '경북_울진': { lat: 36.9930, lng: 129.4006 },
  '경북_울릉': { lat: 37.4847, lng: 130.9058 },

  // 경남
  '경남_창원': { lat: 35.2272, lng: 128.6811 },
  '경남_진주': { lat: 35.1800, lng: 128.1076 },
  '경남_통영': { lat: 34.8544, lng: 128.4331 },
  '경남_사천': { lat: 35.0038, lng: 128.0642 },
  '경남_김해': { lat: 35.2284, lng: 128.8894 },
  '경남_밀양': { lat: 35.5039, lng: 128.7468 },
  '경남_거제': { lat: 34.8806, lng: 128.6217 },
  '경남_양산': { lat: 35.3350, lng: 129.0372 },
  '경남_의령': { lat: 35.3224, lng: 128.2617 },
  '경남_함안': { lat: 35.2724, lng: 128.4067 },
  '경남_창녕': { lat: 35.5445, lng: 128.4914 },
  '경남_고성': { lat: 35.0539, lng: 128.3228 },
  '경남_남해': { lat: 34.8376, lng: 127.8923 },
  '경남_하동': { lat: 35.0672, lng: 127.7514 },
  '경남_산청': { lat: 35.4157, lng: 127.8736 },
  '경남_함양': { lat: 35.5202, lng: 127.7253 },
  '경남_거창': { lat: 35.6867, lng: 127.9097 },
  '경남_합천': { lat: 35.5668, lng: 128.1658 },

  // 제주
  '제주_제주시': { lat: 33.4996, lng: 126.5312 },
  '제주_서귀포시': { lat: 33.2541, lng: 126.5601 },
  '제주': { lat: 33.3846, lng: 126.5535 },
};

/**
 * 광역시도 약칭 → 정식명 매핑
 * 크롤러에서 사용하는 모든 형식 포함
 */
const PROVINCE_ALIASES: Record<string, string> = {
  // 서울
  '서울': '서울',
  '서울특별시': '서울',
  '서울시': '서울',
  // 경기
  '경기': '경기',
  '경기도': '경기',
  // 인천
  '인천': '인천',
  '인천광역시': '인천',
  '인천시': '인천',
  // 부산
  '부산': '부산',
  '부산광역시': '부산',
  '부산시': '부산',
  // 대구
  '대구': '대구',
  '대구광역시': '대구',
  '대구시': '대구',
  // 광주 (광역시)
  '광주': '광주',
  '광주광역시': '광주',
  '광주광역': '광주',  // 크롤링 데이터에서 사용되는 형태
  '광주시': '광주',
  // 대전
  '대전': '대전',
  '대전광역시': '대전',
  '대전시': '대전',
  // 울산
  '울산': '울산',
  '울산광역시': '울산',
  '울산시': '울산',
  // 세종
  '세종': '세종',
  '세종특별자치시': '세종',
  '세종시': '세종',
  // 강원
  '강원': '강원',
  '강원도': '강원',
  '강원특별자치도': '강원',
  // 충북
  '충북': '충북',
  '충청북도': '충북',
  '충북도': '충북',
  // 충남
  '충남': '충남',
  '충청남도': '충남',
  '충남도': '충남',
  // 전북
  '전북': '전북',
  '전라북도': '전북',
  '전북특별자치도': '전북',
  '전북도': '전북',
  // 전남
  '전남': '전남',
  '전라남도': '전남',
  '전남도': '전남',
  // 경북
  '경북': '경북',
  '경상북도': '경북',
  '경북도': '경북',
  '경상북': '경북',  // 크롤링 데이터에서 사용되는 형태
  // 경남
  '경남': '경남',
  '경상남도': '경남',
  '경남도': '경남',
  '경상남': '경남',  // 크롤링 데이터에서 사용되는 형태
  // 제주
  '제주': '제주',
  '제주특별자치도': '제주',
  '제주도': '제주',
};

/**
 * 광역시 목록 (시/구 없이 단독으로 사용되는 경우)
 */
const METROPOLITAN_CITIES = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종'];

/**
 * location 문자열에서 지역 정보 추출
 * 다양한 형식 지원:
 * - "경기 성남", "서울 강남구" (공백 구분)
 * - "경기도 성남시", "서울특별시 강남구" (정식 명칭)
 * - "도봉", "성남" (단일 단어)
 * - "부산광역시", "대전", "충청북도" (광역시도 단독)
 * - "광주하남", "동두천양주", "구리남양주" (복합 지역명)
 */
export function extractRegion(location: string | null | undefined): ExtractedRegion | null {
  if (!location) return null;

  let normalized = location.trim();
  if (normalized.length === 0) return null;

  // 특수문자 및 불필요한 공백 정리
  normalized = normalized.replace(/[,·]/g, ' ').replace(/\s+/g, ' ').trim();

  // 0. 크롤러에서 사용하는 특수 복합 지역명 먼저 처리
  const specialRegions: Record<string, { province: string; name: string }> = {
    '광주하남': { province: '경기', name: '광주하남' },
    '동두천양주': { province: '경기', name: '동두천양주' },
    '구리남양주': { province: '경기', name: '구리남양주' },
  };

  for (const [special, info] of Object.entries(specialRegions)) {
    if (normalized.includes(special)) {
      return {
        key: `${info.province}_${info.name}`,
        name: info.name,
        province: info.province,
      };
    }
  }

  // 1. 광역시도 단독 사용 체크 (정확히 일치하는 경우 우선)
  const exactMatch = PROVINCE_ALIASES[normalized];
  if (exactMatch) {
    return {
      key: exactMatch,
      name: exactMatch,
      province: exactMatch,
    };
  }

  // 2. 광역시도로 시작하는 패턴 매칭 (긴 것부터 체크)
  const sortedAliases = Object.entries(PROVINCE_ALIASES)
    .sort((a, b) => b[0].length - a[0].length);

  for (const [alias, province] of sortedAliases) {
    if (normalized.startsWith(alias)) {
      const rest = normalized.slice(alias.length).trim();

      // 광역시도만 있는 경우 (예: "서울", "부산광역시", "충청북도")
      if (!rest || rest.length === 0) {
        return {
          key: province,
          name: province,
          province,
        };
      }

      // 시/구/군 추출
      const regionName = rest.replace(/(특별시|광역시|특별자치시|특별자치도|도|시|군|구)$/g, '').trim();
      const displayName = regionName || province;

      return {
        key: `${province}_${displayName}`,
        name: displayName,
        province,
      };
    }
  }

  // 3. 공백으로 분리 (예: "경기 성남", "서울 강남구")
  const parts = normalized.split(/\s+/);

  if (parts.length >= 2) {
    const firstPart = parts[0];
    const province = PROVINCE_ALIASES[firstPart];

    if (province) {
      const regionParts = parts.slice(1);
      let regionName = regionParts.join('');
      const displayName = regionName.replace(/(시|군|구)$/, '');

      return {
        key: `${province}_${displayName}`,
        name: displayName,
        province,
      };
    }
  }

  // 4. 단일 단어인 경우 (예: "도봉", "성남", "부산")
  const singleWord = parts[0].replace(/(특별시|광역시|특별자치시|특별자치도|도|시|군|구)$/g, '');

  // 광역시 단독 사용 (접미사 제거 후)
  if (METROPOLITAN_CITIES.includes(singleWord)) {
    return {
      key: singleWord,
      name: singleWord,
      province: singleWord,
    };
  }

  // 서울 구 이름
  const seoulGuList = [
    '종로', '중구', '용산', '성동', '광진', '동대문', '중랑', '성북', '강북', '도봉',
    '노원', '은평', '서대문', '마포', '양천', '강서', '구로', '금천', '영등포', '동작',
    '관악', '서초', '강남', '송파', '강동'
  ];

  if (seoulGuList.includes(singleWord)) {
    return {
      key: `서울_${singleWord}`,
      name: singleWord,
      province: '서울',
    };
  }

  // 경기 도시 이름 (크롤러 sources.json의 region 값 포함)
  const gyeonggiCityList = [
    '수원', '성남', '고양', '용인', '부천', '안산', '안양', '남양주', '화성', '평택',
    '의정부', '시흥', '파주', '광명', '김포', '군포', '광주', '이천', '양주', '오산',
    '구리', '안성', '포천', '의왕', '하남', '여주', '양평', '동두천', '과천', '가평',
    '연천', '구리남양주', '광주하남', '동두천양주'
  ];

  if (gyeonggiCityList.includes(singleWord)) {
    return {
      key: `경기_${singleWord}`,
      name: singleWord,
      province: '경기',
    };
  }

  // 강원 도시
  const gangwonList = ['춘천', '원주', '강릉', '동해', '태백', '속초', '삼척', '홍천', '횡성', '영월', '평창', '정선', '철원', '화천', '양구', '인제', '고성', '양양'];
  if (gangwonList.includes(singleWord)) {
    return { key: `강원_${singleWord}`, name: singleWord, province: '강원' };
  }

  // 충북 도시
  const chungbukList = ['청주', '충주', '제천', '보은', '옥천', '영동', '증평', '진천', '괴산', '음성', '단양'];
  if (chungbukList.includes(singleWord)) {
    return { key: `충북_${singleWord}`, name: singleWord, province: '충북' };
  }

  // 충남 도시
  const chungnamList = ['천안', '공주', '보령', '아산', '서산', '논산', '계룡', '당진', '금산', '부여', '서천', '청양', '홍성', '예산', '태안'];
  if (chungnamList.includes(singleWord)) {
    return { key: `충남_${singleWord}`, name: singleWord, province: '충남' };
  }

  // 전북 도시
  const jeonbukList = ['전주', '군산', '익산', '정읍', '남원', '김제', '완주', '진안', '무주', '장수', '임실', '순창', '고창', '부안'];
  if (jeonbukList.includes(singleWord)) {
    return { key: `전북_${singleWord}`, name: singleWord, province: '전북' };
  }

  // 전남 도시
  const jeonnamList = ['목포', '여수', '순천', '나주', '광양', '담양', '곡성', '구례', '고흥', '보성', '화순', '장흥', '강진', '해남', '영암', '무안', '함평', '영광', '장성', '완도', '진도', '신안'];
  if (jeonnamList.includes(singleWord)) {
    return { key: `전남_${singleWord}`, name: singleWord, province: '전남' };
  }

  // 경북 도시
  const gyeongbukList = ['포항', '경주', '김천', '안동', '구미', '영주', '영천', '상주', '문경', '경산', '군위', '의성', '청송', '영양', '영덕', '청도', '고령', '성주', '칠곡', '예천', '봉화', '울진', '울릉'];
  if (gyeongbukList.includes(singleWord)) {
    return { key: `경북_${singleWord}`, name: singleWord, province: '경북' };
  }

  // 경남 도시
  const gyeongnamList = ['창원', '진주', '통영', '사천', '김해', '밀양', '거제', '양산', '의령', '함안', '창녕', '고성', '남해', '하동', '산청', '함양', '거창', '합천'];
  if (gyeongnamList.includes(singleWord)) {
    return { key: `경남_${singleWord}`, name: singleWord, province: '경남' };
  }

  // 부산 구 이름
  const busanGuList = [
    '영도', '부산진', '동래', '해운대', '사하', '금정', '연제', '수영', '사상', '기장'
  ];
  if (busanGuList.includes(singleWord)) {
    return { key: `부산_${singleWord}`, name: singleWord, province: '부산' };
  }

  // 대구 구 이름
  const daeguGuList = ['수성', '달서', '달성'];
  if (daeguGuList.includes(singleWord)) {
    return { key: `대구_${singleWord}`, name: singleWord, province: '대구' };
  }

  // 인천 구 이름
  const incheonGuList = ['미추홀', '연수', '남동', '부평', '계양', '강화', '옹진'];
  if (incheonGuList.includes(singleWord)) {
    return { key: `인천_${singleWord}`, name: singleWord, province: '인천' };
  }

  // 대전 구 이름
  const daejeonGuList = ['유성', '대덕'];
  if (daejeonGuList.includes(singleWord)) {
    return { key: `대전_${singleWord}`, name: singleWord, province: '대전' };
  }

  // 광주 구 이름
  const gwangjuGuList = ['광산'];
  if (gwangjuGuList.includes(singleWord)) {
    return { key: `광주_${singleWord}`, name: singleWord, province: '광주' };
  }

  // 울산 구 이름
  const ulsanGuList = ['울주'];
  if (ulsanGuList.includes(singleWord)) {
    return { key: `울산_${singleWord}`, name: singleWord, province: '울산' };
  }

  // 제주
  if (['제주시', '서귀포', '서귀포시'].includes(singleWord) || singleWord === '제주') {
    return { key: '제주', name: '제주', province: '제주' };
  }

  // 인식 못하면 null 반환 (클러스터에서 제외)
  // 디버깅 로그는 개발 시에만 활성화
  // console.log('[clusterUtils] 지역 인식 실패:', location);
  return null;
}

/**
 * 광역시도 중심 좌표 (클러스터 마커용 - 서로 겹치지 않게 배치)
 */
export const PROVINCE_CENTER_COORDS: Record<string, { lat: number; lng: number }> = {
  '서울': { lat: 37.5665, lng: 126.9780 },
  '경기': { lat: 37.2750, lng: 127.5500 },  // 서울과 겹치지 않게 동쪽으로 이동
  '인천': { lat: 37.4563, lng: 126.4500 },  // 서쪽으로 이동
  '부산': { lat: 35.1796, lng: 129.0756 },
  '대구': { lat: 35.8714, lng: 128.6014 },
  '광주': { lat: 35.1595, lng: 126.8526 },
  '대전': { lat: 36.3504, lng: 127.3845 },
  '울산': { lat: 35.5384, lng: 129.3114 },
  '세종': { lat: 36.4801, lng: 127.2892 },
  '강원': { lat: 37.8228, lng: 128.1555 },
  '충북': { lat: 36.6357, lng: 127.4912 },
  '충남': { lat: 36.5184, lng: 126.8000 },
  '전북': { lat: 35.7175, lng: 127.1530 },
  '전남': { lat: 34.8679, lng: 126.9910 },
  '경북': { lat: 36.4919, lng: 128.8889 },
  '경남': { lat: 35.4606, lng: 128.2132 },
  '제주': { lat: 33.4890, lng: 126.4983 },
};

/**
 * 클러스터링 레벨 타입
 */
export type ClusterLevel = 'province' | 'city';

/**
 * 줌 레벨에 따른 클러스터링 레벨 결정
 * @param zoomLevel 카카오맵 줌 레벨 (1=가장 상세, 14=가장 넓음)
 */
export function getClusterLevel(zoomLevel: number): ClusterLevel {
  // 레벨 9 이상 (넓은 뷰): 광역시도 단위
  // 레벨 7-8: 시/구 단위
  return zoomLevel >= 9 ? 'province' : 'city';
}

/**
 * 공고 목록을 지역별로 그룹화
 * @param jobs 공고 목록
 * @param level 클러스터링 레벨 ('province': 광역시도, 'city': 시/구)
 * @returns 지역별 클러스터 데이터 배열
 */
export function groupJobsByRegion(jobs: JobPostingCard[], level: ClusterLevel = 'city'): ClusterData[] {
  const clusterMap = new Map<string, ClusterData>();

  for (const job of jobs) {
    const region = extractRegion(job.location);
    if (!region) continue;

    // '기타' 지역은 제외
    if (region.province === '기타') continue;

    // 클러스터링 레벨에 따라 키 결정
    const clusterKey = level === 'province' ? region.province : region.key;
    const clusterName = level === 'province' ? region.province : region.name;

    const existing = clusterMap.get(clusterKey);

    if (existing) {
      existing.count++;
      existing.jobs.push(job);

      // 시/구 레벨에서만 좌표 평균 계산 (광역시도 레벨에서는 고정 좌표 사용)
      if (level === 'city' && job.latitude && job.longitude && existing.center) {
        const totalJobs = existing.jobs.length;
        existing.center = {
          lat: existing.center.lat + (job.latitude - existing.center.lat) / totalJobs,
          lng: existing.center.lng + (job.longitude - existing.center.lng) / totalJobs,
        };
      } else if (level === 'city' && job.latitude && job.longitude && !existing.center) {
        existing.center = { lat: job.latitude, lng: job.longitude };
      }
    } else {
      // 새 클러스터 생성
      let center: { lat: number; lng: number } | null = null;

      if (level === 'province') {
        // 광역시도 레벨: 항상 고정 좌표 사용 (겹침 방지)
        center = PROVINCE_CENTER_COORDS[region.province] || null;
      } else {
        // 시/구 레벨: 공고 좌표 또는 지역 중심 좌표
        if (job.latitude && job.longitude) {
          center = { lat: job.latitude, lng: job.longitude };
        } else {
          center = REGION_CENTER_COORDS[region.key] || PROVINCE_CENTER_COORDS[region.province] || null;
        }
      }

      clusterMap.set(clusterKey, {
        regionKey: clusterKey,
        regionName: clusterName,
        province: region.province,
        center,
        count: 1,
        jobs: [job],
      });
    }
  }

  // 클러스터 배열로 변환 및 정렬 (공고 수 많은 순)
  return Array.from(clusterMap.values())
    .filter(c => c.center !== null) // 좌표 없는 클러스터 제외
    .sort((a, b) => b.count - a.count);
}

/**
 * 클러스터 중심 좌표 계산 (좌표 있는 공고들의 평균)
 * @param jobs 공고 목록
 * @returns 중심 좌표 또는 null
 */
export function calculateClusterCenter(jobs: JobPostingCard[]): { lat: number; lng: number } | null {
  const withCoords = jobs.filter(j => j.latitude && j.longitude);

  if (withCoords.length === 0) return null;

  const sumLat = withCoords.reduce((sum, j) => sum + (j.latitude || 0), 0);
  const sumLng = withCoords.reduce((sum, j) => sum + (j.longitude || 0), 0);

  return {
    lat: sumLat / withCoords.length,
    lng: sumLng / withCoords.length,
  };
}

/**
 * 클러스터 모드 전환을 위한 줌 레벨 임계값
 */
export const CLUSTER_ZOOM_THRESHOLD = 7;

/**
 * 현재 줌 레벨이 클러스터 모드인지 확인
 * @param zoomLevel 카카오맵 줌 레벨 (1=가장 상세, 14=가장 넓음)
 */
export function isClusterMode(zoomLevel: number): boolean {
  return zoomLevel >= CLUSTER_ZOOM_THRESHOLD;
}
