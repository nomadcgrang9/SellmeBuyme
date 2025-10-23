'use client';

import { REGION_OPTIONS } from '@/lib/constants/filters';
import { IconX } from '@tabler/icons-react';

const JOB_TYPES = ['기간제 교사', '시간제 교사', '경력을 활용한 협력수업'];
const SUBJECTS = ['담임', '과학', '영어', '체육', '음악', '미술', '실과', '국어', '수학', '사회', '도덕', '기술·가정'];
const REGION_EXPANSION_MODES = ['선택한 지역만', '선택한 지역 + 인접 지역', '전국'];

interface ProfileStep3PreferencesProps {
  preferredRegions: string[];
  regionExpansionMode: string;
  preferredJobTypes: string[];
  preferredSubjects: string[];
  onRegionsChange: (regions: string[]) => void;
  onRegionExpansionChange: (mode: string) => void;
  onJobTypesChange: (types: string[]) => void;
  onSubjectsChange: (subjects: string[]) => void;
}

export default function ProfileStep3Preferences({
  preferredRegions,
  regionExpansionMode,
  preferredJobTypes,
  preferredSubjects,
  onRegionsChange,
  onRegionExpansionChange,
  onJobTypesChange,
  onSubjectsChange
}: ProfileStep3PreferencesProps) {
  const handleRegionToggle = (region: string) => {
    if (preferredRegions.includes(region)) {
      onRegionsChange(preferredRegions.filter((r) => r !== region));
    } else {
      onRegionsChange([...preferredRegions, region]);
    }
  };

  const handleJobTypeToggle = (jobType: string) => {
    if (preferredJobTypes.includes(jobType)) {
      onJobTypesChange(preferredJobTypes.filter((j) => j !== jobType));
    } else {
      onJobTypesChange([...preferredJobTypes, jobType]);
    }
  };

  const handleSubjectToggle = (subject: string) => {
    if (preferredSubjects.includes(subject)) {
      onSubjectsChange(preferredSubjects.filter((s) => s !== subject));
    } else {
      onSubjectsChange([...preferredSubjects, subject]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900">선호도 설정</h3>
        <p className="text-sm text-gray-500">선호하는 조건을 입력해 주세요. 최소 1개 이상 선택해야 합니다.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#7aa3cc]">선호 지역</span>
          <h4 className="text-base font-bold text-gray-900">활동하고 싶은 지역을 선택해 주세요</h4>
        </div>

        <div className="flex flex-wrap gap-2">
          {REGION_OPTIONS.map((region) => (
            <button
              key={region}
              type="button"
              onClick={() => handleRegionToggle(region)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                preferredRegions.includes(region)
                  ? 'bg-[#7aa3cc] text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:border-[#7aa3cc]'
              }`}
            >
              {region}
            </button>
          ))}
        </div>

        {preferredRegions.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-100">
            <span className="text-xs font-semibold text-gray-600">지역 확대 방식</span>
            <div className="space-y-2">
              {REGION_EXPANSION_MODES.map((mode) => (
                <label key={mode} className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer border border-gray-200 transition-colors">
                  <input
                    type="radio"
                    name="regionExpansionMode"
                    value={mode}
                    checked={regionExpansionMode === mode}
                    onChange={(e) => onRegionExpansionChange(e.target.value)}
                    className="h-4 w-4 border-gray-300 text-[#7aa3cc] focus:ring-[#7aa3cc]"
                  />
                  <span className="text-sm font-medium text-gray-700">{mode}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#7aa3cc]">선호 직종</span>
          <h4 className="text-base font-bold text-gray-900">선호하는 직종을 선택해 주세요</h4>
        </div>

        <div className="flex flex-wrap gap-2">
          {JOB_TYPES.map((jobType) => (
            <button
              key={jobType}
              type="button"
              onClick={() => handleJobTypeToggle(jobType)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                preferredJobTypes.includes(jobType)
                  ? 'bg-[#7aa3cc] text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:border-[#7aa3cc]'
              }`}
            >
              {jobType}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#7aa3cc]">선호 과목</span>
          <h4 className="text-base font-bold text-gray-900">선호하는 과목을 선택해 주세요</h4>
          <p className="text-xs text-gray-500">선택사항입니다. 여러 개를 선택할 수 있습니다.</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {SUBJECTS.map((subject) => (
            <button
              key={subject}
              type="button"
              onClick={() => handleSubjectToggle(subject)}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                preferredSubjects.includes(subject)
                  ? 'bg-[#7aa3cc] text-white shadow-sm'
                  : 'border border-gray-200 text-gray-600 hover:border-[#7aa3cc]'
              }`}
            >
              {subject}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
