"use client";

import { useState } from "react";
import type {
  RoleOption,
  SpecialEducationType,
  TeacherLevel
} from "./ProfileSetupModal";

const INSTRUCTOR_FIELD_OPTIONS = [
  "요리",
  "코딩",
  "음악",
  "체육",
  "AI교육",
  "심리상담",
  "교권보호",
  "유아놀이",
  "미술교육",
  "독서코칭"
];

const TEACHER_LEVEL_OPTIONS: {
  level: TeacherLevel;
  title: string;
}[] = [
  { level: "유치원", title: "유치원 교사" },
  { level: "초등", title: "초등 담임" },
  { level: "초등전담", title: "초등 전담" },
  { level: "중등", title: "중등 교과" },
  { level: "비교과", title: "비교과" },
  { level: "특수", title: "특수 교사" },
  { level: "방과후/돌봄", title: "방과후/돌봄" },
  { level: "행정·교육지원", title: "행정·교육지원" },
];

// 초등 전담 과목
export const ELEMENTARY_JEONDAM_SUBJECTS = [
  "초등전담 과학",
  "초등전담 영어",
  "초등전담 체육",
  "초등전담 음악",
  "초등전담 미술",
  "초등전담 실과"
];

// 기존 초등 담임 과목 (하위호환)
export const ELEMENTARY_SUBJECTS = [
  "초등 담임",
  "초등 과학",
  "초등 영어",
  "초등 체육",
  "초등 음악",
  "초등 미술",
  "초등 실과"
];

// 중등 교과 과목 (도덕·윤리 추가, 제2외국어 → 개별 언어)
export const MIDDLE_SUBJECTS = [
  "중등 국어",
  "중등 수학",
  "중등 사회",
  "중등 역사",
  "중등 영어",
  "중등 과학",
  "중등 체육",
  "중등 음악",
  "중등 미술",
  "중등 기술·가정",
  "중등 정보",
  "중등 도덕·윤리",
  "중등 중국어",
  "중등 일본어",
  "중등 한문",
  "중등 프랑스어",
  "중등 스페인어"
];

// 초등 전담 가능 과목 (크로스오버)
export const MIDDLE_CROSSOVER_SUBJECTS = [
  "초등 과학",
  "초등 영어",
  "초등 체육",
  "초등 음악",
  "초등 미술",
  "초등 실과"
];

// 비교과 과목
export const BIGYOGWA_SUBJECTS = [
  "비교과 보건",
  "비교과 상담",
  "비교과 사서",
  "비교과 영양교사"
];

// 방과후/돌봄 분야
export const AFTERSCHOOL_SUBJECTS = [
  "방과후 체육",
  "방과후 음악",
  "방과후 미술",
  "방과후 무용",
  "방과후 요리",
  "방과후 외국어",
  "방과후 코딩/STEM",
  "방과후 돌봄/늘봄"
];

// 행정·교육지원 직종
export const ADMIN_SUBJECTS = [
  "행정 교무실무사",
  "행정 조리실무사",
  "행정 시설/환경",
  "행정 영양사",
  "행정 학습튜터/협력강사",
  "행정 자원봉사",
  "행정 안전지킴이"
];

export type TeacherEmploymentType = '기간제교사' | '정규교원';

interface ProfileStep2FieldProps {
  roles: RoleOption[];
  teacherLevel: TeacherLevel | null;
  teacherEmploymentType: TeacherEmploymentType | null;
  specialEducationType: SpecialEducationType | null;
  teacherSubjects: string[];
  instructorFields: string[];
  instructorCustomField: string;
  onTeacherLevelChange: (level: TeacherLevel | null) => void;
  onTeacherEmploymentTypeChange: (type: TeacherEmploymentType | null) => void;
  onSpecialEducationTypeChange: (type: SpecialEducationType | null) => void;
  onTeacherSubjectsChange: (subjects: string[]) => void;
  onInstructorFieldsChange: (fields: string[]) => void;
  onInstructorCustomFieldChange: (field: string) => void;
  onSyncCapableSubjects: (subjects: string[]) => void;
}

export default function ProfileStep2Field({
  roles,
  teacherLevel,
  teacherEmploymentType,
  specialEducationType,
  teacherSubjects,
  instructorFields,
  instructorCustomField,
  onTeacherLevelChange,
  onTeacherEmploymentTypeChange,
  onSpecialEducationTypeChange,
  onTeacherSubjectsChange,
  onInstructorFieldsChange,
  onInstructorCustomFieldChange,
  onSyncCapableSubjects
}: ProfileStep2FieldProps) {
  const [customSubject, setCustomSubject] = useState("");
  const isTeacher = roles.includes("교사");
  const isInstructor = roles.includes("강사");

  if (!isTeacher && !isInstructor) {
    return null;
  }

  const handleCustomSubjectAdd = () => {
    if (customSubject.trim()) {
      const prefix = teacherLevel === "중등" ? "중등 " : "";
      const formatted = customSubject.startsWith(prefix)
        ? customSubject.trim()
        : `${prefix}${customSubject.trim()}`;

      if (!teacherSubjects.includes(formatted)) {
        const nextSubjects = [...teacherSubjects, formatted];
        onTeacherSubjectsChange(nextSubjects);
        onSyncCapableSubjects(nextSubjects);
      }
      setCustomSubject("");
    }
  };

  const handleTeacherLevelSelect = (level: TeacherLevel) => {
    if (teacherLevel === level) {
      return;
    }

    onTeacherLevelChange(level);
    onSpecialEducationTypeChange(null);

    if (level === "유치원") {
      onTeacherSubjectsChange(["유치원 담임"]);
      onSyncCapableSubjects(["유치원 담임"]);
    } else if (level === "초등") {
      onTeacherSubjectsChange(["초등 담임"]);
      onSyncCapableSubjects(["초등 담임"]);
    } else {
      onTeacherSubjectsChange([]);
      onSyncCapableSubjects([]);
    }
  };

  const toggleTeacherSubject = (subject: string) => {
    const exists = teacherSubjects.includes(subject);
    const nextSubjects = exists
      ? teacherSubjects.filter((item) => item !== subject)
      : [...teacherSubjects, subject];
    onTeacherSubjectsChange(nextSubjects);
    onSyncCapableSubjects(nextSubjects);
  };

  const handleSpecialEducationSelect = (type: SpecialEducationType) => {
    onSpecialEducationTypeChange(type);
    onTeacherSubjectsChange([type]);
    onSyncCapableSubjects([type]);
  };

  const toggleInstructorField = (field: string) => {
    const exists = instructorFields.includes(field);
    const next = exists
      ? instructorFields.filter((item) => item !== field)
      : [...instructorFields, field];
    onInstructorFieldsChange(next);
  };

  const getSubjectsForLevel = (): string[] => {
    switch (teacherLevel) {
      case "초등전담": return ELEMENTARY_JEONDAM_SUBJECTS;
      case "중등": return MIDDLE_SUBJECTS;
      case "비교과": return BIGYOGWA_SUBJECTS;
      case "방과후/돌봄": return AFTERSCHOOL_SUBJECTS;
      case "행정·교육지원": return ADMIN_SUBJECTS;
      default: return [];
    }
  };

  const needsSubjectSelection = ["초등전담", "중등", "비교과", "방과후/돌봄", "행정·교육지원"].includes(teacherLevel || "");

  return (
    <div className="space-y-8">
      {isTeacher && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">어떤 분야에서 활동하세요?</h3>
            <p className="text-sm text-gray-500">분야를 선택하면 관련 세부항목을 이어서 선택할 수 있어요.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {TEACHER_LEVEL_OPTIONS.map(({ level, title }) => {
              const isSelected = teacherLevel === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => handleTeacherLevelSelect(level)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    isSelected
                      ? 'border-[#4b83c6] bg-[#f1f5fb]'
                      : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
                  }`}
                >
                  <span className="text-sm font-semibold text-gray-900">{title}</span>
                </button>
              );
            })}
          </div>

          {/* 교사 고용 형태 선택 (유치원/초등/초등전담/중등만) */}
          {teacherLevel && ["유치원", "초등", "초등전담", "중등"].includes(teacherLevel) && (
            <div className="space-y-3">
              <div className="space-y-2">
                <h3 className="text-md font-bold text-gray-900">고용 형태를 선택해 주세요</h3>
                <p className="text-sm text-gray-500">맞춤형 추천을 위해 현재 상태를 알려주세요.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => onTeacherEmploymentTypeChange('기간제교사')}
                  className={`w-full rounded-lg border-2 p-4 transition-all ${
                    teacherEmploymentType === '기간제교사'
                      ? 'border-[#4b83c6] bg-[#f1f5fb]'
                      : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
                  }`}
                >
                  <div className="text-left space-y-1">
                    <span className="text-sm font-semibold text-gray-900">기간제 교사</span>
                    <p className="text-xs text-gray-500">공고 중심 추천 (6장)</p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => onTeacherEmploymentTypeChange('정규교원')}
                  className={`w-full rounded-lg border-2 p-4 transition-all ${
                    teacherEmploymentType === '정규교원'
                      ? 'border-[#4b83c6] bg-[#f1f5fb]'
                      : 'border-gray-200 bg-white hover:border-[#7aa3cc]'
                  }`}
                >
                  <div className="text-left space-y-1">
                    <span className="text-sm font-semibold text-gray-900">정규 교원</span>
                    <p className="text-xs text-gray-500">인력풀 & 체험 중심 (2장 + 4장)</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {teacherLevel === "특수" && (
            <div className="space-y-3">
              <span className="text-sm font-semibold text-gray-900">특수 교사 유형</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {["초등특수", "중등특수"].map((type) => {
                  const typed = type as SpecialEducationType;
                  const isSelected = specialEducationType === typed;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => handleSpecialEducationSelect(typed)}
                      className={`rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                        isSelected
                          ? "border-[#4b83c6] bg-[#4b83c6] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]"
                      }`}
                    >
                      {type === "초등특수" ? "초등 특수" : "중등 특수"}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {teacherLevel === "초등" && (
            <div className="space-y-2">
              <span className="text-sm text-gray-600">초등 담임 기준으로 추천해 드릴게요.</span>
            </div>
          )}

          {teacherLevel === "유치원" && (
            <div className="space-y-2">
              <span className="text-sm text-gray-600">유치원 담임 기준으로 추천해 드릴게요.</span>
            </div>
          )}

          {/* 과목/분야 선택 (초등전담, 중등, 비교과, 방과후/돌봄, 행정·교육지원) */}
          {needsSubjectSelection && (
            <div className="space-y-4">
              <span className="text-sm font-semibold text-gray-900">
                {teacherLevel === "중등" ? "담당 가능한 교과를 모두 선택해 주세요" :
                 teacherLevel === "초등전담" ? "전담 가능한 과목을 선택해 주세요" :
                 teacherLevel === "비교과" ? "담당 분야를 선택해 주세요" :
                 teacherLevel === "방과후/돌봄" ? "활동 분야를 선택해 주세요" :
                 "해당 직종을 선택해 주세요"}
              </span>

              <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                {getSubjectsForLevel().map((subject) => {
                  const isSelected = teacherSubjects.includes(subject);
                  const displayLabel = subject.replace(/^(중등|초등전담|비교과|방과후|행정) /, '');
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleTeacherSubject(subject)}
                      className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                        isSelected
                          ? "border-[#4b83c6] bg-[#4b83c6] text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]"
                      }`}
                    >
                      {displayLabel}
                    </button>
                  );
                })}
              </div>

              {/* 중등: 초등 전담 가능 과목 (크로스오버) */}
              {teacherLevel === "중등" && (
                <div className="space-y-2">
                  <span className="text-xs text-gray-600">초등 전담 가능 과목</span>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                    {MIDDLE_CROSSOVER_SUBJECTS.map((subject) => {
                      const isSelected = teacherSubjects.includes(subject);
                      return (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleTeacherSubject(subject)}
                          className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                            isSelected
                              ? "border-[#4b83c6] bg-[#4b83c6] text-white"
                              : "border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]"
                          }`}
                        >
                          {subject}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 직접 입력한 과목 표시 */}
              {(() => {
                const allKnownSubjects = [
                  ...getSubjectsForLevel(),
                  ...MIDDLE_CROSSOVER_SUBJECTS
                ];
                const customSubjects = teacherSubjects.filter(
                  (subject) => !allKnownSubjects.includes(subject)
                );
                return customSubjects.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-xs text-gray-600">직접 입력한 과목</span>
                    <div className="flex flex-wrap gap-2">
                      {customSubjects.map((subject) => (
                        <button
                          key={subject}
                          type="button"
                          onClick={() => toggleTeacherSubject(subject)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border-2 border-[#4b83c6] bg-[#4b83c6] text-white text-xs font-medium hover:bg-[#3d73b4] transition-colors"
                        >
                          {subject}
                          <span className="text-xs">✕</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}

              {/* 기타 과목 직접 입력 (중등만) */}
              {teacherLevel === "중등" && (
                <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    기타 과목 (직접 입력)
                  </label>
                  <input
                    type="text"
                    placeholder="예: 한문, 일본어, 중국어"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
                    value={customSubject}
                    onChange={(e) => setCustomSubject(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleCustomSubjectAdd();
                      }
                    }}
                    onBlur={handleCustomSubjectAdd}
                  />
                  <p className="text-xs text-gray-500">Enter 키를 누르거나 다른 곳을 클릭하면 추가됩니다</p>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {isInstructor && (
        <section className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">강사 분야를 선택해 주세요</h3>
            <p className="text-sm text-gray-500">여러 분야를 선택하면 AI가 더 넓은 기회를 찾아드려요.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {INSTRUCTOR_FIELD_OPTIONS.map((field) => {
              const isSelected = instructorFields.includes(field);
              return (
                <button
                  key={field}
                  type="button"
                  onClick={() => toggleInstructorField(field)}
                  className={`px-3 py-2 rounded-lg border text-sm font-medium transition-all ${
                    isSelected
                      ? "border-[#4b83c6] bg-[#4b83c6] text-white"
                      : "border-gray-200 bg-white text-gray-700 hover:border-[#7aa3cc]"
                  }`}
                >
                  {field}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">추가 분야 (선택)</label>
            <input
              type="text"
              value={instructorCustomField}
              onChange={(event) => onInstructorCustomFieldChange(event.target.value)}
              placeholder="직접 입력해주세요"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
            />
          </div>
        </section>
      )}
    </div>
  );
}
