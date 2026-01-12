// 마커 레이어 토글 컴포넌트
// Anti-Vibe Design 원칙 적용
// 작성일: 2026-01-12

import { MARKER_COLORS, type MarkerLayer } from '@/types/markers';

interface MarkerLayerToggleProps {
    activeLayers: MarkerLayer[];
    onToggle: (layer: MarkerLayer) => void;
    counts?: {
        job?: number;
        teacher?: number;
        program?: number;
    };
}

export default function MarkerLayerToggle({ activeLayers, onToggle, counts }: MarkerLayerToggleProps) {
    const layers: { key: MarkerLayer; label: string; color: string }[] = [
        { key: 'job', label: '학교공고', color: MARKER_COLORS.job },
        { key: 'teacher', label: '구직교사', color: MARKER_COLORS.teacher },
        { key: 'program', label: '프로그램', color: MARKER_COLORS.program }
    ];

    return (
        <div
            className="flex items-center gap-1.5 p-1.5 rounded-lg"
            style={{
                background: 'rgba(255, 255, 255, 0.9)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
            }}
        >
            {layers.map(({ key, label, color }) => {
                const isActive = activeLayers.includes(key);
                const count = counts?.[key];

                return (
                    <button
                        key={key}
                        onClick={() => onToggle(key)}
                        className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
                        style={{
                            backgroundColor: isActive ? `${color}15` : 'transparent',
                            color: isActive ? color : '#9CA3AF',
                            border: `1px solid ${isActive ? `${color}40` : 'transparent'}`
                        }}
                    >
                        {/* 색상 인디케이터 */}
                        <span
                            className="w-2 h-2 rounded-full transition-transform duration-200"
                            style={{
                                backgroundColor: color,
                                opacity: isActive ? 1 : 0.4,
                                transform: isActive ? 'scale(1)' : 'scale(0.8)'
                            }}
                        />

                        <span>{label}</span>

                        {/* 카운트 뱃지 */}
                        {count !== undefined && count > 0 && isActive && (
                            <span
                                className="ml-0.5 px-1.5 py-0.5 text-[10px] font-bold rounded-full"
                                style={{
                                    backgroundColor: `${color}20`,
                                    color: color
                                }}
                            >
                                {count > 99 ? '99+' : count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
