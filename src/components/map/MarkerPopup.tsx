// 마커 클릭 시 표시되는 팝업 컴포넌트
// Anti-Vibe Design 원칙 적용
// 작성일: 2026-01-12

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MARKER_COLORS, type TeacherMarker, type ProgramMarker, type MarkerComment } from '@/types/markers';
import { fetchMarkerComments, createMarkerComment } from '@/lib/supabase/markers';

interface MarkerPopupProps {
    type: 'teacher' | 'program';
    marker: TeacherMarker | ProgramMarker;
    position: { x: number; y: number };
    onClose: () => void;
}

export default function MarkerPopup({ type, marker, position, onClose }: MarkerPopupProps) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<MarkerComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [newCommentAuthor, setNewCommentAuthor] = useState('');
    const [newCommentContent, setNewCommentContent] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);

    const color = type === 'teacher' ? MARKER_COLORS.teacher : MARKER_COLORS.program;

    // 코멘트 로드
    const loadComments = async () => {
        setLoadingComments(true);
        try {
            const data = await fetchMarkerComments(type, marker.id);
            setComments(data);
        } catch (err) {
            console.error('코멘트 로드 실패:', err);
        } finally {
            setLoadingComments(false);
        }
    };

    // 코멘트 섹션 토글
    const toggleComments = async () => {
        if (!showComments) {
            await loadComments();
        }
        setShowComments(!showComments);
    };

    // 코멘트 제출
    const handleSubmitComment = async () => {
        if (!newCommentContent.trim()) return;

        setSubmittingComment(true);
        try {
            await createMarkerComment({
                marker_type: type,
                marker_id: marker.id,
                author_name: newCommentAuthor.trim() || undefined,
                content: newCommentContent.trim()
            });
            setNewCommentAuthor('');
            setNewCommentContent('');
            setIsAddingComment(false);
            await loadComments();
        } catch (err) {
            console.error('코멘트 작성 실패:', err);
        } finally {
            setSubmittingComment(false);
        }
    };

    // 팝업 위치 계산 (화면 밖으로 나가지 않도록)
    const popupStyle = {
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 400)
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl overflow-hidden"
                style={popupStyle}
            >
                {/* 헤더 */}
                <div
                    className="px-4 py-3 border-b flex items-center justify-between"
                    style={{
                        background: `linear-gradient(135deg, ${color}10 0%, ${color}20 100%)`,
                        borderColor: `${color}30`
                    }}
                >
                    <div className="flex items-center gap-2">
                        <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: color }}
                        />
                        <span className="font-bold text-gray-900 text-sm">
                            {type === 'teacher'
                                ? (marker as TeacherMarker).nickname
                                : (marker as ProgramMarker).program_title}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {type === 'teacher' ? (
                        // 구직 교사 마커 내용
                        <>
                            {(marker as TeacherMarker).subjects && (marker as TeacherMarker).subjects!.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">과목</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(marker as TeacherMarker).subjects!.map((s, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{s}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(marker as TeacherMarker).school_levels && (marker as TeacherMarker).school_levels!.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">학교급</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(marker as TeacherMarker).school_levels!.map((l, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{l}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(marker as TeacherMarker).experience_years && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">경력</span>
                                    <span className="text-xs text-gray-700">{(marker as TeacherMarker).experience_years}</span>
                                </div>
                            )}
                            {(marker as TeacherMarker).introduction && (
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {(marker as TeacherMarker).introduction}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : (
                        // 프로그램 마커 내용
                        <>
                            <div className="flex items-start gap-2">
                                <span className="text-xs text-gray-500 w-12 flex-shrink-0">대상</span>
                                <div className="flex flex-wrap gap-1">
                                    {(marker as ProgramMarker).target_grades.map((g, i) => (
                                        <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{g}</span>
                                    ))}
                                </div>
                            </div>
                            {(marker as ProgramMarker).categories && (marker as ProgramMarker).categories!.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">분야</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(marker as ProgramMarker).categories!.map((c, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-green-50 text-green-700 rounded-full">{c}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(marker as ProgramMarker).price_info && (
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500 w-12 flex-shrink-0">가격</span>
                                    <span className="text-xs font-medium text-gray-800">{(marker as ProgramMarker).price_info}</span>
                                </div>
                            )}
                            <div className="pt-2 border-t border-gray-100">
                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3">
                                    {(marker as ProgramMarker).description}
                                </p>
                            </div>
                        </>
                    )}

                    {/* 연락처 */}
                    <div className="pt-2 border-t border-gray-100">
                        <a
                            href={`mailto:${type === 'teacher' ? (marker as TeacherMarker).email : (marker as ProgramMarker).contact_email}`}
                            className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                            style={{ color }}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            {type === 'teacher' ? (marker as TeacherMarker).email : (marker as ProgramMarker).contact_email}
                        </a>
                        {type === 'program' && (marker as ProgramMarker).contact_phone && (
                            <a
                                href={`tel:${(marker as ProgramMarker).contact_phone}`}
                                className="ml-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:underline"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                {(marker as ProgramMarker).contact_phone}
                            </a>
                        )}
                    </div>
                </div>

                {/* 후기 섹션 */}
                <div className="border-t border-gray-100">
                    <button
                        onClick={toggleComments}
                        className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        <span>후기 {comments.length > 0 ? `(${comments.length})` : ''}</span>
                        <svg
                            className={`w-4 h-4 transition-transform ${showComments ? 'rotate-180' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>

                    <AnimatePresence>
                        {showComments && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="px-4 pb-3 space-y-2">
                                    {loadingComments ? (
                                        <div className="py-3 text-center text-xs text-gray-400">불러오는 중...</div>
                                    ) : comments.length === 0 ? (
                                        <div className="py-3 text-center text-xs text-gray-400">아직 후기가 없습니다</div>
                                    ) : (
                                        <div className="max-h-32 overflow-y-auto space-y-2">
                                            {comments.map((comment) => (
                                                <div key={comment.id} className="p-2 bg-gray-50 rounded-lg">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs font-medium text-gray-700">{comment.author_name}</span>
                                                        <span className="text-[10px] text-gray-400">
                                                            {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-gray-600">{comment.content}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* 후기 작성 */}
                                    {isAddingComment ? (
                                        <div className="pt-2 space-y-2">
                                            <input
                                                type="text"
                                                value={newCommentAuthor}
                                                onChange={(e) => setNewCommentAuthor(e.target.value)}
                                                placeholder="작성자 (선택)"
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400"
                                            />
                                            <textarea
                                                value={newCommentContent}
                                                onChange={(e) => setNewCommentContent(e.target.value)}
                                                placeholder="후기를 작성해주세요"
                                                rows={2}
                                                className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:border-gray-400 resize-none"
                                            />
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => setIsAddingComment(false)}
                                                    className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                                                >
                                                    취소
                                                </button>
                                                <button
                                                    onClick={handleSubmitComment}
                                                    disabled={submittingComment || !newCommentContent.trim()}
                                                    className="px-2.5 py-1 text-xs font-medium text-white rounded-md disabled:opacity-50"
                                                    style={{ backgroundColor: color }}
                                                >
                                                    {submittingComment ? '...' : '등록'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => setIsAddingComment(true)}
                                            className="w-full py-1.5 text-xs font-medium border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors"
                                        >
                                            후기 남기기
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
