import React, { useState, useEffect } from 'react';
import { SurveyTracker } from '@/lib/utils/surveyTracking';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function WelcomeModal({ isOpen, onClose }: WelcomeModalProps) {
  const [neverShowAgain, setNeverShowAgain] = useState(false);

  // ESC 키 처리
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleClose = () => {
    if (neverShowAgain) {
      SurveyTracker.markNeverShow();
    }
    SurveyTracker.markWelcomeShown();
    onClose();
  };

  const handleSurveyClick = () => {
    const surveyUrl = import.meta.env.VITE_SURVEY_URL;
    if (surveyUrl) {
      SurveyTracker.markLinkClicked();
      window.open(surveyUrl, '_blank');
    }
    if (neverShowAgain) {
      SurveyTracker.markNeverShow();
    }
    SurveyTracker.markWelcomeShown();
    onClose();
  };

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // 배경 클릭 시에만 닫기 (모달 내부 클릭은 무시)
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-lg shadow-xl max-w-md mx-4 p-6 animate-scaleIn">
        {/* 제목 */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold text-[#1F2937] mb-2">
            학교일자리 베타 서비스
          </h2>
          <div className="w-32 h-0.5 bg-[#F87171] mx-auto" />
        </div>

        {/* 본문 */}
        <div className="text-center text-[#6B7280] mb-6 space-y-2">
          <p>현재 테스트 기간을 운영 중입니다.</p>
          <p>서비스를 이용해보시고 설문에 참여해주시면</p>
          <p>추첨을 통해 스타벅스 커피 쿠폰을 드립니다.</p>
        </div>

        {/* 설문 참여 버튼 */}
        <button
          onClick={handleSurveyClick}
          className="w-full bg-gradient-to-r from-[#5B6EF7] to-[#3B82F6] text-white font-medium py-3 rounded-lg mb-3 hover:brightness-95 transition-all active:scale-[0.98]"
        >
          설문 참여하기
        </button>

        {/* 나중에 버튼 */}
        <button
          onClick={handleClose}
          className="w-full bg-[#F3F4F6] text-[#6B7280] font-medium py-2.5 rounded-lg mb-4 hover:bg-gray-200 transition-all active:scale-[0.98]"
        >
          나중에
        </button>

        {/* 다시 보지 않기 체크박스 */}
        <div className="flex items-center justify-center gap-2">
          <input
            type="checkbox"
            id="never-show"
            checked={neverShowAgain}
            onChange={(e) => setNeverShowAgain(e.target.checked)}
            className="w-4 h-4 text-[#5B6EF7] border-[#9CA3AF] rounded focus:ring-[#5B6EF7] focus:ring-2"
          />
          <label htmlFor="never-show" className="text-sm text-[#6B7280] cursor-pointer select-none">
            다시 보지 않기
          </label>
        </div>
      </div>
    </div>
  );
}
