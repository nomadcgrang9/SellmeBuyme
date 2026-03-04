// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 비회원 미리보기 차단 오버레이
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { LogIn } from 'lucide-react';

interface WaglePreviewGateProps {
  onLoginClick: () => void;
}

export default function WaglePreviewGate({ onLoginClick }: WaglePreviewGateProps) {
  return (
    <div className="relative">
      {/* 상단 페이드 그라디언트 */}
      <div className="absolute -top-16 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />

      {/* 로그인 유도 */}
      <div className="flex flex-col items-center py-10 px-4">
        <p className="text-sm text-gray-500 mb-3 text-center">
          로그인하면 더 많은 글을 볼 수 있어요
        </p>
        <button
          onClick={onLoginClick}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-500 text-white text-sm font-semibold rounded-xl hover:bg-blue-600 active:bg-blue-700 transition-colors shadow-sm"
        >
          <LogIn size={16} />
          로그인하기
        </button>
      </div>
    </div>
  );
}
