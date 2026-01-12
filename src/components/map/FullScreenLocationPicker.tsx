// 전체 화면 위치 선택 컴포넌트
// 마커 등록 시 위치를 먼저 선택할 수 있는 전체 화면 오버레이
// Option A: Island Card 스타일 적용 (중앙 집중형)
// 작성일: 2026-01-12

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FullScreenLocationPickerProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (coords: { lat: number; lng: number }) => void;
    markerType: 'teacher' | 'program';
}

export default function FullScreenLocationPicker({
    isOpen,
    onClose,
    onConfirm,
    markerType
}: FullScreenLocationPickerProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const searchDebounceRef = useRef<NodeJS.Timeout | null>(null);

    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);
    const [address, setAddress] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showResults, setShowResults] = useState(false);

    // 지도 초기화
    useEffect(() => {
        if (!isOpen || !mapContainerRef.current || !window.kakao?.maps) return;

        // 기본 위치 (서울 시청)
        const defaultCenter = new window.kakao.maps.LatLng(37.5665, 126.978);

        const mapOptions = {
            center: defaultCenter,
            level: 5
        };

        const map = new window.kakao.maps.Map(mapContainerRef.current, mapOptions);
        mapInstanceRef.current = map;

        // 중앙 좌표 초기 설정
        const center = map.getCenter();
        setSelectedCoords({
            lat: center.getLat(),
            lng: center.getLng()
        });

        // 지도 이동 시 중앙 좌표 업데이트
        window.kakao.maps.event.addListener(map, 'center_changed', () => {
            const newCenter = map.getCenter();
            setSelectedCoords({
                lat: newCenter.getLat(),
                lng: newCenter.getLng()
            });
        });

        // 지도 이동 끝날 때 주소 가져오기
        window.kakao.maps.event.addListener(map, 'idle', () => {
            const newCenter = map.getCenter();
            getAddressFromCoords(newCenter.getLat(), newCenter.getLng());
        });

        // 초기 주소 가져오기
        getAddressFromCoords(center.getLat(), center.getLng());

        return () => {
            mapInstanceRef.current = null;
        };
    }, [isOpen]);

    // 좌표로부터 주소 가져오기
    const getAddressFromCoords = useCallback((lat: number, lng: number) => {
        if (!window.kakao?.maps) return;

        const geocoder = new window.kakao.maps.services.Geocoder();
        const coords = new window.kakao.maps.LatLng(lat, lng);

        geocoder.coord2Address(coords.getLng(), coords.getLat(), (result: any[], status: string) => {
            if (status === window.kakao.maps.services.Status.OK && result.length > 0) {
                const roadAddr = result[0].road_address?.address_name;
                const jibunAddr = result[0].address?.address_name;
                setAddress(roadAddr || jibunAddr || '주소를 찾을 수 없습니다');
            } else {
                setAddress('주소를 찾을 수 없습니다');
            }
        });
    }, []);

    // 장소 검색
    const handleSearch = useCallback(() => {
        if (!searchQuery.trim()) return;

        // Kakao Maps services 라이브러리 체크
        if (!window.kakao?.maps?.services) {
            console.error('[FullScreenLocationPicker] Kakao Maps services not loaded');
            setSearchResults([]);
            setShowResults(true);
            return;
        }

        setIsSearching(true);

        try {
            const places = new window.kakao.maps.services.Places();

            places.keywordSearch(searchQuery, (result: any[], status: string) => {
                setIsSearching(false);
                if (status === window.kakao.maps.services.Status.OK) {
                    console.log('[FullScreenLocationPicker] Search results:', result.length);
                    setSearchResults(result.slice(0, 5));
                    setShowResults(true);
                } else {
                    console.log('[FullScreenLocationPicker] No results, status:', status);
                    setSearchResults([]);
                    setShowResults(true);
                }
            });
        } catch (error) {
            console.error('[FullScreenLocationPicker] Search error:', error);
            setIsSearching(false);
            setSearchResults([]);
            setShowResults(true);
        }
    }, [searchQuery]);

    // 검색어 변경 시 자동 검색 (debounce 300ms)
    useEffect(() => {
        // 이전 타이머 정리
        if (searchDebounceRef.current) {
            clearTimeout(searchDebounceRef.current);
        }

        // 검색어가 2글자 이상일 때만 자동 검색
        if (searchQuery.trim().length >= 2) {
            searchDebounceRef.current = setTimeout(() => {
                handleSearch();
            }, 300);
        } else {
            setSearchResults([]);
            setShowResults(false);
        }

        return () => {
            if (searchDebounceRef.current) {
                clearTimeout(searchDebounceRef.current);
            }
        };
    }, [searchQuery, handleSearch]);

    // 검색 결과 선택
    const handleSelectSearchResult = useCallback((place: any) => {
        if (!mapInstanceRef.current) return;

        const lat = parseFloat(place.y);
        const lng = parseFloat(place.x);
        const newCenter = new window.kakao.maps.LatLng(lat, lng);

        mapInstanceRef.current.setCenter(newCenter);
        mapInstanceRef.current.setLevel(3);

        setSelectedCoords({ lat, lng });
        setAddress(place.address_name || place.road_address_name || '');
        setSearchQuery('');
        setShowResults(false);
    }, []);

    // 현재 위치로 이동
    const moveToCurrentLocation = useCallback(() => {
        if (!navigator.geolocation || !mapInstanceRef.current) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                const newCenter = new window.kakao.maps.LatLng(lat, lng);

                mapInstanceRef.current.setCenter(newCenter);
                mapInstanceRef.current.setLevel(3);
            },
            (error) => {
                console.error('위치 가져오기 실패:', error);
            }
        );
    }, []);

    // 확인 버튼 클릭
    const handleConfirm = useCallback(() => {
        if (selectedCoords) {
            onConfirm(selectedCoords);
        }
    }, [selectedCoords, onConfirm]);

    const markerColors = {
        teacher: '#10B981', // Emerald
        program: '#F59E0B'  // Amber
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] bg-white"
                >
                    {/* 지도 영역 (전체 배경) */}
                    <div
                        ref={mapContainerRef}
                        className="absolute inset-0 w-full h-full"
                        onClick={() => setShowResults(false)}
                    />

                    {/* 상단 검색 아일랜드 ("Island Card" 스타일) */}
                    <div
                        className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-md px-4 z-20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 flex flex-col overflow-hidden transition-all duration-300">
                            <div className="flex items-center p-2">
                                <button
                                    onClick={onClose}
                                    className="p-3 text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition-colors shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                                <div className="flex-1 relative">
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                        onFocus={() => searchResults.length > 0 && setShowResults(true)}
                                        placeholder="주소 또는 장소 검색"
                                        className="w-full py-2.5 px-3 text-base text-gray-800 placeholder-gray-400 border-none outline-none bg-transparent font-medium"
                                    />
                                    {isSearching && (
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={handleSearch}
                                    className="p-3 bg-gray-50 text-gray-500 hover:text-gray-900 rounded-xl transition-colors shrink-0"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </button>
                            </div>

                            {/* 검색 결과 드롭다운 */}
                            {showResults && (
                                <div className="border-t border-gray-100 max-h-64 overflow-y-auto">
                                    {searchResults.length === 0 ? (
                                        <div className="px-5 py-4 text-sm text-gray-500 text-center">
                                            검색 결과가 없습니다
                                        </div>
                                    ) : (
                                        searchResults.map((place, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => handleSelectSearchResult(place)}
                                                className="w-full px-5 py-3.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-b-0 flex items-start gap-3"
                                            >
                                                <div className="mt-1 shrink-0 w-4 h-4 rounded-full border-2 border-gray-300"></div>
                                                <div>
                                                    <div className="text-sm font-semibold text-gray-800">{place.place_name}</div>
                                                    <div className="text-xs text-gray-500 mt-0.5">{place.address_name}</div>
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 중앙 고정 마커 (핀) */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full z-10 pointer-events-none">
                        <svg
                            width="48"
                            height="60"
                            viewBox="0 0 40 52"
                            fill="none"
                            style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.25))' }}
                        >
                            <path
                                d="M20 0C8.954 0 0 8.954 0 20C0 35 20 52 20 52C20 52 40 35 40 20C40 8.954 31.046 0 20 0Z"
                                fill={markerColors[markerType]}
                            />
                            <circle cx="20" cy="18" r="8" fill="white" />
                        </svg>
                        <div className="absolute top-full left-1/2 -translate-x-1/2 w-32 -mt-4 text-center">
                            <span className="inline-block px-3 py-1 bg-gray-900/80 backdrop-blur-sm text-white text-xs font-bold rounded-full shadow-lg">
                                여기를 중심으로
                            </span>
                        </div>
                    </div>

                    {/* 하단 정보/액션 아일랜드 카드 ("Island Card") */}
                    <div
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-sm px-4 z-20"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-white rounded-2xl shadow-2xl p-5 border border-gray-100/50">
                            {/* 현재 선택 위치 주소 */}
                            <div className="text-center mb-4">
                                <div className="text-base font-bold text-gray-800 leading-snug break-keep">
                                    {address || '지도를 움직여보세요'}
                                </div>
                            </div>

                            {/* 버튼들 */}
                            <div className="flex gap-3">
                                <button
                                    onClick={moveToCurrentLocation}
                                    className="p-3.5 text-gray-600 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors shrink-0"
                                    aria-label="현재 위치로"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={!selectedCoords}
                                    className="flex-1 px-5 py-3.5 text-sm font-bold text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed transform active:scale-95"
                                    style={{
                                        backgroundColor: markerColors[markerType],
                                        boxShadow: `0 8px 16px -4px ${markerColors[markerType]}60`
                                    }}
                                >
                                    이 위치로 선택
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
