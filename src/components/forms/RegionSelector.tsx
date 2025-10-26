'use client';

import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';

// 서울 25개 구
const SEOUL_DISTRICTS = [
  '강남구', '강동구', '강북구', '강서구', '관악구',
  '광진구', '구로구', '금천구', '노원구', '도봉구',
  '동대문구', '동작구', '마포구', '서대문구', '서초구',
  '성동구', '성북구', '송파구', '양천구', '영등포구',
  '용산구', '은평구', '종로구', '중구', '중랑구'
];

// 경기 31개 시/군
const GYEONGGI_CITIES = [
  '가평군', '고양시', '과천시', '광명시', '광주시',
  '구리시', '군포시', '김포시', '남양주시', '동두천시',
  '부천시', '성남시', '수원시', '시흥시', '안산시',
  '안성시', '안양시', '양주시', '양평군', '여주시',
  '연천군', '오산시', '용인시', '의왕시', '의정부시',
  '이천시', '파주시', '평택시', '포천시', '하남시',
  '화성시'
];

interface RegionSelectorProps {
  value: {
    seoul?: string[];
    gyeonggi?: string[];
  };
  onChange: (value: { seoul?: string[]; gyeonggi?: string[] }) => void;
  error?: string;
}

export default function RegionSelector({ value, onChange, error }: RegionSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<'seoul' | 'gyeonggi' | null>(null);

  const handleDistrictToggle = (region: 'seoul' | 'gyeonggi', district: string) => {
    const currentList = value[region] || [];
    const newList = currentList.includes(district)
      ? currentList.filter((d) => d !== district)
      : [...currentList, district];

    onChange({
      ...value,
      [region]: newList.length > 0 ? newList : undefined
    });
  };

  const seoulCount = value.seoul?.length || 0;
  const gyeonggiCount = value.gyeonggi?.length || 0;
  const totalCount = seoulCount + gyeonggiCount;

  const getDisplayText = () => {
    if (totalCount === 0) return '지역 선택';
    const parts = [];
    if (seoulCount > 0) parts.push(`서울(${seoulCount})`);
    if (gyeonggiCount > 0) parts.push(`경기(${gyeonggiCount})`);
    return parts.join(', ');
  };

  return (
    <div className="space-y-0.5 relative">
      <label className="text-[12px] font-semibold text-gray-700">
        근무 지역 <span className="text-red-500">*</span>
      </label>

      {/* 통합 드롭다운 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded bg-white hover:border-gray-400 flex items-center justify-between transition-colors"
      >
        <span className={totalCount > 0 ? 'text-gray-900' : 'text-gray-400'}>
          {getDisplayText()}
        </span>
        <IconChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-2">
          {/* 서울/경기 라디오 선택 */}
          <div className="flex gap-2 mb-2 pb-2 border-b border-gray-200">
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="region-selector"
                checked={selectedRegion === 'seoul'}
                onChange={() => setSelectedRegion('seoul')}
                className="w-3.5 h-3.5"
              />
              <span className="text-[12px] font-medium">서울 {seoulCount > 0 && `(${seoulCount})`}</span>
            </label>
            <label className="flex items-center gap-1 cursor-pointer">
              <input
                type="radio"
                name="region-selector"
                checked={selectedRegion === 'gyeonggi'}
                onChange={() => setSelectedRegion('gyeonggi')}
                className="w-3.5 h-3.5"
              />
              <span className="text-[12px] font-medium">경기 {gyeonggiCount > 0 && `(${gyeonggiCount})`}</span>
            </label>
          </div>

          {/* 선택된 지역의 구/시 체크박스 */}
          {selectedRegion === 'seoul' && (
            <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto">
              {SEOUL_DISTRICTS.map((district) => (
                <label
                  key={district}
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={value.seoul?.includes(district) || false}
                    onChange={() => handleDistrictToggle('seoul', district)}
                    className="w-3 h-3 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-[11px] text-gray-700">{district}</span>
                </label>
              ))}
            </div>
          )}

          {selectedRegion === 'gyeonggi' && (
            <div className="grid grid-cols-3 gap-1 max-h-36 overflow-y-auto">
              {GYEONGGI_CITIES.map((city) => (
                <label
                  key={city}
                  className="flex items-center gap-1 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                >
                  <input
                    type="checkbox"
                    checked={value.gyeonggi?.includes(city) || false}
                    onChange={() => handleDistrictToggle('gyeonggi', city)}
                    className="w-3 h-3 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-[11px] text-gray-700">{city}</span>
                </label>
              ))}
            </div>
          )}

          {!selectedRegion && (
            <p className="text-[11px] text-gray-400 text-center py-2">
              서울 또는 경기를 선택하세요
            </p>
          )}

          {/* 닫기 버튼 */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 pt-2 border-t border-gray-200 text-[11px] text-blue-600 hover:text-blue-700"
          >
            선택 완료
          </button>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-red-600 mt-0.5">{error}</p>
      )}
    </div>
  );
}
