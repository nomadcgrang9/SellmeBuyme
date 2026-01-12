// 하단 통합 컨트롤 바 컴포넌트
// 레이어 토글 + 마커 등록 버튼 통합
// Anti-Vibe Design 원칙 적용 - 다크 글래스모피즘
// 작성일: 2026-01-12

import { MARKER_COLORS, type MarkerLayer } from '@/types/markers';

interface BottomControlBarProps {
    // 레이어 토글
    activeLayers: MarkerLayer[];
    onToggleLayer: (layer: MarkerLayer) => void;
    // 마커 등록
    onTeacherMarkerClick: () => void;
    onProgramMarkerClick: () => void;
}

export default function BottomControlBar({
    activeLayers,
    onToggleLayer,
    onTeacherMarkerClick,
    onProgramMarkerClick
}: BottomControlBarProps) {
    const layers: { key: MarkerLayer; label: string; color: string }[] = [
        { key: 'job', label: '학교공고', color: MARKER_COLORS.job },
        { key: 'teacher', label: '구직교사', color: MARKER_COLORS.teacher },
        { key: 'program', label: '체험 프로그램', color: MARKER_COLORS.program }
    ];

    return (
        <div
            className="flex items-center gap-1 px-4 py-2.5 rounded-xl"
            style={{
                background: 'rgba(25, 25, 25, 0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                border: '1px solid rgba(255,255,255,0.1)'
            }}
        >
            {/* 레이어 토글 영역 */}
            <div className="flex items-center gap-1">
                {layers.map(({ key, label, color }) => {
                    const isActive = activeLayers.includes(key);

                    return (
                        <button
                            key={key}
                            onClick={() => onToggleLayer(key)}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all duration-200 hover:bg-white/10"
                            style={{
                                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.45)'
                            }}
                        >
                            {/* 색상 도트 인디케이터 */}
                            <span
                                className="w-2 h-2 rounded-full transition-all duration-200"
                                style={{
                                    backgroundColor: color,
                                    opacity: isActive ? 1 : 0.4,
                                    boxShadow: isActive ? `0 0 6px ${color}` : 'none'
                                }}
                            />
                            <span>{label}</span>
                        </button>
                    );
                })}
            </div>

            {/* 구분선 */}
            <div className="w-px h-4 bg-white/20 mx-2" />

            {/* 마커 등록 버튼 영역 */}
            <div className="flex items-center gap-1">
                {/* 구직 등록 */}
                <button
                    onClick={onTeacherMarkerClick}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                    <span
                        className="text-sm font-bold"
                        style={{ color: MARKER_COLORS.teacher }}
                    >
                        +
                    </span>
                    <span>구직 등록</span>
                </button>

                {/* 강의 등록 */}
                <button
                    onClick={onProgramMarkerClick}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium text-white/90 hover:text-white hover:bg-white/10 transition-all"
                >
                    <span
                        className="text-sm font-bold"
                        style={{ color: MARKER_COLORS.program }}
                    >
                        +
                    </span>
                    <span>강의 등록</span>
                </button>
            </div>
        </div>
    );
}

