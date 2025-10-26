import { useState } from 'react';
import { IconChevronDown, IconInfoCircle } from '@tabler/icons-react';

interface SpecialtyData {
  contractTeacher: {
    enabled: boolean;
    kindergarten: boolean;
    elementary: boolean;
    secondary: boolean;
    secondarySubjects?: string;
    special: boolean;
  };
  careerEducation: boolean;
  counseling: boolean;
  afterSchool: boolean;
  neulbom: boolean;
  cooperativeInstructor: boolean;
  adultTraining: boolean;
  other?: string;
}

interface SpecialtySelectorProps {
  value: SpecialtyData;
  onChange: (value: SpecialtyData) => void;
  error?: string;
}

export default function SpecialtySelector({ value, onChange, error }: SpecialtySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getDisplayText = () => {
    const selected: string[] = [];
    if (value.contractTeacher.enabled) selected.push('기간제교사');
    if (value.careerEducation) selected.push('진로교육');
    if (value.counseling) selected.push('상담교육');
    if (value.afterSchool) selected.push('방과후 강사');
    if (value.neulbom) selected.push('늘봄 강사');
    if (value.cooperativeInstructor) selected.push('협력강사');
    if (value.adultTraining) selected.push('성인대상 연수강의');
    if (value.other) selected.push('기타');

    if (selected.length === 0) return '전문 분야 선택';
    if (selected.length === 1) return selected[0];
    return `${selected[0]} 외 ${selected.length - 1}개`;
  };

  const handleCheckboxChange = (field: keyof Omit<SpecialtyData, 'contractTeacher' | 'other'>) => {
    onChange({
      ...value,
      [field]: !value[field],
    });
  };

  const handleContractTeacherToggle = () => {
    onChange({
      ...value,
      contractTeacher: {
        ...value.contractTeacher,
        enabled: !value.contractTeacher.enabled,
      },
    });
  };

  const handleContractTeacherSubChange = (field: 'kindergarten' | 'elementary' | 'secondary' | 'special') => {
    onChange({
      ...value,
      contractTeacher: {
        ...value.contractTeacher,
        [field]: !value.contractTeacher[field],
      },
    });
  };

  const handleSecondarySubjectsChange = (subjects: string) => {
    onChange({
      ...value,
      contractTeacher: {
        ...value.contractTeacher,
        secondarySubjects: subjects,
      },
    });
  };

  const handleOtherChange = (otherValue: string) => {
    onChange({
      ...value,
      other: otherValue,
    });
  };

  return (
    <div className="space-y-0.5 relative">
      <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
        전문 분야 <span className="text-red-500">*</span>
      </label>

      {/* 드롭다운 버튼 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded bg-white hover:border-gray-400 transition-colors flex items-center justify-between"
      >
        <span className={value && Object.values(value).some(v => v) ? 'text-gray-900' : 'text-gray-400'}>
          {getDisplayText()}
        </span>
        <IconChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* 드롭다운 패널 */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-0.5 bg-white border border-gray-300 rounded-lg shadow-lg z-20 p-2 max-h-[280px] overflow-y-auto">
          <div className="space-y-1">
            {/* 기간제교사 (중첩 구조) */}
            <div className="border-b border-gray-200 pb-1.5 mb-1.5">
              <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
                <input
                  type="checkbox"
                  checked={value.contractTeacher.enabled}
                  onChange={handleContractTeacherToggle}
                  className="w-4 h-4"
                />
                <span className="text-[14px] font-medium text-gray-700">기간제교사</span>
              </label>

              {/* 기간제교사 하위 옵션 */}
              {value.contractTeacher.enabled && (
                <div className="ml-6 mt-1 space-y-0.5 border-l-2 border-gray-200 pl-2">
                  <label className="flex items-center gap-1.5 hover:bg-gray-50 p-0.5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value.contractTeacher.kindergarten}
                      onChange={() => handleContractTeacherSubChange('kindergarten')}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[13px] text-gray-700">유치원</span>
                  </label>
                  <label className="flex items-center gap-1.5 hover:bg-gray-50 p-0.5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value.contractTeacher.elementary}
                      onChange={() => handleContractTeacherSubChange('elementary')}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[13px] text-gray-700">초등</span>
                  </label>
                  <div>
                    <label className="flex items-center gap-1.5 hover:bg-gray-50 p-0.5 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={value.contractTeacher.secondary}
                        onChange={() => handleContractTeacherSubChange('secondary')}
                        className="w-3.5 h-3.5"
                      />
                      <span className="text-[13px] text-gray-700">중등</span>
                    </label>
                    {/* 중등 과목 입력 */}
                    {value.contractTeacher.secondary && (
                      <input
                        type="text"
                        value={value.contractTeacher.secondarySubjects || ''}
                        onChange={(e) => handleSecondarySubjectsChange(e.target.value)}
                        placeholder="과목 입력 (예: 국어, 수학)"
                        className="w-full mt-1 ml-6 h-7 px-1.5 text-[13px] border border-gray-300 rounded"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                  </div>
                  <label className="flex items-center gap-1.5 hover:bg-gray-50 p-0.5 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={value.contractTeacher.special}
                      onChange={() => handleContractTeacherSubChange('special')}
                      className="w-3.5 h-3.5"
                    />
                    <span className="text-[13px] text-gray-700">특수</span>
                  </label>
                </div>
              )}
            </div>

            {/* 나머지 전문 분야 */}
            <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={value.careerEducation}
                onChange={() => handleCheckboxChange('careerEducation')}
                className="w-4 h-4"
              />
              <span className="text-[14px] text-gray-700">진로교육</span>
            </label>

            <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={value.counseling}
                onChange={() => handleCheckboxChange('counseling')}
                className="w-4 h-4"
              />
              <span className="text-[14px] text-gray-700">상담교육</span>
            </label>

            <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={value.afterSchool}
                onChange={() => handleCheckboxChange('afterSchool')}
                className="w-4 h-4"
              />
              <span className="text-[14px] text-gray-700">방과후 강사</span>
            </label>

            <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={value.neulbom}
                onChange={() => handleCheckboxChange('neulbom')}
                className="w-4 h-4"
              />
              <span className="text-[14px] text-gray-700">늘봄 강사</span>
            </label>

            <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer">
              <input
                type="checkbox"
                checked={value.cooperativeInstructor}
                onChange={() => handleCheckboxChange('cooperativeInstructor')}
                className="w-4 h-4"
              />
              <span className="text-[14px] text-gray-700">협력강사</span>
            </label>

            <label className="flex items-center gap-1.5 hover:bg-gray-50 p-1 rounded cursor-pointer group">
              <input
                type="checkbox"
                checked={value.adultTraining}
                onChange={() => handleCheckboxChange('adultTraining')}
                className="w-4 h-4"
              />
              <span className="text-[14px] text-gray-700">교원, 직원 및 학부모 대상 연수강의</span>
              <div className="relative group">
                <IconInfoCircle size={16} className="text-gray-400 cursor-help" />
                <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block w-48 p-2 bg-gray-800 text-white text-[12px] rounded shadow-lg z-30">
                  교권보호, 생활지도, 에듀테크 등 성인대상 연수를 뜻합니다
                </div>
              </div>
            </label>

            {/* 기타 직접 입력 */}
            <div className="pt-1 border-t border-gray-200">
              <label className="flex items-start gap-1.5 p-1">
                <input
                  type="checkbox"
                  checked={!!value.other}
                  onChange={() => {
                    if (value.other) {
                      handleOtherChange('');
                    }
                  }}
                  className="w-4 h-4 mt-0.5"
                />
                <div className="flex-1">
                  <span className="text-[14px] text-gray-700 block mb-0.5">기타</span>
                  {(value.other !== undefined) && (
                    <input
                      type="text"
                      value={value.other || ''}
                      onChange={(e) => handleOtherChange(e.target.value)}
                      placeholder="직접 입력"
                      className="w-full h-7 px-1.5 text-[13px] border border-gray-300 rounded"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </div>
              </label>
            </div>
          </div>

          {/* 선택 완료 버튼 */}
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="w-full mt-2 h-8 bg-gradient-to-r from-[#7db8a3] to-[#6fb59b] text-white text-[14px] font-semibold rounded hover:opacity-90 transition-opacity"
          >
            선택 완료
          </button>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && <p className="text-[13px] text-red-600 mt-0.5">{error}</p>}
    </div>
  );
}
