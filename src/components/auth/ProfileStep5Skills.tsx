'use client';

interface ProfileStep5SkillsProps {
  additionalSkills: string;
  onSkillsChange: (skills: string) => void;
}

export default function ProfileStep5Skills({
  additionalSkills,
  onSkillsChange
}: ProfileStep5SkillsProps) {
  const skillCount = additionalSkills.trim().split('\n').filter((line) => line.trim()).length;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-lg font-bold text-gray-900">추가 역량</h3>
        <p className="text-sm text-gray-500">보유하신 추가 역량을 입력해 주세요. (선택사항)</p>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-[#7aa3cc]">추가 역량</span>
          <h4 className="text-base font-bold text-gray-900">본인을 소개하는 설명</h4>
          <p className="text-xs text-gray-500">본인의 역량을 자유롭게 소개해 주세요.</p>
        </div>

        <textarea
          value={additionalSkills}
          onChange={(e) => onSkillsChange(e.target.value)}
          placeholder="예: 생활지도, 교권보호 관련 교직원 연수 가능합니다.\n인공지능이나 놀이교육 관련 연수나 학생 수업도 진행할 수 있습니다."
          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3] resize-none"
          rows={6}
        />

        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>입력된 역량: {skillCount}개</span>
          <span className="text-[#7aa3cc] font-semibold">AI 추천 정확도 향상</span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#e3edf9] bg-[#f6f9fe] px-5 py-4">
        <div className="space-y-2">
          <h5 className="text-sm font-bold text-gray-900">💡 팁</h5>
          <p className="text-xs text-gray-600">
            추가 역량을 입력하면 AI가 더 정확하게 맞춤 공고를 추천해 드릴 수 있습니다. 
            외국어, 특기, 자격증, 경험 등 자유롭게 입력해 주세요.
          </p>
        </div>
      </div>
    </div>
  );
}
