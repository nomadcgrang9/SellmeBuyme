/**
 * iOS Safari 수동 설치 가이드 모달
 * iOS는 beforeinstallprompt를 지원하지 않으므로 수동 안내 필요
 */
import { X, Share, Plus } from 'lucide-react';

interface IOSInstallGuideProps {
  onClose: () => void;
  onDismiss: () => void; // 다시 보지 않기
}

export default function IOSInstallGuide({ onClose, onDismiss }: IOSInstallGuideProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* 모달 */}
      <div className="relative w-full max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl mx-4 sm:mx-0">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">홈 화면에 추가</h3>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 안내 단계 */}
        <div className="p-4 space-y-4">
          {/* Step 1 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-[#a8c5e0] text-white rounded-full flex items-center justify-center text-sm font-medium">
              1
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                하단의 <Share className="w-4 h-4 inline-block mx-1 text-[#007AFF]" /> 공유 버튼 탭
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-[#a8c5e0] text-white rounded-full flex items-center justify-center text-sm font-medium">
              2
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                메뉴에서 <Plus className="w-4 h-4 inline-block mx-1" /> <strong>홈 화면에 추가</strong> 선택
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-6 h-6 bg-[#a8c5e0] text-white rounded-full flex items-center justify-center text-sm font-medium">
              3
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                우측 상단 <strong>추가</strong> 탭
              </p>
            </div>
          </div>
        </div>

        {/* 버튼 영역 */}
        <div className="p-4 pt-0 space-y-2">
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#a8c5e0] hover:bg-[#7aa3cc] text-gray-900 rounded-lg text-sm font-medium transition-colors"
          >
            확인
          </button>
          <button
            onClick={() => {
              onDismiss();
              onClose();
            }}
            className="w-full py-2 text-gray-500 text-xs hover:text-gray-700 transition-colors"
          >
            다시 보지 않기
          </button>
        </div>
      </div>
    </div>
  );
}
