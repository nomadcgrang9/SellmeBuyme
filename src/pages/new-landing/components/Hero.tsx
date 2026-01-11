import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { SCHOOL_LEVELS } from '../constants';
import { useKakaoMaps } from '@/hooks/useKakaoMaps';
import { fetchJobsByBoardRegion } from '@/lib/supabase/queries';
import type { JobPostingCard } from '@/types';

export const Hero: React.FC = () => {
  // 지도 필터 옵션 (드롭다운과 동일)
  const MAP_FILTER_JOB_TYPES = ['기간제', '교사', '시간강사', '강사', '기타'] as const;
  const MAP_FILTER_SUBJECTS = ['국어', '영어', '수학', '사회', '과학', '체육', '음악', '미술', '정보', '보건', '사서', '상담'] as const;

  // 지도 필터 상태
  const [mapFilters, setMapFilters] = useState<{
    schoolLevels: string[];
    jobTypes: string[];
    subjects: string[];
  }>({
    schoolLevels: [],
    jobTypes: [],
    subjects: [],
  });

  // 필터 토글 핸들러
  const toggleMapFilter = (category: 'schoolLevels' | 'jobTypes' | 'subjects', value: string) => {
    setMapFilters(prev => ({
      ...prev,
      [category]: prev[category].includes(value)
        ? prev[category].filter(v => v !== value)
        : [...prev[category], value]
    }));
  };

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { isLoaded, loadKakaoMaps } = useKakaoMaps();

  // 사용자 위치 상태
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSearchQuery, setLocationSearchQuery] = useState('');
  const [activeLocationFilter, setActiveLocationFilter] = useState<string | null>(null); // 활성화된 지역 필터

  // 공고 데이터 상태
  const [jobPostings, setJobPostings] = useState<JobPostingCard[]>([]);
  const [markerCount, setMarkerCount] = useState(0); // 실제 생성된 마커 개수
  const mapMarkersRef = useRef<any[]>([]);
  const coordsCacheRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // 필터가 적용된 공고 데이터 (queries.ts 로직과 동일)
  const filteredJobPostings = useMemo(() => {
    let filtered = jobPostings;

    // 학교급 필터 (school_level 먼저 확인, NULL인 경우 organization에서 추론 - queries.ts와 동일한 로직)
    if (mapFilters.schoolLevels.length > 0) {
      filtered = filtered.filter(job => {
        const schoolLevel = (job.school_level || '').toLowerCase();
        const hasSchoolLevel = schoolLevel.length > 0; // school_level 필드가 있는지 확인
        const org = (job.organization || '').toLowerCase();

        return mapFilters.schoolLevels.some(level => {
          if (level === '유치원') {
            // school_level에서 유치원 검색 또는 school_level이 없으면 organization에서 검색
            return schoolLevel.includes('유치원') ||
                   (!hasSchoolLevel && org.includes('유치원'));
          }
          if (level === '초등학교') {
            return schoolLevel.includes('초등') ||
                   (!hasSchoolLevel && org.includes('초등'));
          }
          if (level === '중학교') {
            return schoolLevel.includes('중학') || schoolLevel.includes('중등') ||
                   (!hasSchoolLevel && (org.includes('중학') || org.includes('중등')));
          }
          if (level === '고등학교') {
            return schoolLevel.includes('고등') || schoolLevel.includes('고교') ||
                   (!hasSchoolLevel && (org.includes('고등') || org.includes('고교')));
          }
          if (level === '특수학교') {
            return schoolLevel.includes('특수') ||
                   (!hasSchoolLevel && org.includes('특수'));
          }
          if (level === '기타') {
            // 유/초/중/고/특수 어디에도 해당하지 않는 경우
            const schoolLevelHasKeyword = schoolLevel.includes('유치원') || schoolLevel.includes('초등') ||
              schoolLevel.includes('중학') || schoolLevel.includes('중등') ||
              schoolLevel.includes('고등') || schoolLevel.includes('고교') || schoolLevel.includes('특수');

            if (hasSchoolLevel) {
              // school_level이 있으면 school_level에서 키워드 확인
              return !schoolLevelHasKeyword;
            } else {
              // school_level이 없으면 organization에서 키워드 확인
              return !org.includes('유치원') && !org.includes('초등') &&
                     !org.includes('중학') && !org.includes('중등') &&
                     !org.includes('고등') && !org.includes('고교') &&
                     !org.includes('특수');
            }
          }
          return false;
        });
      });
    }

    // 유형 필터 (queries.ts와 동일한 로직)
    if (mapFilters.jobTypes.length > 0) {
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const tags = job.tags || [];
        const tagsLower = tags.map(t => t.toLowerCase());

        return mapFilters.jobTypes.some(type => {
          if (type === '기간제') {
            // 기간제 키워드 검색 (실무사 제외)
            return (title.includes('기간제') && !title.includes('실무사')) ||
                   tagsLower.some(t => t.includes('기간제'));
          }
          if (type === '시간강사') {
            // 시간강사/시간제 강사 키워드 검색
            return title.includes('시간강사') || title.includes('시간제 강사') ||
                   tagsLower.some(t => t.includes('시간강사'));
          }
          if (type === '교사') {
            // 교사/기간제/시간강사 + 특수교육/상담/영양/과목명 관련 공고 (실무사 제외)
            const isTeacherKeyword = (title.includes('교사') || title.includes('기간제') ||
                                      title.includes('시간강사') || title.includes('시간제 강사')) &&
                                     !title.includes('실무사');
            const hasTeacherTag = tagsLower.some(t => t.includes('기간제') || t.includes('시간강사'));
            // 특수교육 패턴 (실무사 제외)
            const isSpecialEd = (title.includes('특수') && !title.includes('실무사'));
            // 상담/영양 (실무사 제외)
            const isCounseling = (title.includes('상담') || title.includes('영양')) && !title.includes('실무사');
            // 과목명 (실무사 제외)
            const hasSubject = ['국어', '영어', '수학', '사회', '과학', '체육', '음악', '미술', '정보', '보건', '실과', '도덕']
              .some(s => title.includes(s)) && !title.includes('실무사');
            return isTeacherKeyword || hasTeacherTag || isSpecialEd || isCounseling || hasSubject;
          }
          if (type === '강사') {
            // 강사 키워드 검색 (시간강사/시간제 강사 제외) + 지도자
            const isInstructor = title.includes('강사') &&
                                 !title.includes('시간강사') && !title.includes('시간제 강사');
            const isLeader = title.includes('지도자');
            return isInstructor || isLeader;
          }
          if (type === '기타') {
            // 알려진 모든 유형에 해당하지 않는 공고
            const hasKnownTag = tagsLower.some(t => t.includes('기간제') || t.includes('시간강사'));
            const hasKnownKeyword = title.includes('기간제') || title.includes('교사') ||
                                    title.includes('강사') || title.includes('지도자');
            return !hasKnownTag && !hasKnownKeyword;
          }
          return false;
        });
      });
    }

    // 과목 필터 (title 부분매칭 + tags 정확매칭 - queries.ts와 동일)
    if (mapFilters.subjects.length > 0) {
      filtered = filtered.filter(job => {
        const title = (job.title || '').toLowerCase();
        const tags = job.tags || [];

        return mapFilters.subjects.some(subject => {
          const subLower = subject.toLowerCase();
          // title은 부분 매칭, tags는 정확 매칭 (중국어 등 제외)
          return title.includes(subLower) || tags.some(t => t.toLowerCase() === subLower);
        });
      });
    }

    // 주소 검색 키워드 필터 (activeLocationFilter가 있으면 해당 키워드가 포함된 공고만 표시)
    // 단, 광역시/도 수준의 검색어는 필터링 스킵 (이미 해당 지역 공고만 로드됨)
    if (activeLocationFilter) {
      // 광역시/도 목록 (이 키워드만 있으면 필터링 스킵)
      const provinceKeywords = ['서울', '세종', '인천', '대전', '광주', '대구', '울산', '부산', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

      // 검색어에서 핵심 키워드 추출 (예: "경기도 수원시" → ["경기", "수원"])
      const searchKeywords = activeLocationFilter
        .replace(/특별시|광역시|특별자치시|특별자치도|도|시|구|군/g, ' ')
        .split(/\s+/)
        .filter(k => k.length >= 2); // 2글자 이상만

      // 광역시/도만 검색한 경우 필터링 스킵
      const isProvinceOnlySearch = searchKeywords.length === 1 &&
        provinceKeywords.some(p => p === searchKeywords[0]);

      if (searchKeywords.length > 0 && !isProvinceOnlySearch) {
        // 가장 구체적인 키워드(마지막)로 필터링 (예: "수원")
        const specificKeyword = searchKeywords[searchKeywords.length - 1].toLowerCase();

        filtered = filtered.filter(job => {
          const org = (job.organization || '').toLowerCase();
          const loc = (job.location || '').toLowerCase();
          const title = (job.title || '').toLowerCase();

          return org.includes(specificKeyword) ||
                 loc.includes(specificKeyword) ||
                 title.includes(specificKeyword);
        });
      }
    }

    return filtered;
  }, [jobPostings, mapFilters, activeLocationFilter]);

  // Load Kakao Maps SDK
  useEffect(() => {
    loadKakaoMaps();
  }, [loadKakaoMaps]);

  // 주소 검색 핸들러
  const handleLocationSearch = useCallback(() => {
    if (!locationSearchQuery.trim() || !isLoaded) return;

    const searchQuery = locationSearchQuery.trim();
    const geocoder = new window.kakao.maps.services.Geocoder();

    geocoder.addressSearch(searchQuery, (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const { y: lat, x: lng } = result[0];
        setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
        setActiveLocationFilter(searchQuery); // 검색어 저장
        setLocationSearchQuery('');
      } else {
        const places = new window.kakao.maps.services.Places();
        places.keywordSearch(searchQuery, (result: any[], status: string) => {
          if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
            const { y: lat, x: lng } = result[0];
            setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
            setActiveLocationFilter(searchQuery); // 검색어 저장
            setLocationSearchQuery('');
          }
        });
      }
    });
  }, [locationSearchQuery, isLoaded]);

  // 지역 필터 취소 핸들러 (지도 위치는 유지, 필터만 해제)
  const clearLocationFilter = useCallback(() => {
    setActiveLocationFilter(null);
    // 지도 위치와 공고 데이터는 유지 - 필터만 해제하여 전체 공고 표시
  }, []);

  // 기본 위치 (서울)
  const defaultLocation = { lat: 37.5665, lng: 126.9780 };
  const mapCenter = userLocation || defaultLocation;

  // Initialize map (바로 인터랙티브하게)
  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || mapInstanceRef.current) return;

    const center = new window.kakao.maps.LatLng(mapCenter.lat, mapCenter.lng);

    const mapOption = {
      center: center,
      level: 5,
      draggable: true,
      scrollwheel: true,
      disableDoubleClickZoom: false,
    };

    const map = new window.kakao.maps.Map(mapContainerRef.current, mapOption);
    mapInstanceRef.current = map;

    // 줌 컨트롤 추가
    const zoomControl = new window.kakao.maps.ZoomControl();
    map.addControl(zoomControl, window.kakao.maps.ControlPosition.RIGHT);

    // 지도 이동 완료 시 해당 위치 공고 로드
    window.kakao.maps.event.addListener(map, 'dragend', () => {
      const center = map.getCenter();
      const lat = center.getLat();
      const lng = center.getLng();

      // 역지오코딩으로 지역명 추출
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2RegionCode(lng, lat, (result: any[], status: string) => {
        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          // 시/도 단위 추출 (예: 서울특별시 → 서울)
          const region = result[0];
          const regionName = (region.region_1depth_name || '')
            .replace(/특별시$/, '')
            .replace(/광역시$/, '')
            .replace(/특별자치시$/, '')
            .replace(/특별자치도$/, '')
            .replace(/도$/, '');

          console.log('[Hero] 🗺️ 지도 이동 감지, 새 지역:', regionName);
          loadJobPostings(regionName);
        }
      });
    });

    // 기본 위치(서울) 공고 로드
    loadJobPostings('서울');
  }, [isLoaded, mapCenter.lat, mapCenter.lng]);

  // 사용자 위치 변경 시 지도 중심 업데이트
  useEffect(() => {
    if (!mapInstanceRef.current || !userLocation) return;
    const newCenter = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);
    mapInstanceRef.current.setCenter(newCenter);
  }, [userLocation]);

  // 공고 로드 함수
  const loadJobPostings = async (regionName: string) => {
    try {
      console.log('[Hero] 공고 데이터 로드 시작, 지역:', regionName);
      const jobs = await fetchJobsByBoardRegion(regionName, 250);
      console.log('[Hero] 공고 데이터 로드 완료:', jobs.length, '개');
      setJobPostings(jobs);
    } catch (error) {
      console.error('[Hero] 공고 데이터 로드 실패:', error);
    }
  };

  // 사용자 위치 기반 공고 데이터 가져오기
  useEffect(() => {
    if (!isLoaded || !userLocation || !mapInstanceRef.current) return;

    const geocoder = new window.kakao.maps.services.Geocoder();
    const coords = new window.kakao.maps.LatLng(userLocation.lat, userLocation.lng);

    geocoder.coord2RegionCode(coords.getLng(), coords.getLat(), (result: any[], status: string) => {
      if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
        const region = result.find((r: any) => r.region_type === 'H') || result[0];
        const regionName = region.region_1depth_name;

        const simplifiedRegion = regionName
          .replace(/특별시$/, '')
          .replace(/광역시$/, '')
          .replace(/특별자치시$/, '')
          .replace(/특별자치도$/, '')
          .replace(/도$/, '');

        loadJobPostings(simplifiedRegion);
      }
    });
  }, [isLoaded, userLocation]);

  // 공고 마커 표시 (필터 적용, 캐싱 + 순차 처리)
  useEffect(() => {
    if (!isLoaded || !mapInstanceRef.current) return;

    // 기존 마커 정리
    mapMarkersRef.current.forEach(marker => {
      marker.setMap(null);
    });
    mapMarkersRef.current = [];
    setMarkerCount(0); // 마커 카운트 초기화

    // 필터된 공고가 없으면 종료
    if (filteredJobPostings.length === 0) {
      return;
    }

    const map = mapInstanceRef.current;
    const places = new window.kakao.maps.services.Places();
    const cache = coordsCacheRef.current;
    let cancelled = false;
    let currentInfowindow: any = null;

    // 좌표별 공고 그룹 (같은 위치의 여러 공고 추적)
    const coordsJobsMap = new Map<string, JobPostingCard[]>();
    // 좌표별 마커 추적
    const coordsMarkerMap = new Map<string, any>();

    // 마커 생성 함수
    const createMarker = (coords: { lat: number; lng: number }, job: JobPostingCard) => {
      if (cancelled) return;

      const coordKey = `${coords.lat.toFixed(5)},${coords.lng.toFixed(5)}`;

      // 해당 좌표에 공고 추가
      if (!coordsJobsMap.has(coordKey)) {
        coordsJobsMap.set(coordKey, []);
      }
      coordsJobsMap.get(coordKey)!.push(job);

      // 이미 같은 위치에 마커가 있으면 약간 오프셋 추가
      let finalCoords = coords;
      if (coordsMarkerMap.has(coordKey)) {
        // 랜덤 오프셋 추가 (약 30-50m 정도)
        const offsetLat = (Math.random() - 0.5) * 0.0005;
        const offsetLng = (Math.random() - 0.5) * 0.0005;
        finalCoords = { lat: coords.lat + offsetLat, lng: coords.lng + offsetLng };
      }

      const position = new window.kakao.maps.LatLng(finalCoords.lat, finalCoords.lng);

      const marker = new window.kakao.maps.Marker({
        position: position,
        map: map,
      });

      mapMarkersRef.current.push(marker);
      coordsMarkerMap.set(coordKey, marker);
      setMarkerCount(prev => prev + 1);

      // 인포윈도우 내용 생성 함수 (해당 위치의 모든 공고 표시)
      const createInfoContent = () => {
        const jobPostings = coordsJobsMap.get(coordKey) || [job];
        if (jobPostings.length === 1) {
          // 단일 공고
          const singleJob = jobPostings[0];
          return `
            <div style="padding:8px 12px;min-width:180px;max-width:280px;font-family:sans-serif;">
              <div style="font-size:11px;color:#666;margin-bottom:4px;">${singleJob.organization || ''}</div>
              <div style="font-size:13px;font-weight:600;color:#333;line-height:1.3;margin-bottom:6px;">${(singleJob.title || '').slice(0, 35)}${(singleJob.title || '').length > 35 ? '...' : ''}</div>
              <div style="display:flex;gap:4px;flex-wrap:wrap;">
                ${singleJob.daysLeft !== undefined ? `<span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${singleJob.daysLeft <= 3 ? '#FEE2E2' : '#E0E7FF'};color:${singleJob.daysLeft <= 3 ? '#DC2626' : '#4F46E5'};">D-${singleJob.daysLeft}</span>` : ''}
              </div>
            </div>
          `;
        } else {
          // 여러 공고 (스크롤 가능한 리스트)
          const jobItems = jobPostings.map((j, idx) => `
            <div style="padding:8px 0;${idx > 0 ? 'border-top:1px solid #eee;' : ''}">
              <div style="font-size:10px;color:#666;margin-bottom:2px;">${j.organization || ''}</div>
              <div style="font-size:12px;font-weight:600;color:#333;line-height:1.3;margin-bottom:4px;">${(j.title || '').slice(0, 30)}${(j.title || '').length > 30 ? '...' : ''}</div>
              ${j.daysLeft !== undefined ? `<span style="font-size:9px;padding:2px 5px;border-radius:3px;background:${j.daysLeft <= 3 ? '#FEE2E2' : '#E0E7FF'};color:${j.daysLeft <= 3 ? '#DC2626' : '#4F46E5'};">D-${j.daysLeft}</span>` : ''}
            </div>
          `).join('');

          return `
            <div style="padding:8px 12px;min-width:200px;max-width:300px;font-family:sans-serif;">
              <div style="font-size:12px;font-weight:bold;color:#5B6EF7;margin-bottom:8px;padding-bottom:6px;border-bottom:2px solid #5B6EF7;">
                이 위치 공고 ${jobPostings.length}개
              </div>
              <div style="max-height:200px;overflow-y:auto;">
                ${jobItems}
              </div>
            </div>
          `;
        }
      };

      const infowindow = new window.kakao.maps.InfoWindow({
        content: createInfoContent(),
        removable: true,
      });

      window.kakao.maps.event.addListener(marker, 'click', () => {
        if (currentInfowindow) currentInfowindow.close();
        // 클릭 시 최신 공고 목록으로 인포윈도우 내용 업데이트
        infowindow.setContent(createInfoContent());
        infowindow.open(map, marker);
        currentInfowindow = infowindow;
      });
    };

    // 순차 처리 (API 부하 방지)
    let index = 0;
    let failedCount = 0;
    const processNext = () => {
      if (cancelled || index >= filteredJobPostings.length) {
        if (index >= filteredJobPostings.length) {
          console.log(`[Hero] 마커 생성 완료: 성공 ${filteredJobPostings.length - failedCount}개, 실패 ${failedCount}개`);
        }
        return;
      }

      const job = filteredJobPostings[index];
      index++;

      const keyword = job.organization || job.location;
      if (!keyword) {
        console.log('[Hero] 마커 생성 스킵 (keyword 없음):', job.title);
        failedCount++;
        setTimeout(processNext, 30);
        return;
      }

      // 캐시 확인
      if (cache.has(keyword)) {
        createMarker(cache.get(keyword)!, job);
        setTimeout(processNext, 30);
        return;
      }

      // API 검색
      places.keywordSearch(keyword, (result: any[], status: string) => {
        if (cancelled) return;

        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
          const coords = { lat: parseFloat(result[0].y), lng: parseFloat(result[0].x) };
          cache.set(keyword, coords);
          createMarker(coords, job);
        } else {
          // 검색 실패 시 location 필드로 재시도
          if (job.location && job.location !== keyword) {
            places.keywordSearch(job.location, (result2: any[], status2: string) => {
              if (cancelled) return;
              if (status2 === window.kakao.maps.services.Status.OK && result2.length > 0) {
                const coords = { lat: parseFloat(result2[0].y), lng: parseFloat(result2[0].x) };
                cache.set(keyword, coords);
                createMarker(coords, job);
              } else {
                console.log('[Hero] 마커 생성 실패:', job.organization, '|', job.location, '| status:', status2);
                failedCount++;
              }
              setTimeout(processNext, 30);
            });
            return;
          } else {
            // location으로 재시도 불가
            console.log('[Hero] 마커 생성 실패:', keyword, '| location 없음 | status:', status);
            failedCount++;
          }
        }
        setTimeout(processNext, 30);
      });
    };

    processNext();

    return () => {
      cancelled = true;
      if (currentInfowindow) currentInfowindow.close();
      mapMarkersRef.current.forEach(marker => marker.setMap(null));
      mapMarkersRef.current = [];
    };
  }, [isLoaded, filteredJobPostings]);

  return (
    <section className="h-full w-full relative">
      {/* 지도 영역 */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full" />

      {/* 필터 패널 - 플로팅 */}
      <div className="absolute top-4 right-4 w-[220px] bg-white/95 backdrop-blur-sm z-10 rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        {/* 필터 헤더 */}
        <div className="px-4 py-3 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 text-sm">지도 필터</h4>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {markerCount}/{filteredJobPostings.length}개
            </span>
          </div>
        </div>

        {/* 필터 내용 */}
        <div className="p-4 space-y-4 max-h-[calc(100vh-200px)] overflow-y-auto">
          {/* 주소 검색 */}
          <div>
            <h5 className="text-xs font-semibold text-gray-500 mb-1.5">주소 검색</h5>
            <div className="relative">
              {activeLocationFilter ? (
                <div className="w-full px-2 py-1.5 text-xs border border-[#5B6EF7] bg-[#5B6EF7]/10 rounded-lg flex items-center justify-between">
                  <span className="text-[#5B6EF7] font-medium truncate">{activeLocationFilter}</span>
                  <button
                    onClick={clearLocationFilter}
                    className="ml-1 p-0.5 text-[#5B6EF7] hover:text-red-500 transition-colors flex-shrink-0"
                    aria-label="검색 취소"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="지역, 학교명 검색"
                    value={locationSearchQuery}
                    onChange={(e) => setLocationSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleLocationSearch();
                      }
                    }}
                    className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-[#5B6EF7]"
                  />
                  <button
                    onClick={handleLocationSearch}
                    className="absolute right-1.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-[#5B6EF7]"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 학교급 필터 */}
          <div>
            <h5 className="text-xs font-semibold text-gray-500 mb-1.5">학교급</h5>
            <div className="flex flex-wrap gap-1">
              {SCHOOL_LEVELS.map(level => (
                <button
                  key={level}
                  onClick={() => toggleMapFilter('schoolLevels', level)}
                  className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                    mapFilters.schoolLevels.includes(level)
                      ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* 유형 필터 */}
          <div>
            <h5 className="text-xs font-semibold text-gray-500 mb-1.5">유형</h5>
            <div className="flex flex-wrap gap-1">
              {MAP_FILTER_JOB_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => toggleMapFilter('jobTypes', type)}
                  className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                    mapFilters.jobTypes.includes(type)
                      ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* 과목 필터 */}
          <div>
            <h5 className="text-xs font-semibold text-gray-500 mb-1.5">과목</h5>
            <div className="flex flex-wrap gap-1">
              {MAP_FILTER_SUBJECTS.map(subject => (
                <button
                  key={subject}
                  onClick={() => toggleMapFilter('subjects', subject)}
                  className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
                    mapFilters.subjects.includes(subject)
                      ? 'bg-[#5B6EF7] border-[#5B6EF7] text-white'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-[#5B6EF7]'
                  }`}
                >
                  {subject}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 공고 목록 패널 - 플로팅 */}
      <div className="absolute top-4 left-4 w-[320px] bg-white/95 backdrop-blur-sm z-10 rounded-xl border border-gray-200 shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-140px)]">
        {/* 목록 헤더 */}
        <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-gray-800 text-sm">공고 목록</h4>
            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {filteredJobPostings.length}개
            </span>
          </div>
        </div>

        {/* 공고 카드 목록 */}
        <div className="flex-1 overflow-y-auto">
          {filteredJobPostings.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              표시할 공고가 없습니다
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredJobPostings.map((job) => (
                <div
                  key={job.id}
                  className="p-3 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    // 해당 공고 위치로 지도 이동
                    if (mapInstanceRef.current && job.organization) {
                      const places = new window.kakao.maps.services.Places();
                      places.keywordSearch(job.organization, (result: any[], status: string) => {
                        if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                          const coords = new window.kakao.maps.LatLng(result[0].y, result[0].x);
                          mapInstanceRef.current.setCenter(coords);
                          mapInstanceRef.current.setLevel(3);
                        }
                      });
                    }
                  }}
                >
                  {/* 상단: 기관명 + D-day */}
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] text-gray-500 truncate flex-1">
                      {job.organization || '기관 정보 없음'}
                    </span>
                    {job.daysLeft !== undefined && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        job.daysLeft <= 3
                          ? 'bg-red-100 text-red-600'
                          : job.daysLeft <= 7
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-blue-100 text-blue-600'
                      }`}>
                        D-{job.daysLeft}
                      </span>
                    )}
                  </div>

                  {/* 제목 */}
                  <h5 className="text-xs font-semibold text-gray-800 leading-tight mb-1.5 line-clamp-2">
                    {job.title}
                  </h5>

                  {/* 위치, 보수, 마감일 정보 */}
                  <div className="space-y-0.5 mb-1.5">
                    {job.location && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="truncate">{job.location}</span>
                      </div>
                    )}
                    {job.compensation && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-600">
                        <svg className="w-3 h-3 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="truncate font-medium">{job.compensation}</span>
                      </div>
                    )}
                    {job.deadline && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-500">
                        <svg className="w-3 h-3 text-orange-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="truncate">{job.deadline}</span>
                      </div>
                    )}
                  </div>

                  {/* 태그 */}
                  {job.tags && job.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {job.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                      {job.tags.length > 3 && (
                        <span className="text-[9px] text-gray-400">
                          +{job.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}

                  {/* 원문 링크 버튼 */}
                  {job.source_url && (
                    <a
                      href={job.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="mt-2 inline-flex items-center justify-center gap-1 w-full px-2 py-1.5 text-[10px] font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      원문 링크
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
