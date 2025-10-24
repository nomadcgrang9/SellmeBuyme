'use client';

import { useState } from 'react';
import { IconChevronDown } from '@tabler/icons-react';
import type { RoleOption } from './ProfileSetupModal';

const ROLE_LABELS: Record<RoleOption, string> = {
  '교사': '교사',
  '강사': '강사',
  '업체': '업체',
  '기타': '학교행정'
};

const INSTRUCTOR_CATEGORIES = [
  '요리',
  '코딩',
  '음악',
  '미술',
  '체육',
  '영어',
  '수학',
  '과학',
  '중국어',
  '일본어',
  '드론',
  '로봇',
  '보드게임',
  '독서',
  '글쓰기',
  '진로교육',
  '집단상담',
  '교권보호',
  'AI교육',
  '유아놀이'
];
const EXPERIENCE_LEVELS = ['1년 미만', '1-3년', '3-5년', '5-10년', '10년 이상'];
const CERTIFICATES = ['정교사 1급', '정교사 2급', '특수교육 자격', '기타'];

interface ProfileStep2EducationProps {
  roles: RoleOption[];
  instructorCategories: string[];
  instructorCustom: string;
  experienceLevel: string;
  certificates: string[];
  onRolesChange: (roles: RoleOption[]) => void;
  onInstructorCategoriesChange: (categories: string[]) => void;
  onInstructorCustomChange: (custom: string) => void;
  onExperienceLevelChange: (level: string) => void;
  onCertificatesChange: (certs: string[]) => void;
}

export default function ProfileStep2Education({
  roles,
  instructorCategories,
  instructorCustom,
  experienceLevel,
  certificates,
  onRolesChange,
  onInstructorCategoriesChange,
  onInstructorCustomChange,
  onExperienceLevelChange,
  onCertificatesChange
}: ProfileStep2EducationProps) {
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const roleOptions: RoleOption[] = ['교사', '강사', '업체', '기타'];

  const handleRoleSelect = (role: RoleOption) => {
    if (roles.includes(role)) {
      onRolesChange(roles.filter((r) => r !== role));
    } else {
      onRolesChange([...roles, role]);
    }
  };

  const handleInstructorCategoryToggle = (category: string) => {
    if (instructorCategories.includes(category)) {
      onInstructorCategoriesChange(instructorCategories.filter((c) => c !== category));
    } else {
      onInstructorCategoriesChange([...instructorCategories, category]);
    }
  };

  const handleCertificateToggle = (cert: string) => {
    if (certificates.includes(cert)) {
      onCertificatesChange(certificates.filter((c) => c !== cert));
    } else {
      onCertificatesChange([...certificates, cert]);
    }
  };

  const showInstructorOptions = roles.includes('강사');

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900">교육 자격 및 경력</h3>
        <p className="text-sm text-gray-500">정확한 자격과 경력 정보를 입력해 주세요.</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#7aa3cc]">역할 선택</span>
          <h4 className="text-base font-bold text-gray-900">어떤 역할로 활동하세요?</h4>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
            className="w-full flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-700 hover:border-[#7aa3cc] transition-colors"
          >
            <span>
              {roles.length > 0
                ? `${roles.map((role) => ROLE_LABELS[role]).join(', ')} (${roles.length}개)`
                : '역할을 선택해 주세요'}
            </span>
            <IconChevronDown size={18} className={`transition-transform ${roleDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {roleDropdownOpen && (
            <div className="absolute top-full left-0 right-0 z-10 mt-2 rounded-xl border border-gray-200 bg-white shadow-lg">
              {roleOptions.map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={roles.includes(role)}
                    onChange={() => handleRoleSelect(role)}
                    className="h-4 w-4 rounded border-gray-300 text-[#7aa3cc] focus:ring-[#7aa3cc]"
                  />
                  <span className="text-sm text-gray-700">{ROLE_LABELS[role]}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {showInstructorOptions && (
        <div className="flex flex-col gap-4 rounded-2xl border border-[#e3edf9] bg-[#f6f9fe] px-5 py-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-semibold text-[#7aa3cc]">강사 분야</span>
            <h4 className="text-base font-bold text-gray-900">어떤 분야를 가르치세요?</h4>
            <p className="text-xs text-gray-500">여러 분야를 선택할 수 있습니다.</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {INSTRUCTOR_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => handleInstructorCategoryToggle(category)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  instructorCategories.includes(category)
                    ? 'bg-[#7aa3cc] text-white shadow-sm'
                    : 'border border-gray-200 text-gray-600 hover:border-[#7aa3cc]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <label className="space-y-2">
            <span className="text-xs font-semibold text-gray-600">자유 입력 (추가 분야)</span>
            <textarea
              value={instructorCustom}
              onChange={(e) => onInstructorCustomChange(e.target.value)}
              placeholder="예: 드론 조종, 보드게임 등"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3] resize-none"
              rows={2}
            />
          </label>
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#7aa3cc]">경력</span>
          <h4 className="text-base font-bold text-gray-900">교육 경력은 어느 정도 되세요?</h4>
        </div>

        <div className="space-y-2">
          {EXPERIENCE_LEVELS.map((level) => (
            <label key={level} className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer border border-gray-200 transition-colors">
              <input
                type="radio"
                name="experienceLevel"
                value={level}
                checked={experienceLevel === level}
                onChange={(e) => onExperienceLevelChange(e.target.value)}
                className="h-4 w-4 border-gray-300 text-[#7aa3cc] focus:ring-[#7aa3cc]"
              />
              <span className="text-sm font-medium text-gray-700">{level}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#7aa3cc]">보유 자격증</span>
          <h4 className="text-base font-bold text-gray-900">보유하신 자격증을 선택해 주세요</h4>
          <p className="text-xs text-gray-500">선택사항입니다. 여러 개를 선택할 수 있습니다.</p>
        </div>

        <div className="space-y-2">
          {CERTIFICATES.map((cert) => (
            <label key={cert} className="flex items-center gap-3 rounded-lg px-4 py-3 hover:bg-gray-50 cursor-pointer border border-gray-200 transition-colors">
              <input
                type="checkbox"
                checked={certificates.includes(cert)}
                onChange={() => handleCertificateToggle(cert)}
                className="h-4 w-4 rounded border-gray-300 text-[#7aa3cc] focus:ring-[#7aa3cc]"
              />
              <span className="text-sm font-medium text-gray-700">{cert}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
