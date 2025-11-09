'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';

const WELCOME_TOUR_COMPLETED_KEY = 'sellmebuyme_welcome_tour_completed';
const DEVELOPER_EMAIL = 'l30417305@gmail.com';

interface TourStep {
  id: number;
  description: string;
  gifPath: string;
  altText: string;
}

const WELCOME_TOUR_STEPS: TourStep[] = [
  {
    id: 1,
    description: '상단 타이틀 로고 옆 버튼을 클릭하시면\n보시고 싶은 파트만 보실 수 있습니다',
    gifPath: '/picture/tour1.gif',
    altText: '전환 토글 버튼 사용 방법'
  },
  {
    id: 2,
    description: '자신의 상황에 맞게 등록하실 수 있습니다',
    gifPath: '/picture/tour2.gif',
    altText: '등록 버튼 사용 방법'
  },
  {
    id: 3,
    description: '로그인 하시면 추천카드가 정확하게 표시됩니다',
    gifPath: '/picture/tour3.gif',
    altText: '로그인 및 AI 추천 기능'
  }
];

export default function WelcomeTourModal() {
  const [isActive, setIsActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const { user } = useAuthStore((state) => ({ user: state.user }));

  const isDeveloper = user?.email === DEVELOPER_EMAIL;

  // 초기 진입 시 투어 시작 여부 결정
  useEffect(() => {
    if (isDeveloper) {
      // 개발자는 localStorage 무시
      return;
    }

    const hasCompleted = localStorage.getItem(WELCOME_TOUR_COMPLETED_KEY);
    if (!hasCompleted) {
      setIsActive(true);
    }
  }, [isDeveloper]);

  // 투어 종료
  const endTour = () => {
    if (!isDeveloper) {
      localStorage.setItem(WELCOME_TOUR_COMPLETED_KEY, 'true');
    }
    setIsActive(false);
    setCurrentStepIndex(0);
  };

  // 다음 단계
  const handleNext = () => {
    if (currentStepIndex < WELCOME_TOUR_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      endTour();
    }
  };

  if (!isActive) return null;

  const currentStep = WELCOME_TOUR_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === WELCOME_TOUR_STEPS.length - 1;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 backdrop-blur-md font-esamanru"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="relative w-full max-w-3xl mx-4 rounded-3xl bg-white shadow-2xl p-8"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* GIF 표시 영역 */}
              <div className="relative aspect-video border-2 border-gray-200 rounded-2xl overflow-hidden bg-gray-50">
                <img
                  src={currentStep.gifPath}
                  alt={currentStep.altText}
                  className="w-full h-full object-contain"
                  loading="eager"
                />
              </div>

              {/* 텍스트 설명 */}
              <p className="text-lg text-gray-700 leading-relaxed text-center whitespace-pre-line">
                {currentStep.description}
              </p>

              {/* 진행 상황 점 (3개) */}
              <div className="flex justify-center gap-2 pt-2">
                {WELCOME_TOUR_STEPS.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 w-2 rounded-full transition-all duration-300 ${
                      index === currentStepIndex
                        ? 'bg-[#4b83c6] w-6'
                        : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>

              {/* 다음 버튼 */}
              <div className="flex justify-center pt-4">
                <button
                  type="button"
                  onClick={handleNext}
                  className="h-12 px-12 rounded-xl bg-[#4b83c6] text-white font-semibold hover:bg-[#3d73b4] transition-colors"
                >
                  {isLastStep ? '시작하기' : '다음'}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// 외부에서 투어 재시작 함수 export (개발용)
export function restartWelcomeTour() {
  localStorage.removeItem(WELCOME_TOUR_COMPLETED_KEY);
  window.location.reload();
}
