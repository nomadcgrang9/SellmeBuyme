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
  '수원', '화성', '오산', '성남', '용인', '안양', '의왕', '군포',
  '부천', '광명', '시흥', '안산', '평택', '이천', '여주', '여수',
  '광주', '하남', '파주', '포천', '연천', '가평', '남양주', '구리'
];

interface ProfileStep3LocationProps {
  roles: RoleOption[];
  selectedRegions: string[];
  onRegionsChange: (regions: string[]) => void;
  preferredJobTypes: string[];
  onJobTypesChange: (types: string[]) => void;
  preferredSubjects: string[];
  onSubjectsChange: (subjects: string[]) => void;
  introduction: string;
  onIntroductionChange: (value: string) => void;
}

export default function ProfileStep3Location({
  roles,
  selectedRegions,
  onRegionsChange,
  preferredJobTypes,
  onJobTypesChange,
  preferredSubjects,
  onSubjectsChange,
  introduction,
  onIntroductionChange
}: ProfileStep3LocationProps) {
  const [seoulExpanded, setSeoulExpanded] = useState(false);
  const [gyeonggiExpanded, setGyeonggiExpanded] = useState(false);

  const isTeacher = roles.includes('교사');

  const handleRegionToggle = (region: string) => {
    if (selectedRegions.includes(region)) {
      onRegionsChange(selectedRegions.filter((r) => r !== region));
    } else {
      onRegionsChange([...selectedRegions, region]);
    }
  };

  const handleJobTypeToggle = (type: string) => {
    if (preferredJobTypes.includes(type)) {
      onJobTypesChange(preferredJobTypes.filter((t) => t !== type));
    } else {
      onJobTypesChange([...preferredJobTypes, type]);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    if (preferredSubjects.includes(subject)) {
      onSubjectsChange(preferredSubjects.filter((s) => s !== subject));
    } else {
      onSubjectsChange([...preferredSubjects, subject]);
    }
  };

  const SUBJECT_OPTIONS = [
    '담임', '과학', '영어', '체육', '음악', '미술', '실과',
    '국어', '수학', '사회', '도덕', '기술·가정'
  ];

  const JOB_TYPE_OPTIONS = ['기간제 교사', '시간제 교사'];

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
                  ...selectedRegions.filter((r) => !r.includes('서울')),
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
                  ...selectedRegions.filter((r) => !r.includes('경기')),
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
                {SEOUL_DISTRICTS.map((district) => (
                  <button
                    key={district}
                    type="button"
                    onClick={() => handleRegionToggle(district)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      selectedRegions.includes(district)
                        ? 'border-[#4b83c6] bg-[#4b83c6] text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]'
                    }`}
                  >
                    {district}
                  </button>
                ))}
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
                {GYEONGGI_CITIES.map((city) => (
                  <button
                    key={city}
                    type="button"
                    onClick={() => handleRegionToggle(city)}
                    className={`px-3 py-2 rounded-lg border text-sm transition-all ${
                      selectedRegions.includes(city)
                        ? 'border-[#4b83c6] bg-[#4b83c6] text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]'
                    }`}
                  >
                    {city}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 선호 형태 (교사만) */}
      {isTeacher && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">선호 형태를 선택해주세요</h3>
          <div className="grid grid-cols-1 gap-2">
            {JOB_TYPE_OPTIONS.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleJobTypeToggle(type)}
                className={`px-4 py-2 rounded-lg border transition-all text-sm font-medium ${
                  preferredJobTypes.includes(type)
                    ? 'border-[#4b83c6] bg-[#4b83c6] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      )}

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

      {/* 선호 과목 (교사만) */}
      {isTeacher && (
        <div className="space-y-4">
          <h3 className="text-lg font-bold text-gray-900">선호 과목을 선택해주세요</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {SUBJECT_OPTIONS.map((subject) => (
              <button
                key={subject}
                type="button"
                onClick={() => handleSubjectToggle(subject)}
                className={`px-3 py-2 rounded-lg border transition-all text-sm font-medium ${
                  preferredSubjects.includes(subject)
                    ? 'border-[#4b83c6] bg-[#4b83c6] text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]'
                }`}
              >
                {subject}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
