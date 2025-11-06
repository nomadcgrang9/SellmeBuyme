'use client';

import { motion } from 'framer-motion';
import type { TourStep } from './SiteTour';

interface TourTooltipProps {
  step: TourStep;
  isLastStep: boolean;
  isFirstStep: boolean;
  onNext: () => void;
  onClose: () => void;
  highlightPosition: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
}

export default function TourTooltip({
  step,
  isLastStep,
  isFirstStep,
  onNext,
  onClose,
  highlightPosition
}: TourTooltipProps) {
  // 투어 박스 위치 계산
  const getTooltipPosition = () => {
    if (isFirstStep) {
      // 첫 단계: 화면 중앙
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    if (!highlightPosition) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)'
      };
    }

    const gap = 20;
    const tooltipWidth = 320;
    const tooltipHeight = 180;

    // 뷰포트 크기
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let top = highlightPosition.top + highlightPosition.height + gap;
    let left = highlightPosition.left + highlightPosition.width / 2;
    let transform = 'translate(-50%, 0)';

    // 아래쪽 공간 부족 시 위쪽
    if (top + tooltipHeight > viewportHeight) {
      top = highlightPosition.top - tooltipHeight - gap;
      transform = 'translate(-50%, 0)';
    }

    // 좌우 경계 체크
    if (left - tooltipWidth / 2 < 10) {
      left = tooltipWidth / 2 + 10;
    } else if (left + tooltipWidth / 2 > viewportWidth - 10) {
      left = viewportWidth - tooltipWidth / 2 - 10;
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform
    };
  };

  const tooltipStyle = getTooltipPosition();

  return (
    <motion.div
      className="tour-tooltip"
      style={tooltipStyle as React.CSSProperties}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <div className="tour-tooltip-content">
        <h3 className="tour-tooltip-title">{step.title}</h3>
        <p className="tour-tooltip-description">{step.description}</p>

        <div className="tour-tooltip-buttons">
          <button
            onClick={onNext}
            className="tour-btn tour-btn-primary"
          >
            {isLastStep ? '완료' : '다음'}
          </button>
        </div>
      </div>

      {/* 진행 상황 표시 (점) */}
      <div className="tour-progress">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`tour-progress-dot ${i <= step.id ? 'active' : ''}`}
          />
        ))}
      </div>
    </motion.div>
  );
}
