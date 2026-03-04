// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 즐겨찾기(북마크) 데스크탑 사이드 패널
// DesktopWaglePanel과 동일한 구조 / Anti-Vibe Design 원칙 적용
// 작성일: 2026-03-04
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, Star, Bookmark } from 'lucide-react';
import { IconHeart } from '@tabler/icons-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '@/stores/authStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { useSidePanelStore } from '@/stores/sidePanelStore';
import { useToastStore } from '@/stores/toastStore';
import { fetchBookmarkedCards, removeBookmark } from '@/lib/supabase/queries';
import type { Card, JobPostingCard, TalentCard, ExperienceCard } from '@/types';

// ━━━ 타입 ━━━

type FavoriteTab = 'all' | 'job' | 'talent' | 'experience';

interface FavoritesPanelProps {
    isOpen: boolean;
    onClose: () => void;
    /** 카드 클릭 시 지도로 이동 + 상세 패널 열기 */
    onJobCardClick?: (job: JobPostingCard) => void;
    onTeacherCardClick?: (id: string) => void;
    onInstructorCardClick?: (id: string) => void;
}

// ━━━ 마감 여부 유틸 ━━━

function isExpired(deadline?: string | null): boolean {
    if (!deadline) return false;
    try {
        const t = new Date(deadline).getTime();
        if (isNaN(t)) return false;
        return t < Date.now();
    } catch {
        return false;
    }
}

// ━━━ D-day 계산 ━━━

function getDdayLabel(deadline?: string | null): string {
    if (!deadline) return '';
    try {
        const t = new Date(deadline).getTime();
        if (isNaN(t)) return '';
        const days = Math.ceil((t - Date.now()) / (1000 * 60 * 60 * 24));
        if (days < 0) return '마감';
        if (days === 0) return 'D-day';
        return `D-${days}`;
    } catch {
        return '';
    }
}

// ━━━ 개별 즐겨찾기 카드 컴포넌트 ━━━

interface FavoriteCardItemProps {
    card: Card;
    onRemove: (cardId: string, cardType: string) => void;
    onCardClick: (card: Card) => void;
}

function FavoriteCardItem({ card, onRemove, onCardClick }: FavoriteCardItemProps) {
    const [removing, setRemoving] = useState(false);

    const handleRemove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setRemoving(true);
        const cardType = card.type === 'job' ? 'job' : card.type === 'talent' ? 'talent' : 'experience';
        await onRemove(card.id, cardType);
        setRemoving(false);
    };

    if (card.type === 'job') {
        const job = card as JobPostingCard;
        const expired = isExpired(job.deadline);
        const ddayLabel = getDdayLabel(job.deadline);

        // 타입 색상
        const headerBg = 'linear-gradient(135deg, #9DD2FF 0%, #68B2FF 100%)';

        return (
            <div
                className="relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow group"
                style={{ height: '124px' }}
                onClick={() => onCardClick(card)}
            >
                {/* 상단 색상 바 */}
                <div
                    className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
                    style={{ background: headerBg }}
                >
                    <span className="text-[11px] font-medium text-white/90">공고</span>
                    <div className="flex items-center gap-1.5">
                        {expired ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20 text-white font-medium">마감</span>
                        ) : ddayLabel ? (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ddayLabel === 'D-day' ? 'bg-red-100 text-red-600' : 'bg-white/20 text-white'
                                }`}>
                                {ddayLabel}
                            </span>
                        ) : null}
                    </div>
                </div>

                {/* 본문 */}
                <div className="px-3 pt-1.5 pb-1" style={{ height: 'calc(124px - 30px - 32px)', overflow: 'hidden' }}>
                    <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-tight">{job.organization || '기관명 없음'}</p>
                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">{job.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {job.location && <span>📍 {job.location}</span>}
                        {job.compensation && <span className="ml-1.5">💰 {job.compensation}</span>}
                    </p>
                </div>

                {/* 하단 고정 - 해제 버튼 */}
                <div className="absolute bottom-0 left-0 right-0 flex justify-end items-center px-3 py-1.5 bg-white/95 border-t border-gray-100">
                    <button
                        onClick={handleRemove}
                        disabled={removing}
                        className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                        <IconHeart size={13} fill="currentColor" className="text-red-500" />
                        {removing ? '...' : '해제'}
                    </button>
                </div>
            </div>
        );
    }

    if (card.type === 'talent') {
        const talent = card as TalentCard;
        const headerBg = 'linear-gradient(135deg, #7db8a3 0%, #6fb59b 100%)';

        return (
            <div
                className="relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                style={{ height: '124px' }}
                onClick={() => onCardClick(card)}
            >
                <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ background: headerBg }}>
                    <span className="text-[11px] font-medium text-white/90">구직</span>
                </div>

                <div className="px-3 pt-1.5 pb-1" style={{ height: 'calc(124px - 30px - 32px)', overflow: 'hidden' }}>
                    <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-tight">
                        {(talent as any).name || (talent as any).nickname || '이름 없음'}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                        {(talent as any).subjects?.join(', ') || (talent as any).primaryCategory || ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {(talent as any).location && <span>📍 {(talent as any).location}</span>}
                    </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex justify-end items-center px-3 py-1.5 bg-white/95 border-t border-gray-100">
                    <button
                        onClick={handleRemove}
                        disabled={removing}
                        className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                        <IconHeart size={13} fill="currentColor" className="text-red-500" />
                        {removing ? '...' : '해제'}
                    </button>
                </div>
            </div>
        );
    }

    if (card.type === 'experience') {
        const exp = card as ExperienceCard;
        const headerBg = 'linear-gradient(135deg, #ffd98e 0%, #f4c96b 100%)';

        return (
            <div
                className="relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                style={{ height: '124px' }}
                onClick={() => onCardClick(card)}
            >
                <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0" style={{ background: headerBg }}>
                    <span className="text-[11px] font-medium text-gray-700/80">강사/연수</span>
                </div>

                <div className="px-3 pt-1.5 pb-1" style={{ height: 'calc(124px - 30px - 32px)', overflow: 'hidden' }}>
                    <p className="text-[13px] font-semibold text-gray-900 line-clamp-1 leading-tight">
                        {exp.programTitle || '프로그램명 없음'}
                    </p>
                    <p className="text-xs text-gray-600 line-clamp-1 mt-0.5">
                        {exp.categories?.join(', ') || ''}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                        {exp.locationSummary && <span>📍 {exp.locationSummary}</span>}
                    </p>
                </div>

                <div className="absolute bottom-0 left-0 right-0 flex justify-end items-center px-3 py-1.5 bg-white/95 border-t border-gray-100">
                    <button
                        onClick={handleRemove}
                        disabled={removing}
                        className="flex items-center gap-1 text-[11px] text-red-400 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                        <IconHeart size={13} fill="currentColor" className="text-red-500" />
                        {removing ? '...' : '해제'}
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

// ━━━ 메인 패널 ━━━

export default function FavoritesPanel({
    isOpen,
    onClose,
    onJobCardClick,
    onTeacherCardClick,
    onInstructorCardClick,
}: FavoritesPanelProps) {
    const { user } = useAuthStore();
    const { removeBookmark: removeFromStore, bookmarkCount } = useBookmarkStore();
    const { showToast } = useToastStore();
    const favZ = useSidePanelStore((s) => s.panelZ['favorites'] ?? 30);
    const panelRef = useRef<HTMLDivElement>(null);

    const [activeTab, setActiveTab] = useState<FavoriteTab>('all');
    const [cards, setCards] = useState<Card[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // 패널이 열릴 때 데이터 fetch
    const loadFavorites = useCallback(async () => {
        if (!user?.id) return;
        setIsLoading(true);
        try {
            const result = await fetchBookmarkedCards(user.id);
            setCards(result);
        } catch (err) {
            console.error('[FavoritesPanel] 즐겨찾기 로드 실패:', err);
        } finally {
            setIsLoading(false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (isOpen && user?.id) {
            void loadFavorites();
        }
        if (!isOpen) {
            // 닫힐 때 탭 초기화
            setActiveTab('all');
        }
    }, [isOpen, user?.id, loadFavorites]);

    // ESC 키로 닫기 + 바깥 클릭으로 닫기
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        const handleClickOutside = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        const timer = setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
        return () => {
            clearTimeout(timer);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    // 북마크 해제
    const handleRemoveBookmark = useCallback(async (cardId: string, cardType: string) => {
        if (!user?.id) return;
        try {
            await removeBookmark(user.id, cardId, cardType as any);
            removeFromStore(cardId);
            setCards(prev => prev.filter(c => c.id !== cardId));
            showToast('즐겨찾기에서 제거했습니다', 'info');
        } catch (err) {
            console.error('[FavoritesPanel] 북마크 해제 실패:', err);
            showToast('오류가 발생했습니다', 'error');
        }
    }, [user?.id, removeFromStore, showToast]);

    // 카드 클릭
    const handleCardClick = useCallback((card: Card) => {
        onClose(); // 패널 닫기
        if (card.type === 'job' && onJobCardClick) {
            onJobCardClick(card as JobPostingCard);
        } else if (card.type === 'talent' && onTeacherCardClick) {
            onTeacherCardClick(card.id);
        } else if (card.type === 'experience' && onInstructorCardClick) {
            onInstructorCardClick(card.id);
        }
    }, [onClose, onJobCardClick, onTeacherCardClick, onInstructorCardClick]);

    // 탭별 필터링
    const filteredCards = activeTab === 'all'
        ? cards
        : cards.filter(c => c.type === activeTab);

    // 탭별 카운트
    const counts = {
        all: cards.length,
        job: cards.filter(c => c.type === 'job').length,
        talent: cards.filter(c => c.type === 'talent').length,
        experience: cards.filter(c => c.type === 'experience').length,
    };

    const tabs: { key: FavoriteTab; label: string }[] = [
        { key: 'all', label: `전체 ${counts.all}` },
        { key: 'job', label: `공고 ${counts.job}` },
        { key: 'talent', label: `구직 ${counts.talent}` },
        { key: 'experience', label: `강사 ${counts.experience}` },
    ];

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    key="mobile-backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/40 md:hidden"
                    style={{ zIndex: favZ - 1 }}
                    onClick={onClose}
                />
            )}
            {isOpen && (
                <motion.div
                    ref={panelRef}
                    key="panel"
                    initial={{ opacity: 0, y: '100%' }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: '100%' }}
                    transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                    className="fixed bottom-0 left-0 right-0 h-[70vh] flex flex-col bg-white rounded-t-3xl overflow-hidden md:absolute md:inset-auto md:top-4 md:bottom-4 md:right-[128px] md:w-[380px] md:rounded-2xl md:h-auto"
                    style={{
                        zIndex: favZ,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
                        border: '1px solid rgba(0,0,0,0.06)',
                    }}
                >
                    {/* 드래그 핸들 (모바일만) */}
                    <div className="flex justify-center pt-2 pb-1 md:hidden">
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>

                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-5 py-3 shrink-0 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                            <Star size={17} className="text-amber-400" fill="currentColor" />
                            <h2 className="text-[15px] font-bold text-gray-900">즐겨찾기</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={17} />
                        </button>
                    </div>

                    {/* 탭 */}
                    <div className="flex shrink-0 border-b border-gray-100 px-2 pt-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors whitespace-nowrap ${activeTab === tab.key
                                    ? 'text-blue-600 border-b-2 border-blue-500'
                                    : 'text-gray-500 hover:text-gray-800'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* 콘텐츠 영역 */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                        {/* 비로그인 */}
                        {!user && (
                            <div className="flex-1 flex flex-col items-center justify-center py-16 text-center">
                                <Bookmark size={36} className="text-gray-300 mb-3" strokeWidth={1.5} />
                                <p className="text-sm font-medium text-gray-500">로그인 후 이용할 수 있어요</p>
                                <p className="text-xs text-gray-400 mt-1">공고나 구직자를 즐겨찾기에 추가해보세요</p>
                            </div>
                        )}

                        {/* 로딩 */}
                        {user && isLoading && (
                            <div className="py-12 flex flex-col items-center gap-3">
                                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                                <p className="text-xs text-gray-400">불러오는 중...</p>
                            </div>
                        )}

                        {/* 빈 상태 */}
                        {user && !isLoading && filteredCards.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-14 text-center">
                                <Star size={36} className="text-gray-200 mb-3" strokeWidth={1.5} />
                                <p className="text-sm font-medium text-gray-500">
                                    {activeTab === 'all' ? '아직 즐겨찾기가 없어요' : `즐겨찾기한 ${activeTab === 'job' ? '공고' : activeTab === 'talent' ? '구직자' : '강사'
                                        }가 없어요`}
                                </p>
                                <p className="text-xs text-gray-400 mt-1">별 버튼 눌러 추가해보세요 ⭐</p>
                            </div>
                        )}

                        {/* 카드 목록 */}
                        {user && !isLoading && filteredCards.map(card => (
                            <FavoriteCardItem
                                key={card.id}
                                card={card}
                                onRemove={handleRemoveBookmark}
                                onCardClick={handleCardClick}
                            />
                        ))}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
