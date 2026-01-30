/**
 * CascadingFilterBar + 레이어 토글 통합 컴포넌트
 * 탭 형태: 상단 레이어 토글은 컨텐츠 너비만큼, 하단 필터바는 전체 너비
 * 다크 글래스모피즘 테마
 */

import { useState } from 'react';
import { MapPin, User, Check } from 'lucide-react';
import PresentationGraph from '@solar-icons/react/csr/business/PresentationGraph';
import CascadingFilterBar from './CascadingFilterBar';
import type { CascadingFilter } from '@/lib/utils/jobClassifier';

interface CascadingFilterBarWithLayerToggleProps {
  filter: CascadingFilter;
  onFilterChange: (filter: CascadingFilter) => void;
  showJobLayer: boolean;
  showSeekerLayer: boolean;
  showInstructorLayer: boolean;
  onJobLayerToggle: () => void;
  onSeekerLayerToggle: () => void;
  onInstructorLayerToggle: () => void;
}

// 레이어 토글 버튼 설정
const LAYER_TOGGLES = [
  {
    key: 'job',
    label: '공고만 보기',
    icon: MapPin,
    activeColor: '#3B82F6',
  },
  {
    key: 'seeker',
    label: '구직자만 보기',
    icon: User,
    activeColor: '#10B981',
  },
  {
    key: 'instructor',
    label: '교원연수강사만 보기',
    icon: PresentationGraph,
    activeColor: '#EC4899',
  },
] as const;

// 다크 글래스모피즘 스타일
const glassStyle = {
  background: 'rgba(30, 30, 30, 0.92)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.15)',
};

export default function CascadingFilterBarWithLayerToggle({
  filter,
  onFilterChange,
  showJobLayer,
  showSeekerLayer,
  showInstructorLayer,
  onJobLayerToggle,
  onSeekerLayerToggle,
  onInstructorLayerToggle,
}: CascadingFilterBarWithLayerToggleProps) {
  const [hoveredLayer, setHoveredLayer] = useState<string | null>(null);

  const layerStates: Record<string, boolean> = {
    job: showJobLayer,
    seeker: showSeekerLayer,
    instructor: showInstructorLayer,
  };

  const toggleFunctions: Record<string, () => void> = {
    job: onJobLayerToggle,
    seeker: onSeekerLayerToggle,
    instructor: onInstructorLayerToggle,
  };

  return (
    <div className="flex flex-col items-start">
      {/* 상단: 레이어 토글 (w-fit, 좌측 정렬, 상단만 둥근 모서리, 하단 border 없음) */}
      <div
        className="flex items-center gap-1 px-3 py-1.5 w-fit"
        style={{
          ...glassStyle,
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          border: 'none',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          borderLeft: '1px solid rgba(255,255,255,0.1)',
          borderRight: '1px solid rgba(255,255,255,0.1)',
          // 하단 border 없음 - 필터바와 연결
        }}
      >
        {LAYER_TOGGLES.map(({ key, label, icon: Icon, activeColor }) => {
          const isActive = layerStates[key];
          const isHovered = hoveredLayer === key;
          // 교원연수강사만 보기만 원색 배경으로 강조
          const isInstructorToggle = key === 'instructor';
          const activeBgColor = isInstructorToggle ? activeColor : `${activeColor}30`;

          return (
            <button
              key={key}
              onClick={toggleFunctions[key]}
              onMouseEnter={() => setHoveredLayer(key)}
              onMouseLeave={() => setHoveredLayer(null)}
              className="relative flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all duration-200 rounded-md"
              style={{
                color: isActive ? '#FFFFFF' : isHovered ? '#E2E8F0' : '#94A3B8',
                backgroundColor: isActive
                  ? activeBgColor
                  : isHovered
                  ? 'rgba(255,255,255,0.08)'
                  : 'transparent',
              }}
              title={`${label.replace('만 보기', '')} 마커 표시/숨김`}
            >
              <Icon
                size={14}
                style={{
                  // 교원연수는 원색 배경이므로 아이콘도 흰색
                  color: isActive
                    ? (isInstructorToggle ? '#FFFFFF' : activeColor)
                    : isHovered ? '#E2E8F0' : '#94A3B8',
                }}
              />
              <span>{label}</span>
              {isActive && !isInstructorToggle && (
                <span
                  className="flex items-center justify-center rounded-full ml-0.5"
                  style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: activeColor,
                  }}
                >
                  <Check size={8} strokeWidth={3} color="#FFFFFF" />
                </span>
              )}
              {isActive && isInstructorToggle && (
                <Check size={12} strokeWidth={3} color="#FFFFFF" className="ml-0.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* 하단: CascadingFilterBar (좌측 상단만 직각 - 탭과 연결) */}
      <CascadingFilterBar
        filter={filter}
        onFilterChange={onFilterChange}
        noTopLeftRadius={true}
      />
    </div>
  );
}
