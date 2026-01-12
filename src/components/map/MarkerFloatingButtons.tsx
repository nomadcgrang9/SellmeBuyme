// 마커 등록 플로팅 버튼 컴포넌트
// Anti-Vibe Design 원칙 적용: 글래스모피즘, 세련된 마이크로 애니메이션
// 작성일: 2026-01-12

import { useState } from 'react';
import { MARKER_COLORS } from '@/types/markers';

interface MarkerFloatingButtonsProps {
    onTeacherMarkerClick: () => void;
    onProgramMarkerClick: () => void;
    isLoggedIn: boolean;
    onLoginRequired: () => void;
}

export default function MarkerFloatingButtons({
    onTeacherMarkerClick,
    onProgramMarkerClick,
    isLoggedIn,
    onLoginRequired
}: MarkerFloatingButtonsProps) {
    const [isHovered, setIsHovered] = useState<'teacher' | 'program' | null>(null);

    const handleClick = (type: 'teacher' | 'program') => {
        if (!isLoggedIn) {
            onLoginRequired();
            return;
        }

        if (type === 'teacher') {
            onTeacherMarkerClick();
        } else {
            onProgramMarkerClick();
        }
    };

    return (
        <div className="flex flex-col gap-2 mt-3">
            {/* 구분선 */}
            <div className="h-px bg-gray-200/60 mx-2" />

            {/* 구직 마커 등록 버튼 - Red */}
            <button
                onClick={() => handleClick('teacher')}
                onMouseEnter={() => setIsHovered('teacher')}
                onMouseLeave={() => setIsHovered(null)}
                className="group relative px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out overflow-hidden"
                style={{
                    background: isHovered === 'teacher'
                        ? `linear-gradient(135deg, ${MARKER_COLORS.teacher}15 0%, ${MARKER_COLORS.teacher}25 100%)`
                        : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${isHovered === 'teacher' ? MARKER_COLORS.teacher + '40' : 'rgba(229, 231, 235, 0.8)'}`,
                    boxShadow: isHovered === 'teacher'
                        ? `0 4px 20px ${MARKER_COLORS.teacher}20, 0 2px 8px rgba(0,0,0,0.04)`
                        : '0 2px 8px rgba(0,0,0,0.04)',
                    transform: isHovered === 'teacher' ? 'translateY(-1px)' : 'translateY(0)'
                }}
            >
                <span className="flex items-center gap-2">
                    {/* 마커 인디케이터 */}
                    <span
                        className="w-2.5 h-2.5 rounded-full transition-transform duration-300"
                        style={{
                            backgroundColor: MARKER_COLORS.teacher,
                            transform: isHovered === 'teacher' ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: isHovered === 'teacher' ? `0 0 8px ${MARKER_COLORS.teacher}60` : 'none'
                        }}
                    />
                    <span
                        className="transition-colors duration-200"
                        style={{
                            color: isHovered === 'teacher' ? MARKER_COLORS.teacher : '#374151'
                        }}
                    >
                        구직 등록
                    </span>
                </span>
            </button>

            {/* 프로그램 마커 등록 버튼 - Green */}
            <button
                onClick={() => handleClick('program')}
                onMouseEnter={() => setIsHovered('program')}
                onMouseLeave={() => setIsHovered(null)}
                className="group relative px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ease-out overflow-hidden"
                style={{
                    background: isHovered === 'program'
                        ? `linear-gradient(135deg, ${MARKER_COLORS.program}15 0%, ${MARKER_COLORS.program}25 100%)`
                        : 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: `1px solid ${isHovered === 'program' ? MARKER_COLORS.program + '40' : 'rgba(229, 231, 235, 0.8)'}`,
                    boxShadow: isHovered === 'program'
                        ? `0 4px 20px ${MARKER_COLORS.program}20, 0 2px 8px rgba(0,0,0,0.04)`
                        : '0 2px 8px rgba(0,0,0,0.04)',
                    transform: isHovered === 'program' ? 'translateY(-1px)' : 'translateY(0)'
                }}
            >
                <span className="flex items-center gap-2">
                    {/* 마커 인디케이터 */}
                    <span
                        className="w-2.5 h-2.5 rounded-full transition-transform duration-300"
                        style={{
                            backgroundColor: MARKER_COLORS.program,
                            transform: isHovered === 'program' ? 'scale(1.2)' : 'scale(1)',
                            boxShadow: isHovered === 'program' ? `0 0 8px ${MARKER_COLORS.program}60` : 'none'
                        }}
                    />
                    <span
                        className="transition-colors duration-200"
                        style={{
                            color: isHovered === 'program' ? MARKER_COLORS.program : '#374151'
                        }}
                    >
                        강의 등록
                    </span>
                </span>
            </button>
        </div>
    );
}
