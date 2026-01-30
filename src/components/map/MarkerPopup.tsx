// 마커 클릭 시 표시되는 팝업 컴포넌트
// Anti-Vibe Design 원칙 적용
// 작성일: 2026-01-12
// 수정: 2026-01-29 - 수정/삭제 기능, Gmail 연동 추가
// 수정: 2026-01-30 - 프로필 이미지, 좋아요, instructor 후기 추가

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User } from 'lucide-react';
import { MARKER_COLORS, getTeacherMarkerColor, type TeacherMarker, type ProgramMarker, type MarkerComment } from '@/types/markers';
import { type InstructorMarker, INSTRUCTOR_MARKER_COLORS } from '@/types/instructorMarkers';
import {
    fetchMarkerComments,
    createMarkerComment,
    deleteTeacherMarker,
    fetchMarkerLikeCount,
    checkUserLiked,
    toggleMarkerLike,
    fetchInstructorComments,
    createInstructorComment,
    type InstructorComment
} from '@/lib/supabase/markers';
import { deleteInstructorMarker } from '@/lib/supabase/instructorMarkers';
import { useAuthStore } from '@/stores/authStore';

// 브라우저 fingerprint 생성 (localStorage 기반)
function getUserFingerprint(): string {
    const key = 'sellmebuyme_fingerprint';
    let fingerprint = localStorage.getItem(key);
    if (!fingerprint) {
        fingerprint = crypto.randomUUID();
        localStorage.setItem(key, fingerprint);
    }
    return fingerprint;
}

interface MarkerPopupProps {
    type: 'teacher' | 'program' | 'instructor';
    marker: TeacherMarker | ProgramMarker | InstructorMarker;
    position: { x: number; y: number };
    onClose: () => void;
    onEdit?: (marker: TeacherMarker) => void;
    onDelete?: () => void;
}

export default function MarkerPopup({ type, marker, position, onClose, onEdit, onDelete }: MarkerPopupProps) {
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState<MarkerComment[]>([]);
    const [instructorComments, setInstructorComments] = useState<InstructorComment[]>([]);
    const [loadingComments, setLoadingComments] = useState(false);
    const [isAddingComment, setIsAddingComment] = useState(false);
    const [newCommentAuthor, setNewCommentAuthor] = useState('');
    const [newCommentContent, setNewCommentContent] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    // 좋아요 관련 state
    const [likeCount, setLikeCount] = useState(0);
    const [isLiked, setIsLiked] = useState(false);
    const [isLikeLoading, setIsLikeLoading] = useState(false);

    // 현재 로그인 유저 확인
    const currentUser = useAuthStore((state) => state.user);
    const isOwner = (type === 'teacher' && currentUser?.id === (marker as TeacherMarker).user_id) ||
        (type === 'instructor' && currentUser?.id === (marker as InstructorMarker).user_id);

    // ★ 타입별 색상 적용
    const MAIN_BLUE = '#3B82F6';
    const color = type === 'instructor' ? INSTRUCTOR_MARKER_COLORS.base : MAIN_BLUE;

    // 프로필 이미지 URL 가져오기 (teacher, instructor만)
    const profileImageUrl = type === 'teacher'
        ? (marker as TeacherMarker).profile_image_url
        : type === 'instructor'
            ? (marker as InstructorMarker).profile_image_url
            : null;

    // 좋아요 데이터 로드 (teacher, instructor만)
    useEffect(() => {
        if (type === 'program') return;

        const loadLikeData = async () => {
            const fingerprint = getUserFingerprint();
            const markerType = type as 'teacher' | 'instructor';

            try {
                const [count, liked] = await Promise.all([
                    fetchMarkerLikeCount(markerType, marker.id),
                    checkUserLiked(markerType, marker.id, fingerprint)
                ]);
                setLikeCount(count);
                setIsLiked(liked);
            } catch (err) {
                console.error('좋아요 데이터 로드 실패:', err);
            }
        };

        loadLikeData();
    }, [type, marker.id]);

    // 좋아요 토글
    const handleLike = useCallback(async () => {
        if (type === 'program' || isLikeLoading) return;

        setIsLikeLoading(true);
        try {
            const fingerprint = getUserFingerprint();
            const result = await toggleMarkerLike(type as 'teacher' | 'instructor', marker.id, fingerprint);
            setIsLiked(result.liked);
            setLikeCount(result.count);
        } catch (err) {
            console.error('좋아요 토글 실패:', err);
        } finally {
            setIsLikeLoading(false);
        }
    }, [type, marker.id, isLikeLoading]);

    // Gmail로 메일 보내기
    const handleOpenGmail = (email: string, nickname: string) => {
        const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${email}&su=${encodeURIComponent(`[학교일자리] ${nickname}님께 연락드립니다`)}`;
        window.open(gmailUrl, '_blank');
    };

    // 마커 삭제 핸들러
    const handleDelete = async () => {
        if (!isOwner) return;

        // 디버그: currentUser 확인
        console.log('[handleDelete] currentUser:', currentUser);
        console.log('[handleDelete] currentUser.id:', currentUser?.id);
        console.log('[handleDelete] marker.id:', marker.id);
        console.log('[handleDelete] type:', type);

        if (!currentUser?.id) {
            alert('로그인 상태를 확인해주세요.');
            return;
        }

        setIsDeleting(true);
        try {
            if (type === 'teacher') {
                await deleteTeacherMarker(marker.id, currentUser.id);
            } else if (type === 'instructor') {
                await deleteInstructorMarker(marker.id, currentUser.id);
            }
            onDelete?.();
            onClose();
        } catch (err) {
            console.error('마커 삭제 실패:', err);
            alert('삭제에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsDeleting(false);
            setShowDeleteConfirm(false);
        }
    };


    // 코멘트 로드 (모든 타입 지원)
    const loadComments = async () => {
        setLoadingComments(true);
        try {
            if (type === 'instructor') {
                const data = await fetchInstructorComments(marker.id);
                setInstructorComments(data);
            } else {
                const data = await fetchMarkerComments(type as 'teacher' | 'program', marker.id);
                setComments(data);
            }
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

    // 코멘트 제출 (모든 타입 지원)
    const handleSubmitComment = async () => {
        if (!newCommentContent.trim()) return;

        setSubmittingComment(true);
        try {
            if (type === 'instructor') {
                await createInstructorComment({
                    instructor_id: marker.id,
                    author_name: newCommentAuthor.trim() || undefined,
                    content: newCommentContent.trim()
                });
            } else {
                await createMarkerComment({
                    marker_type: type as 'teacher' | 'program',
                    marker_id: marker.id,
                    author_name: newCommentAuthor.trim() || undefined,
                    content: newCommentContent.trim()
                });
            }
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

    // 현재 코멘트 수
    const commentCount = type === 'instructor' ? instructorComments.length : comments.length;

    // 팝업 위치 계산 (화면 밖으로 나가지 않도록)
    const popupStyle = {
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 400)
    };

    const [imageLoaded, setImageLoaded] = useState(false);

    // 팝업이 닫히거나 마커가 바뀌면 이미지 로딩 상태 초기화
    useEffect(() => {
        setImageLoaded(false);
    }, [marker.id]);

    return (
        <AnimatePresence>
            {/* 투명 백드롭 - 외부 클릭 시 팝업 닫기 */}
            <motion.div
                key="marker-popup-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40"
                onClick={onClose}
            />
            <motion.div
                key="marker-popup-content"
                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="fixed z-50 w-80 bg-white rounded-xl shadow-2xl overflow-hidden"
                style={popupStyle}
                onClick={(e) => e.stopPropagation()}
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
                                : type === 'instructor'
                                    ? (marker as InstructorMarker).display_name
                                    : (marker as ProgramMarker).program_title}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        {/* 삭제 버튼만 - 본인 마커인 경우만 표시 (수정 버튼 삭제) */}
                        {isOwner && (
                            <button
                                onClick={() => setShowDeleteConfirm(true)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="삭제"
                            >
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-full transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* 본문 */}
                <div className="p-4 space-y-3 max-h-64 overflow-y-auto">
                    {/* 프로필 이미지 (teacher, instructor) */}
                    {(type === 'teacher' || type === 'instructor') && (
                        <div className="flex items-start gap-3 mb-3">
                            {profileImageUrl ? (
                                <div className="relative w-12 h-12 flex-shrink-0">
                                    {/* 스켈레톤 로더 */}
                                    {!imageLoaded && (
                                        <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-full" />
                                    )}
                                    {/* 실제 이미지 */}
                                    <img
                                        src={profileImageUrl}
                                        alt="프로필"
                                        onLoad={() => setImageLoaded(true)}
                                        className={`w-12 h-12 rounded-full object-cover border border-gray-200 transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'
                                            }`}
                                    />
                                </div>
                            ) : (
                                <div
                                    className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
                                    style={{ backgroundColor: `${color}15` }}
                                >
                                    <User size={20} style={{ color }} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                {type === 'teacher' ? (
                                    <>
                                        {(marker as TeacherMarker).subjects && (marker as TeacherMarker).subjects!.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {(marker as TeacherMarker).subjects!.slice(0, 3).map((s, i) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                        {(marker as TeacherMarker).experience_years && (
                                            <span className="text-xs text-gray-500">{(marker as TeacherMarker).experience_years}</span>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        {(marker as InstructorMarker).specialties && (marker as InstructorMarker).specialties.length > 0 && (
                                            <div className="flex flex-wrap gap-1 mb-1">
                                                {(marker as InstructorMarker).specialties.slice(0, 3).map((s, i) => (
                                                    <span key={i} className="text-xs px-2 py-0.5 bg-pink-50 text-pink-700 rounded-full">{s}</span>
                                                ))}
                                            </div>
                                        )}
                                        {(marker as InstructorMarker).experience_years && (
                                            <span className="text-xs text-gray-500">{(marker as InstructorMarker).experience_years}</span>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {type === 'teacher' ? (
                        // 구직 교사 마커 내용
                        <>
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
                            {(marker as TeacherMarker).introduction && (
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-600 leading-relaxed">
                                        {(marker as TeacherMarker).introduction}
                                    </p>
                                </div>
                            )}
                        </>
                    ) : type === 'instructor' ? (
                        // 교원연수 강사 마커 내용
                        <>
                            {(marker as InstructorMarker).target_audience && (marker as InstructorMarker).target_audience.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-500 w-14 flex-shrink-0">연수대상</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(marker as InstructorMarker).target_audience.map((t, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{t}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(marker as InstructorMarker).available_regions && (marker as InstructorMarker).available_regions.length > 0 && (
                                <div className="flex items-start gap-2">
                                    <span className="text-xs text-gray-500 w-14 flex-shrink-0">활동지역</span>
                                    <div className="flex flex-wrap gap-1">
                                        {(marker as InstructorMarker).available_regions.map((r, i) => (
                                            <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full">{r}</span>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {(marker as InstructorMarker).activity_history && (
                                <div className="pt-2 border-t border-gray-100">
                                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-4">
                                        {(marker as InstructorMarker).activity_history}
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

                    {/* 연락처 - Gmail 연동 */}
                    <div className="pt-2 border-t border-gray-100">
                        {type === 'teacher' ? (
                            // 구직 교사: Gmail Compose로 열기
                            <button
                                onClick={() => handleOpenGmail(
                                    (marker as TeacherMarker).email,
                                    (marker as TeacherMarker).nickname
                                )}
                                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline cursor-pointer"
                                style={{ color }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {(marker as TeacherMarker).email}
                            </button>
                        ) : type === 'instructor' ? (
                            // 교원연수 강사: Gmail Compose로 열기
                            <button
                                onClick={() => handleOpenGmail(
                                    (marker as InstructorMarker).email,
                                    (marker as InstructorMarker).display_name
                                )}
                                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline cursor-pointer"
                                style={{ color }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {(marker as InstructorMarker).email}
                            </button>
                        ) : (
                            // 프로그램: 기존 mailto 링크
                            <a
                                href={`mailto:${(marker as ProgramMarker).contact_email}`}
                                className="inline-flex items-center gap-1.5 text-xs font-medium hover:underline"
                                style={{ color }}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                {(marker as ProgramMarker).contact_email}
                            </a>
                        )}
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

                {/* 좋아요 + 후기 토글 바 (teacher, instructor만) */}
                {type !== 'program' && (
                    <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
                        {/* 좋아요 */}
                        <button
                            onClick={handleLike}
                            disabled={isLikeLoading}
                            className="flex items-center gap-1.5 text-sm disabled:opacity-50 transition-colors"
                        >
                            <Heart
                                size={16}
                                fill={isLiked ? '#EF4444' : 'none'}
                                className={isLiked ? 'text-red-500' : 'text-gray-400'}
                            />
                            <span className={isLiked ? 'text-red-500 font-medium' : 'text-gray-500'}>
                                {likeCount}
                            </span>
                        </button>

                        {/* 후기 토글 */}
                        <button
                            onClick={toggleComments}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            <span>후기 {commentCount > 0 ? `(${commentCount})` : ''}</span>
                            <svg
                                className={`w-4 h-4 transition-transform ${showComments ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>
                )}

                {/* 후기 섹션 (모든 타입 지원) */}
                <div className="border-t border-gray-100">
                    {/* program 타입은 후기 토글 버튼을 여기에 */}
                    {type === 'program' && (
                        <button
                            onClick={toggleComments}
                            className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            <span>후기 {commentCount > 0 ? `(${commentCount})` : ''}</span>
                            <svg
                                className={`w-4 h-4 transition-transform ${showComments ? 'rotate-180' : ''}`}
                                fill="none" viewBox="0 0 24 24" stroke="currentColor"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}

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
                                    ) : commentCount === 0 ? (
                                        <div className="py-3 text-center text-xs text-gray-400">아직 후기가 없습니다</div>
                                    ) : (
                                        <div className="max-h-32 overflow-y-auto space-y-2">
                                            {type === 'instructor' ? (
                                                // instructor 후기
                                                instructorComments.map((comment) => (
                                                    <div key={comment.id} className="p-2 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-medium text-gray-700">{comment.author_name}</span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">{comment.content}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                // teacher, program 후기
                                                comments.map((comment) => (
                                                    <div key={comment.id} className="p-2 bg-gray-50 rounded-lg">
                                                        <div className="flex items-center justify-between mb-1">
                                                            <span className="text-xs font-medium text-gray-700">{comment.author_name}</span>
                                                            <span className="text-[10px] text-gray-400">
                                                                {new Date(comment.created_at).toLocaleDateString('ko-KR')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600">{comment.content}</p>
                                                    </div>
                                                ))
                                            )}
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

            {/* 삭제 확인 모달 */}
            {showDeleteConfirm && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setShowDeleteConfirm(false)}
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.9, opacity: 0 }}
                        className="bg-white rounded-xl shadow-xl p-6 max-w-sm mx-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center mb-6">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-red-100 flex items-center justify-center">
                                <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-gray-800 mb-2">
                                {type === 'instructor' ? '강사 정보 삭제' : '구직 정보 삭제'}
                            </h3>
                            <p className="text-sm text-gray-600">
                                정말로 {type === 'instructor' ? '강사' : '구직'} 정보를 삭제하시겠습니까?<br />
                                <span className="text-red-500">삭제 후에는 복구할 수 없습니다.</span>
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="flex-1 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={isDeleting}
                                className="flex-1 py-2.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {isDeleting ? '삭제 중...' : '삭제하기'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
