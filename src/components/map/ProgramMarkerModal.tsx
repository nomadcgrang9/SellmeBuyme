// 프로그램 마커 등록 모달
// Anti-Vibe Design 원칙 적용
// 작성일: 2026-01-12

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PROGRAM_CATEGORIES,
    TARGET_GRADE_OPTIONS,
    MARKER_COLORS,
    type ProgramMarkerInput
} from '@/types/markers';
import { createProgramMarker, uploadMarkerImage } from '@/lib/supabase/markers';
import { useAuthStore } from '@/stores/authStore';

interface ProgramMarkerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialCoords?: { lat: number; lng: number } | null;
    onRequestMapClick: (callback: (coords: { lat: number; lng: number }) => void) => void;
}

export default function ProgramMarkerModal({
    isOpen,
    onClose,
    onSuccess,
    initialCoords,
    onRequestMapClick
}: ProgramMarkerModalProps) {
    const { user } = useAuthStore();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // 폼 상태
    const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(initialCoords || null);
    const [programTitle, setProgramTitle] = useState('');
    const [targetGrades, setTargetGrades] = useState<string[]>([]);
    const [contactEmail, setContactEmail] = useState(user?.email || '');
    const [contactPhone, setContactPhone] = useState('');
    const [description, setDescription] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [customTags, setCustomTags] = useState('');
    const [priceInfo, setPriceInfo] = useState('');
    const [portfolioUrl, setPortfolioUrl] = useState('');
    const [images, setImages] = useState<File[]>([]);
    const [imagePreviews, setImagePreviews] = useState<string[]>([]);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 초기 좌표 설정
    useEffect(() => {
        if (initialCoords) {
            setCoords(initialCoords);
        }
    }, [initialCoords]);

    // 대상 학년 토글
    const toggleTargetGrade = (grade: string) => {
        setTargetGrades(prev =>
            prev.includes(grade)
                ? prev.filter(g => g !== grade)
                : [...prev, grade]
        );
    };

    // 카테고리 토글
    const toggleCategory = (category: string) => {
        setCategories(prev =>
            prev.includes(category)
                ? prev.filter(c => c !== category)
                : [...prev, category]
        );
    };

    // 이미지 선택 (최대 5장)
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        const remaining = 5 - images.length;
        const newFiles = files.slice(0, remaining);

        setImages(prev => [...prev, ...newFiles]);

        newFiles.forEach(file => {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreviews(prev => [...prev, reader.result as string]);
            };
            reader.readAsDataURL(file);
        });
    };

    // 이미지 삭제
    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
        setImagePreviews(prev => prev.filter((_, i) => i !== index));
    };

    // 지도에서 위치 선택
    const handleMapClick = useCallback(() => {
        onClose();
        onRequestMapClick((selectedCoords) => {
            setCoords(selectedCoords);
        });
    }, [onClose, onRequestMapClick]);

    // 제출
    const handleSubmit = async () => {
        if (!coords) {
            setError('지도에서 위치를 선택해주세요.');
            return;
        }
        if (!programTitle.trim()) {
            setError('프로그램명을 입력해주세요.');
            return;
        }
        if (targetGrades.length === 0) {
            setError('대상 학년을 선택해주세요.');
            return;
        }
        if (!contactEmail.trim()) {
            setError('연락처 이메일을 입력해주세요.');
            return;
        }
        if (!description.trim()) {
            setError('상세 설명을 입력해주세요.');
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            const imageUrls: string[] = [];

            // 이미지 업로드
            for (const image of images) {
                const tempId = crypto.randomUUID();
                const url = await uploadMarkerImage(image, 'program', tempId);
                imageUrls.push(url);
            }

            // 커스텀 태그 파싱
            const parsedTags = customTags
                .split(',')
                .map(tag => tag.trim().replace(/^#/, ''))
                .filter(tag => tag.length > 0);

            const input: ProgramMarkerInput = {
                latitude: coords.lat,
                longitude: coords.lng,
                program_title: programTitle.trim(),
                target_grades: targetGrades,
                contact_email: contactEmail.trim(),
                description: description.trim(),
                contact_phone: contactPhone.trim() || undefined,
                categories: categories.length > 0 ? categories : undefined,
                custom_tags: parsedTags.length > 0 ? parsedTags : undefined,
                price_info: priceInfo.trim() || undefined,
                portfolio_url: portfolioUrl.trim() || undefined,
                image_urls: imageUrls.length > 0 ? imageUrls : undefined
            };

            await createProgramMarker(input);
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
        setProgramTitle('');
        setTargetGrades([]);
        setContactEmail(user?.email || '');
        setContactPhone('');
        setDescription('');
        setCategories([]);
        setCustomTags('');
        setPriceInfo('');
        setPortfolioUrl('');
        setImages([]);
        setImagePreviews([]);
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
                                background: `linear-gradient(135deg, ${MARKER_COLORS.program}08 0%, ${MARKER_COLORS.program}15 100%)`,
                                borderColor: `${MARKER_COLORS.program}20`
                            }}
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: MARKER_COLORS.program }}
                                    />
                                    <h2 className="text-lg font-bold text-gray-900">프로그램 마커 등록</h2>
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
                                    출강 지역 <span className="text-red-500">*</span>
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
                                        <span className="text-sm font-medium">지도에서 출강 지역 클릭하기</span>
                                    </button>
                                )}
                            </div>

                            {/* 프로그램명 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    프로그램명 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={programTitle}
                                    onChange={(e) => setProgramTitle(e.target.value)}
                                    placeholder="예: AI 코딩 체험 수업 (2차시)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                />
                            </div>

                            {/* 대상 학년 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    대상 학년 <span className="text-red-500">*</span>
                                </label>
                                <div className="flex flex-wrap gap-2">
                                    {TARGET_GRADE_OPTIONS.map((grade) => (
                                        <button
                                            key={grade}
                                            type="button"
                                            onClick={() => toggleTargetGrade(grade)}
                                            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${targetGrades.includes(grade)
                                                    ? 'bg-green-50 border-green-300 text-green-700'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {grade}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 카테고리 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    카테고리 (선택)
                                </label>
                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                                    {PROGRAM_CATEGORIES.map((category) => (
                                        <button
                                            key={category}
                                            type="button"
                                            onClick={() => toggleCategory(category)}
                                            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${categories.includes(category)
                                                    ? 'bg-green-50 border-green-300 text-green-700'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                                                }`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* 자유 태그 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    자유 태그 (선택)
                                </label>
                                <input
                                    type="text"
                                    value={customTags}
                                    onChange={(e) => setCustomTags(e.target.value)}
                                    placeholder="#늘봄학교, #AI활용, #체험키트포함 (쉼표로 구분)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                />
                            </div>

                            {/* 연락처 */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        이메일 <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={contactEmail}
                                        onChange={(e) => setContactEmail(e.target.value)}
                                        placeholder="example@email.com"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        전화번호 (선택)
                                    </label>
                                    <input
                                        type="tel"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        placeholder="010-1234-5678"
                                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* 가격 정보 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    가격 정보 (선택)
                                </label>
                                <input
                                    type="text"
                                    value={priceInfo}
                                    onChange={(e) => setPriceInfo(e.target.value)}
                                    placeholder="예: 회당 20만원 (협의 가능)"
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                />
                            </div>

                            {/* 포트폴리오 URL */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    포트폴리오 링크 (선택)
                                </label>
                                <input
                                    type="url"
                                    value={portfolioUrl}
                                    onChange={(e) => setPortfolioUrl(e.target.value)}
                                    placeholder="https://..."
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                />
                            </div>

                            {/* 상세 설명 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    상세 설명 <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                                    placeholder="프로그램에 대한 상세한 설명을 작성해주세요. (최대 2000자)"
                                    rows={5}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
                                />
                                <p className="mt-1 text-xs text-gray-400 text-right">
                                    {description.length}/2000
                                </p>
                            </div>

                            {/* 이미지 업로드 */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    프로그램 이미지 (선택, 최대 5장)
                                </label>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    onChange={handleImageChange}
                                    className="hidden"
                                />
                                <div className="flex flex-wrap gap-3">
                                    {imagePreviews.map((preview, index) => (
                                        <div key={index} className="relative w-20 h-20">
                                            <img
                                                src={preview}
                                                alt={`이미지 ${index + 1}`}
                                                className="w-full h-full object-cover rounded-lg border border-gray-200"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => removeImage(index)}
                                                className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                                            >
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))}
                                    {images.length < 5 && (
                                        <button
                                            type="button"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors flex flex-col items-center justify-center gap-1"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                            </svg>
                                            <span className="text-xs">{images.length}/5</span>
                                        </button>
                                    )}
                                </div>
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
                                    backgroundColor: MARKER_COLORS.program,
                                    boxShadow: `0 4px 14px ${MARKER_COLORS.program}40`
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
