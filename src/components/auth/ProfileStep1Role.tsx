'use client';

import type { RoleOption } from './ProfileSetupModal';

const ROLE_LABELS: Record<RoleOption, string> = {
  '교사': '교사',
  '강사': '강사',
  '업체': '업체',
  '기타': '학교행정'
};

const ROLE_DESCRIPTIONS: Record<RoleOption, string> = {
  '교사': '공고를 직접 등록하거나 기간제 교사로 활동',
  '강사': '교사와 함께 정규시간 협력수업을 하거나 방과후 단독수업 진행, 교직원·학부모 대상 강의',
  '업체': '개발한 프로그램이나 커리큘럼을 학교에 적용하고 비용을 받음',
  '기타': '자원봉사자, 조리사, 행정인력 대체 등 교육활동 지원'
};

interface ProfileStep1RoleProps {
  roles: RoleOption[];
  onRolesChange: (roles: RoleOption[]) => void;
}

export default function ProfileStep1Role({
  roles,
  onRolesChange
}: ProfileStep1RoleProps) {
  const roleOptions: RoleOption[] = ['교사', '강사', '업체', '기타'];

  const handleToggleRole = (role: RoleOption) => {
    if (roles.includes(role)) {
      onRolesChange(roles.filter((r) => r !== role));
    } else {
      onRolesChange([...roles, role]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900">어떤 역할로 활동하세요?</h3>
      </div>

      <div className="space-y-3">
        {roleOptions.map((role) => {
          const isSelected = roles.includes(role);
          return (
            <button
              key={role}
              type="button"
              onClick={() => handleToggleRole(role)}
              className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-[#4b83c6] bg-[#f1f5fb]'
                  : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`mt-1 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'border-[#4b83c6] bg-[#4b83c6]'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <span className="text-sm font-semibold text-gray-900">{ROLE_LABELS[role]}</span>
                  <span className="text-xs text-gray-500">{ROLE_DESCRIPTIONS[role]}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
