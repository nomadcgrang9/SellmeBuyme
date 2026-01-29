/**
 * 구현 예정 기능 알림 모달
 * Anti-vibe 디자인: 이모지 금지, 심플
 */

import { X } from 'lucide-react';

interface ComingSoonModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
}

export default function ComingSoonModal({
  isOpen,
  onClose,
  featureName = '이 기능',
}: ComingSoonModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* 모달 본체 */}
      <div className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-full max-w-xs p-6 animate-scaleIn">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        {/* 내용 */}
        <div className="text-center pt-2">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            구현 예정
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {featureName} 기능은 빠른 시일 내 업데이트 예정입니다.
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
