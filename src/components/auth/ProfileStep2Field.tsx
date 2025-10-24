"use client";

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
  {
    level: "유치원",
    title: "유치원 교사"
  },
  {
    level: "초등",
    title: "초등 교사"
  },
  {
    level: "중등",
    title: "중등 교사"
  },
  {
    level: "특수",
    title: "특수 교사"
  }
];

export const ELEMENTARY_SUBJECTS = [
  "초등 담임",
  "초등 과학",
  "초등 영어",
  "초등 체육",
  "초등 음악",
  "초등 미술",
  "초등 실과"
];

export const MIDDLE_SUBJECTS = [
  "중등 국어",
  "중등 수학",
  "중등 사회",
  "중등 도덕",
  "중등 과학",
  "중등 영어",
  "중등 체육",
  "중등 음악",
  "중등 미술",
  "중등 기술·가정",
  "중등 정보",
  "중등 생활지도",
  "초등 과학",
  "초등 영어",
  "초등 체육",
  "초등 음악",
  "초등 미술",
  "초등 실과"
];

interface ProfileStep2FieldProps {
  roles: RoleOption[];
  teacherLevel: TeacherLevel | null;
  specialEducationType: SpecialEducationType | null;
  teacherSubjects: string[];
  instructorFields: string[];
  instructorCustomField: string;
  onTeacherLevelChange: (level: TeacherLevel | null) => void;
  onSpecialEducationTypeChange: (type: SpecialEducationType | null) => void;
  onTeacherSubjectsChange: (subjects: string[]) => void;
  onInstructorFieldsChange: (fields: string[]) => void;
  onInstructorCustomFieldChange: (field: string) => void;
  onSyncCapableSubjects: (subjects: string[]) => void;
}

export default function ProfileStep2Field({
  roles,
  teacherLevel,
  specialEducationType,
  teacherSubjects,
  instructorFields,
  instructorCustomField,
  onTeacherLevelChange,
  onSpecialEducationTypeChange,
  onTeacherSubjectsChange,
  onInstructorFieldsChange,
  onInstructorCustomFieldChange,
  onSyncCapableSubjects
}: ProfileStep2FieldProps) {
  const isTeacher = roles.includes("교사");
  const isInstructor = roles.includes("강사");

  if (!isTeacher && !isInstructor) {
    return null;
  }

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

  return (
    <div className="space-y-8">
      {isTeacher && (
        <section className="space-y-6">
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-gray-900">어떤 학교급에서 활동하세요?</h3>
            <p className="text-sm text-gray-500">학교급을 선택하면 관련 과목을 이어서 선택할 수 있어요.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

          {teacherLevel === "중등" && (
            <div className="space-y-3">
              <span className="text-sm font-semibold text-gray-900">담당 가능한 교과를 모두 선택해 주세요</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {MIDDLE_SUBJECTS.map((subject) => {
                  const isSelected = teacherSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleTeacherSubject(subject)}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
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

          {teacherLevel === "유치원" && (
            <div className="space-y-2">
              <span className="text-sm text-gray-600">유치원 담임 기준으로 추천해 드릴게요.</span>
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
