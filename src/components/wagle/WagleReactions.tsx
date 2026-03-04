// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 와글와글 리액션 컴포넌트
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useRef, useEffect } from 'react';
import { Heart, HandMetal, HelpCircle, CheckCircle } from 'lucide-react';
import type { ReactionCounts, ReactionType } from '@/types/wagle';
import { useWagleStore } from '@/stores/wagleStore';

const REACTION_CONFIG: { type: ReactionType; icon: typeof Heart; label: string }[] = [
  { type: 'like', icon: Heart, label: '좋아요' },
  { type: 'cheer', icon: HandMetal, label: '응원' },
  { type: 'curious', icon: HelpCircle, label: '궁금' },
  { type: 'thanks', icon: CheckCircle, label: '감사' },
];

// ━━━ 인라인 리액션 표시 ━━━

interface WagleReactionsInlineProps {
  targetType: 'thread' | 'reply';
  targetId: string;
  reactionCounts: ReactionCounts;
  myReaction: ReactionType | null;
}

export function WagleReactionsInline({
  targetType,
  targetId,
  reactionCounts,
  myReaction,
}: WagleReactionsInlineProps) {
  const { toggleReaction } = useWagleStore();
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  // 팝업 외부 클릭 닫기
  useEffect(() => {
    if (!showPopup) return;
    const handleClick = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        setShowPopup(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPopup]);

  const handleLongPress = () => {
    setShowPopup(true);
  };

  const handleTouchStart = () => {
    timerRef.current = setTimeout(handleLongPress, 500);
  };

  const handleTouchEnd = () => {
    clearTimeout(timerRef.current);
  };

  const handleQuickTap = () => {
    // 빠른 탭 → 좋아요 토글
    toggleReaction(targetType, targetId, 'like');
  };

  const handleReactionSelect = (type: ReactionType) => {
    toggleReaction(targetType, targetId, type);
    setShowPopup(false);
  };

  const activeReactions = REACTION_CONFIG.filter(
    (r) => reactionCounts[r.type] > 0
  );

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* 리액션 카운트 표시 */}
      {activeReactions.length > 0 ? (
        activeReactions.map((r) => {
          const Icon = r.icon;
          const isMyReaction = myReaction === r.type;
          return (
            <button
              key={r.type}
              onClick={() => handleReactionSelect(r.type)}
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
              className={`flex items-center gap-0.5 text-xs transition-colors ${
                isMyReaction ? 'text-[#3B82F6] font-semibold' : 'text-gray-500'
              }`}
            >
              <Icon size={14} />
              {reactionCounts[r.type]}
            </button>
          );
        })
      ) : (
        <button
          onClick={handleQuickTap}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="flex items-center gap-0.5 text-xs text-gray-400 hover:text-gray-500"
        >
          <Heart size={14} />
        </button>
      )}

      {/* 리액션 선택 팝업 */}
      {showPopup && (
        <div
          ref={popupRef}
          className="absolute bottom-full left-0 mb-2 bg-white rounded-xl shadow-lg border border-gray-200 px-3 py-2 flex items-center gap-4 z-50"
        >
          {REACTION_CONFIG.map((r) => {
            const Icon = r.icon;
            const isActive = myReaction === r.type;
            return (
              <button
                key={r.type}
                onClick={() => handleReactionSelect(r.type)}
                className="flex flex-col items-center gap-0.5 group"
                title={r.label}
              >
                <Icon
                  size={24}
                  className={`transition-transform group-hover:scale-110 ${
                    isActive ? 'text-[#3B82F6]' : 'text-gray-500'
                  }`}
                />
                <span className="text-[10px] text-gray-400">{r.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ━━━ 상세 리액션 표시 (쓰레드 상세용) ━━━

interface WagleReactionsDetailProps {
  targetType: 'thread' | 'reply';
  targetId: string;
  reactionCounts: ReactionCounts;
  myReaction: ReactionType | null;
}

export function WagleReactionsDetail({
  targetType,
  targetId,
  reactionCounts,
  myReaction,
}: WagleReactionsDetailProps) {
  const { toggleReaction } = useWagleStore();

  return (
    <div className="flex items-center gap-3">
      {REACTION_CONFIG.map((r) => {
        const Icon = r.icon;
        const count = reactionCounts[r.type];
        const isActive = myReaction === r.type;
        if (count === 0 && !isActive) return null;
        return (
          <button
            key={r.type}
            onClick={() => toggleReaction(targetType, targetId, r.type)}
            className={`flex items-center gap-1 text-xs transition-colors ${
              isActive ? 'text-[#3B82F6] font-semibold' : 'text-gray-500'
            }`}
          >
            <Icon size={14} />
            {count}
          </button>
        );
      })}
    </div>
  );
}
