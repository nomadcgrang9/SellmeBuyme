import { X, Briefcase, Users, Sparkles } from 'lucide-react';

interface RegisterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectType: (type: 'job' | 'talent' | 'experience') => void;
}

export default function RegisterBottomSheet({
  isOpen,
  onClose,
  onSelectType
}: RegisterBottomSheetProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* 배경 오버레이 */}
      <div
        className="md:hidden fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* 바텀시트 */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl animate-slide-up pb-safe">
        {/* 핸들 */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-3 border-b">
          <h3 className="text-lg font-bold text-gray-900">등록하기</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:bg-gray-200 transition-colors"
            aria-label="닫기"
          >
            <X size={20} strokeWidth={1.5} className="text-gray-600" />
          </button>
        </div>

        {/* 등록 옵션 */}
        <div className="px-6 py-6 space-y-3">
          {/* 공고 등록 */}
          <button
            onClick={() => {
              onSelectType('job');
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#a8c5e0] active:bg-gray-50 transition-all"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#a8c5e0]/20 flex items-center justify-center">
              <Briefcase size={24} strokeWidth={1.5} className="text-[#7aa3cc]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base font-bold text-gray-900">공고 등록</h4>
              <p className="text-sm text-gray-500">교사·강사 채용 공고를 등록합니다</p>
            </div>
          </button>

          {/* 인력 등록 */}
          <button
            onClick={() => {
              onSelectType('talent');
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#c5e3d8] active:bg-gray-50 transition-all"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#c5e3d8]/20 flex items-center justify-center">
              <Users size={24} strokeWidth={1.5} className="text-[#7db8a3]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base font-bold text-gray-900">인력 등록</h4>
              <p className="text-sm text-gray-500">교사·강사 프로필을 등록합니다</p>
            </div>
          </button>

          {/* 체험 등록 */}
          <button
            onClick={() => {
              onSelectType('experience');
              onClose();
            }}
            className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-[#ffd98e] active:bg-gray-50 transition-all"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#ffd98e]/20 flex items-center justify-center">
              <Sparkles size={24} strokeWidth={1.5} className="text-[#f4c96b]" />
            </div>
            <div className="flex-1 text-left">
              <h4 className="text-base font-bold text-gray-900">체험 등록</h4>
              <p className="text-sm text-gray-500">교육 체험 프로그램을 등록합니다</p>
            </div>
          </button>
        </div>
      </div>
    </>
  );
}
