'use client';

import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import type { RoleOption } from './ProfileSetupModal';

const SEOUL_DISTRICTS = [
  '강남', '서초', '송파', '강동', '광진', '성동', '중구', '종로구',
  '중랑', '동대문', '성북', '강북', '도봉', '노원', '은평', '서대문',
  '마포', '양천', '강서', '구로', '금천', '영등포', '동작', '관악'
];

const GYEONGGI_CITIES = [
  '수원', '고양', '용인', '성남', '부천', '안산', '안양', '화성',
  '평택', '시흥', '의정부', '파주', '김포', '광명', '광주', '군포',
  '오산', '이천', '안성', '구리', '남양주', '의왕', '하남', '포천',
  '여주', '동두천', '과천', '가평', '양주', '양평', '연천'
];

const SEOUL_DISTRICT_SET = new Set(SEOUL_DISTRICTS);
const GYEONGGI_CITY_SET = new Set(GYEONGGI_CITIES);

interface ProfileStep3LocationProps {
  roles: RoleOption[];
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
  introduction: string;
  onIntroductionChange: (value: string) => void;
}

export default function ProfileStep3Location({
  roles,
  selectedRegions,
  onRegionsChange,
  introduction,
  onIntroductionChange
}: ProfileStep3LocationProps) {
  const [seoulExpanded, setSeoulExpanded] = useState(false);
  const [gyeonggiExpanded, setGyeonggiExpanded] = useState(false);

  const handleRegionToggle = (region: string) => {
    let nextRegions = selectedRegions;

    if (SEOUL_DISTRICT_SET.has(region)) {
      nextRegions = nextRegions.filter((r) => r !== '서울 전체');
    }

    if (GYEONGGI_CITY_SET.has(region)) {
      nextRegions = nextRegions.filter((r) => r !== '경기도 전체');
    }

    if (nextRegions.includes(region)) {
      onRegionsChange(nextRegions.filter((r) => r !== region));
    } else {
      onRegionsChange([...nextRegions, region]);
    }
  };

  return (
    <div className="space-y-8">
      {/* 지역 선택 */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900">활동하고 싶은 지역을 선택해주세요</h3>

        <div className="space-y-2">
          {/* 서울 전체 */}
          <button
            type="button"
            onClick={() => {
              if (selectedRegions.includes('서울 전체')) {
                onRegionsChange(selectedRegions.filter((r) => r !== '서울 전체'));
              } else {
                onRegionsChange([
                  ...selectedRegions.filter((r) => !SEOUL_DISTRICT_SET.has(r) && r !== '서울 전체'),
                  '서울 전체'
                ]);
              }
            }}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selectedRegions.includes('서울 전체')
                ? 'border-[#4b83c6] bg-[#f1f5fb]'
                : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                selectedRegions.includes('서울 전체')
                  ? 'border-[#4b83c6] bg-[#4b83c6]'
                  : 'border-gray-300'
              }`}>
                {selectedRegions.includes('서울 전체') && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="font-medium text-gray-900">서울 전체</span>
            </div>
          </button>

          {/* 경기도 전체 */}
          <button
            type="button"
            onClick={() => {
              if (selectedRegions.includes('경기도 전체')) {
                onRegionsChange(selectedRegions.filter((r) => r !== '경기도 전체'));
              } else {
                onRegionsChange([
                  ...selectedRegions.filter((r) => !GYEONGGI_CITY_SET.has(r) && r !== '경기도 전체'),
                  '경기도 전체'
                ]);
              }
            }}
            className={`w-full text-left p-3 rounded-lg border transition-all ${
              selectedRegions.includes('경기도 전체')
                ? 'border-[#4b83c6] bg-[#f1f5fb]'
                : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                selectedRegions.includes('경기도 전체')
                  ? 'border-[#4b83c6] bg-[#4b83c6]'
                  : 'border-gray-300'
              }`}>
                {selectedRegions.includes('경기도 전체') && (
                  <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <span className="font-medium text-gray-900">경기도 전체</span>
            </div>
          </button>

          {/* 서울 일부 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setSeoulExpanded(!seoulExpanded)}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                seoulExpanded || selectedRegions.some((r) => SEOUL_DISTRICTS.includes(r))
                  ? 'border-[#4b83c6] bg-[#f1f5fb]'
                  : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
              }`}
            >
              <span className="font-medium text-gray-900">서울 일부</span>
              <IconChevronDown
                size={18}
                className={`transition-transform ${seoulExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {seoulExpanded && (
              <div className="grid grid-cols-3 gap-2 pl-2">
                {SEOUL_DISTRICTS.map((district) => {
                  const disabled = selectedRegions.includes('서울 전체');

                  return (
                    <button
                      key={district}
                      type="button"
                      onClick={() => handleRegionToggle(district)}
                      disabled={disabled}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedRegions.includes(district)
                          ? 'border-[#4b83c6] bg-[#4b83c6] text-white'
                          : disabled
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]'
                      }`}
                    >
                      {district}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 경기도 일부 */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setGyeonggiExpanded(!gyeonggiExpanded)}
              className={`w-full text-left p-3 rounded-lg border transition-all flex items-center justify-between ${
                gyeonggiExpanded || selectedRegions.some((r) => GYEONGGI_CITIES.includes(r))
                  ? 'border-[#4b83c6] bg-[#f1f5fb]'
                  : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
              }`}
            >
              <span className="font-medium text-gray-900">경기도 일부</span>
              <IconChevronDown
                size={18}
                className={`transition-transform ${gyeonggiExpanded ? 'rotate-180' : ''}`}
              />
            </button>
            {gyeonggiExpanded && (
              <div className="grid grid-cols-3 gap-2 pl-2">
                {GYEONGGI_CITIES.map((city) => {
                  const disabled = selectedRegions.includes('경기도 전체');

                  return (
                    <button
                      key={city}
                      type="button"
                      onClick={() => handleRegionToggle(city)}
                      disabled={disabled}
                      className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                        selectedRegions.includes(city)
                          ? 'border-[#4b83c6] bg-[#4b83c6] text-white'
                          : disabled
                            ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]'
                      }`}
                    >
                      {city}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 소개 입력 */}
      <div className="space-y-3">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-gray-900">자기소개</h3>
          <p className="text-sm text-gray-500">자세히 써 주실수록 선생님께 가장 정확한 추천을, 가장 빨리 해드립니다.</p>
        </div>
        <textarea
          value={introduction}
          onChange={(event) => onIntroductionChange(event.target.value)}
          placeholder="예) 초등담임 기간제 가능하고 생활지도 업무 다수 경력 있습니다. 또한 교직원 및 학부모 대상 교권보호 강의도 가능합니다."
          className="w-full min-h-[140px] rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
          maxLength={500}
        />
        <p className="text-right text-xs text-gray-400">최대 500자</p>
      </div>
    </div>
  );
}
