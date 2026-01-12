// 구직 교사 마커 등록 모달
// Anti-Vibe Design 원칙 적용
// 작성일: 2026-01-12

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    generateRandomNickname,
    SUBJECT_OPTIONS,
    SCHOOL_LEVEL_OPTIONS,
    EXPERIENCE_OPTIONS,
    MARKER_COLORS,
    type TeacherMarkerInput
} from '@/types/markers';
import { createTeacherMarker, uploadMarkerImage } from '@/lib/supabase/markers';
import { useAuthStore } from '@/stores/authStore';

interface TeacherMarkerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialCoords?: { lat: number; lng: number } | null;
    onRequestMapClick: (callback: (coords: { lat: number; lng: number }) => void) => void;
}

export default function TeacherMarkerModal({
    isOpen,
    onClose,
    onSuccess,
    initialCoords,
    onRequestMapClick
}: TeacherMarkerModalProps) {
    const { user } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 폼 상태
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initialCoords || null);
    const [nickname, setNickname] = useState(generateRandomNickname());
    const [isCustomNickname, setIsCustomNickname] = useState(false);
    const [email, setEmail] = useState(user?.email || '');
    const [subjects, setSubjects] = useState<string[]>([]);
    const [otherSubject, setOtherSubject] = useState('');
    const [schoolLevels, setSchoolLevels] = useState<string[]>([]);
    const [experienceYears, setExperienceYears] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [profileImage, setProfileImage] = useState<File | null>(null);
    const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 초기 좌표 설정
    useEffect(() => {
        if (initialCoords) {
            setCoords(initialCoords);
        }
    }, [initialCoords]);

    // 닉네임 재생성
    const regenerateNickname = () => {
        setNickname(generateRandomNickname());
        setIsCustomNickname(false);
    };

    // 과목 토글
    const toggleSubject = (subject: string) => {
        setSubjects(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    // 학교급 토글
    const toggleSchoolLevel = (level: string) => {
        setSchoolLevels(prev =>
            prev.includes(level)
                ? prev.filter(l => l !== level)
                : [...prev, level]
        );
    };

    // 이미지 선택
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setProfileImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    // 지도에서 위치 선택
    const handleMapClick = useCallback(() => {
        onClose(); // 모달 임시 닫기
        onRequestMapClick((selectedCoords) => {
            setCoords(selectedCoords);
            // 모달 다시 열기는 부모에서 처리
        });
    }, [onClose, onRequestMapClick]);

    // 제출
    const handleSubmit = async () => {
        if (!coords) {
            setError('지도에서 위치를 선택해주세요.');
            return;
        }
        if (!email.trim()) {
            setError('이메일을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            let profileImageUrl: string | undefined;

            // 이미지 업로드
            if (profileImage) {
                const tempId = crypto.randomUUID();
                profileImageUrl = await uploadMarkerImage(profileImage, 'teacher', tempId);
            }

            const input: TeacherMarkerInput = {
                latitude: coords.lat,
                longitude: coords.lng,
                nickname: nickname.trim(),
                email: email.trim(),
                subjects: subjects.length > 0 ? subjects : undefined,
                other_subject: subjects.includes('기타') ? otherSubject.trim() : undefined,
                school_levels: schoolLevels.length > 0 ? schoolLevels : undefined,
                experience_years: experienceYears || undefined,
                introduction: introduction.trim() || undefined,
                profile_image_url: profileImageUrl
            };

            await createTeacherMarker(input);
            onSuccess();
            onClose();
        } catch (err) {
            console.error('마커 등록 실패:', err);
            setError('마커 등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 모달 닫기 시 상태 초기화
    const handleClose = () => {
        setCoords(null);
        setNickname(generateRandomNickname());
        setIsCustomNickname(false);
        setEmail(user?.email || '');
        setSubjects([]);
        setOtherSubject('');
        setSchoolLevels([]);
        setExperienceYears('');
        setIntroduction('');
        setProfileImage(null);
        setProfileImagePreview(null);
        setError(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
                    onClick={handleClose}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 헤더 */}
                        <div
                            className="px-6 py-4 border-b"
                            style={{
                                background: `linear-gradient(135deg, ${MARKER_COLORS.teacher}08 0%, ${MARKER_COLORS.teacher}15 100%)`,
                                borderColor: `${MARKER_COLORS.teacher}20`
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: MARKER_COLORS.teacher }}
                                    />
                                    <h2 className="text-lg font-bold text-gray-900">구직 마커 등록</h2>
                                </div>
                                <button
                                    onClick={handleClose}
                                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        {/* 본문 */}
                        <div className="px-6 py-5 max-h-[70vh] overflow-y-auto space-y-5">
                            {/* 위치 선택 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    위치 선택 <span className="text-red-500">*</span>
                                </label>
                                {coords ? (
                                    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <div className="flex items-center gap-2 text-sm text-green-700">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                            <span>위치가 선택되었습니다</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleMapClick}
                                            className="text-xs text-green-600 hover:text-green-700 font-medium"
                                        >
                                            다시 선택
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={handleMapClick}
                                        className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600 transition-colors flex flex-col items-center gap-2"
                                    >
                                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        <span className="text-sm font-medium">지도에서 위치 클릭하기</span>
                                    </button>
                                )}
                            </div>

                            {/* 닉네임 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    닉네임 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            type="text"
                                            value={nickname}
                                            onChange={(e) => {
                                                setNickname(e.target.value);
                                                setIsCustomNickname(true);
                                            }}
                                            placeholder="닉네임을 입력하세요"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={regenerateNickname}
                                        className="px-3 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors flex items-center gap-1.5"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        랜덤
                                    </button>
                                </div>
                                <p className="mt-1.5 text-xs text-gray-500">
                                    자동 생성된 닉네임을 사용하거나 직접 입력할 수 있습니다.
                                </p>
                            </div>

                            {/* 이메일 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    연락용 이메일 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="example@email.com"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                                />
                                <p className="mt-1.5 text-xs text-gray-500">
                                    학교 담당자가 연락할 수 있는 이메일 주소입니다.
                                </p>
                            </div>

                            {/* 프로필 이미지 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    프로필 이미지 (선택)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                {profileImagePreview ? (
                                    <div className="relative w-24 h-24">
                                        <img
                                            src={profileImagePreview}
                                            alt="프로필 미리보기"
                                            className="w-full h-full object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setProfileImage(null);
                                                setProfileImagePreview(null);
                                            }}
                                            className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                        >
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                            </svg>
                                        </button>
                                    </div>
                                ) : (
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-24 h-24 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors flex flex-col items-center justify-center gap-1"
                                    >
                                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                        <span className="text-xs">업로드</span>
                                    </button>
                                )}
                            </div>

                            {/* 과목 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    담당 가능 과목 (선택)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {SUBJECT_OPTIONS.map((subject) => (
                                        <button
                                            key={subject}
                                            type="button"
                                            onClick={() => toggleSubject(subject)}
                                            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${subjects.includes(subject)
                                                    ? 'bg-red-50 border-red-300 text-red-700'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {subject}
                                        </button>
                                    ))}
                                </div>
                                {subjects.includes('기타') && (
                                    <input
                                        type="text"
                                        value={otherSubject}
                                        onChange={(e) => setOtherSubject(e.target.value)}
                                        placeholder="기타 과목명을 입력하세요"
                                        className="mt-2 w-full px-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
                                    />
                                )}
                            </div>

                            {/* 학교급 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    희망 학교급 (선택)
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {SCHOOL_LEVEL_OPTIONS.map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => toggleSchoolLevel(level)}
                                            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${schoolLevels.includes(level)
                                                    ? 'bg-red-50 border-red-300 text-red-700'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {level}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 경력 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    경력 (선택)
                                </label>
                                <select
                                    value={experienceYears}
                                    onChange={(e) => setExperienceYears(e.target.value)}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all bg-white"
                                >
                                    <option value="">선택하세요</option>
                                    {EXPERIENCE_OPTIONS.map((exp) => (
                                        <option key={exp} value={exp}>{exp}</option>
                                    ))}
                                </select>
                            </div>

                            {/* 자기소개 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    자기소개 (선택)
                                </label>
                                <textarea
                                    value={introduction}
                                    onChange={(e) => setIntroduction(e.target.value.slice(0, 500))}
                                    placeholder="간단한 자기소개를 작성해주세요. (최대 500자)"
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
                                />
                                <p className="mt-1 text-xs text-gray-400 text-right">
                                    {introduction.length}/500
                                </p>
                            </div>

                            {/* 에러 메시지 */}
                            {error && (
                                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                                    {error}
                                </div>
                            )}
                        </div>

                        {/* 푸터 */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleClose}
                                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                취소
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmit}
                                disabled={isSubmitting || !coords}
                                className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    backgroundColor: MARKER_COLORS.teacher,
                                    boxShadow: `0 4px 14px ${MARKER_COLORS.teacher}40`
                                }}
                            >
                                {isSubmitting ? '등록 중...' : '마커 등록'}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
