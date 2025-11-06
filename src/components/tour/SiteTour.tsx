'use client';

import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import TourOverlay from './TourOverlay';
import TourTooltip from './TourTooltip';
import { useAuthStore } from '@/stores/authStore';
import './tour.css';

const TOUR_COMPLETED_KEY = 'sellmebuyme_tour_completed';
const DEVELOPER_EMAIL = 'l30417305@gmail.com';

export interface TourStep {
  id: number;
  title: string;
  description: string;
  targetSelector: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 0,
    title: '셀바에 오신 것을 환영합니다!',
    description: '처음 방문하신 분들을 위해 주요 기능을 소개해드릴게요. 약 1분 정도 소요됩니다.',
    targetSelector: 'body',
    position: 'bottom'
  },
  {
    id: 1,
    title: '공고와 인력을 한눈에 비교해보세요',
    description: '밝은 상태에서 토글 버튼을 한번 클릭해보세요.\n상단의 토글 버튼으로 공고 등록과 인력 풀을\n자유롭게 전환할 수 있습니다.',
    targetSelector: 'button[title*="보기"]',
    position: 'bottom'
  },
  {
    id: 2,
    title: '선생님의 정보를 등록해보세요',
    description: '공고 등록, 인력 등록, 체험 등록을 통해 필요한 카드를 등록할 수 있습니다.',
    targetSelector: '[data-tour="register-buttons"]',
    position: 'right'
  },
  {
    id: 3,
    title: '가장 정확한 추천을 받아보세요',
    description: '로그인과 회원가입을 통해 프로필을 작성하면 선생님에게 맞춤형 카드를 추천해드립니다.',
    targetSelector: 'button:has-text("로그인"), button:has-text("프로필")',
    position: 'bottom'
  }
];

interface SiteTourProps {
  onStartTour?: () => void;
}

export default function SiteTour({ onStartTour }: SiteTourProps) {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [highlightPosition, setHighlightPosition] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const { user } = useAuthStore((state) => ({
    user: state.user
  }));

  const isDeveloper = user?.email === DEVELOPER_EMAIL;

  // 초기 진입 시 투어 시작 여부 결정
  useEffect(() => {
    if (isDeveloper) {
      // 개발자는 localStorage 무시
      return;
    }

    const hasCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!hasCompleted) {
      startTour();
    }
  }, [isDeveloper]);

  // 투어 시작
  const startTour = () => {
    setIsActive(true);
    setCurrentStep(0);
    onStartTour?.();
  };

  // 투어 종료
  const endTour = () => {
    if (!isDeveloper) {
      localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    }
    setIsActive(false);
    setCurrentStep(0);
    setHighlightElement(null);
    setHighlightPosition(null);
  };

  // 다음 단계
  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      endTour();
    }
  };

  // 하이라이트 요소 업데이트
  useEffect(() => {
    if (!isActive) return;

    const step = TOUR_STEPS[currentStep];
    if (!step) return;

    // Step 0은 중앙 표시 (요소 선택 안 함)
    if (currentStep === 0) {
      setHighlightElement(null);
      setHighlightPosition(null);
      return;
    }

    // 요소 찾기
    let element: HTMLElement | null = null;

    if (step.targetSelector === 'body') {
      element = document.body;
    } else {
      // 여러 선택자 시도
      const selectors = step.targetSelector.split(',').map(s => s.trim());
      for (const selector of selectors) {
        try {
          element = document.querySelector(selector) as HTMLElement;
          if (element) break;
        } catch {
          // 선택자 오류 무시
        }
      }
    }

    if (element) {
      setHighlightElement(element);
      const rect = element.getBoundingClientRect();
      setHighlightPosition({
        top: rect.top + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
        height: rect.height
      });

      // 요소가 화면에 보이도록 스크롤
      setTimeout(() => {
        element?.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }, 100);
    }
  }, [isActive, currentStep]);

  // Step 1: 토글 클릭 감지 및 카드 애니메이션
  useEffect(() => {
    if (!isActive || currentStep !== 1) return;

    const toggleButton = document.querySelector('button[title*="보기"]') as HTMLElement;
    if (!toggleButton) return;

    const handleToggleClick = () => {
      // 카드 영역 애니메이션
      const cardArea = document.querySelector('[class*="CardGrid"]') as HTMLElement;
      if (cardArea) {
        cardArea.classList.add('tour-card-transition');
        setTimeout(() => {
          cardArea.classList.remove('tour-card-transition');
        }, 600);
      }

      // 1초 후 Step 2로 진행
      setTimeout(() => {
        handleNext();
      }, 1000);
    };

    toggleButton.addEventListener('click', handleToggleClick);
    return () => toggleButton.removeEventListener('click', handleToggleClick);
  }, [isActive, currentStep, handleNext]);

  // 외부 클릭 감지 (투어 중단)
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        endTour();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isActive]);

  if (!isActive) return null;

  const step = TOUR_STEPS[currentStep];
  const isLastStep = currentStep === TOUR_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <AnimatePresence>
      <TourOverlay
        highlightPosition={highlightPosition}
        isFirstStep={isFirstStep}
      >
        <TourTooltip
          step={step}
          isLastStep={isLastStep}
          isFirstStep={isFirstStep}
          onNext={handleNext}
          onClose={endTour}
          highlightPosition={highlightPosition}
        />
      </TourOverlay>
    </AnimatePresence>
  );
}

// 외부에서 투어 시작 함수 export
export function startSiteTour() {
  localStorage.removeItem(TOUR_COMPLETED_KEY);
  window.location.reload();
}
