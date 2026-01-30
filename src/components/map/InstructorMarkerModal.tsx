// 교원연수 강사등록 모달
// Anti-Vibe Design 원칙 적용
// 작성일: 2026-01-29
// 수정: 색상 통일(스카이블루), 위치 선택 추가

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  INSTRUCTOR_SPECIALTIES,
  TARGET_AUDIENCE_OPTIONS,
  INSTRUCTOR_MARKER_COLORS,
  type InstructorSpecialty,
  type TargetAudience,
  type InstructorMarkerInput,
  type InstructorMarker,
} from '@/types/instructorMarkers';
import { REGION_OPTIONS, EXPERIENCE_OPTIONS, generateRandomNickname } from '@/types/markers';
import {
  createInstructorMarker,
  uploadInstructorProfileImage,
} from '@/lib/supabase/instructorMarkers';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import RegionSearchInput, { type RegionData } from '@/components/forms/RegionSearchInput';
import { getRandomizedCoordsFromAddress } from '@/lib/utils/geocoding';

interface InstructorMarkerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newMarker?: InstructorMarker) => void; // 새로 생성된 마커 데이터 전달
  initialCoords?: { lat: number; lng: number } | null;
  initialAddress?: string | null;
  onRequestLocationChange?: () => void;
}

export default function InstructorMarkerModal({
  isOpen,
  onClose,
  onSuccess,
  initialCoords,
  initialAddress,
  onRequestLocationChange,
}: InstructorMarkerModalProps) {
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 위치 정보
  const [regionData, setRegionData] = useState<RegionData | null>(null);

  // 기본 정보
  const [displayName, setDisplayName] = useState(generateRandomNickname());
  const [email, setEmail] = useState('');

  // 전문분야 (복수 선택)
  const [specialties, setSpecialties] = useState<InstructorSpecialty[]>([]);
  const [customSpecialty, setCustomSpecialty] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  // 연수 대상 (복수 선택)
  const [targetAudience, setTargetAudience] = useState<TargetAudience[]>([]);

  // 활동 정보
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);
  const [experienceYears, setExperienceYears] = useState('');

  // 상세 정보
  const [activityHistory, setActivityHistory] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  // 개인정보 동의
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 초기값 설정
  useEffect(() => {
    if (isOpen) {
      setRegionData(null);
      setEmail(user?.email || '');
    }
  }, [isOpen, user?.email]);

  // 닉네임 재생성
  const regenerateNickname = () => {
    setDisplayName(generateRandomNickname());
  };

  // 전문분야 토글
  const toggleSpecialty = (specialty: InstructorSpecialty) => {
    setSpecialties((prev) =>
      prev.includes(specialty)
        ? prev.filter((s) => s !== specialty)
        : [...prev, specialty]
    );
  };

  // 연수 대상 토글
  const toggleTargetAudience = (audience: TargetAudience) => {
    setTargetAudience((prev) =>
      prev.includes(audience)
        ? prev.filter((a) => a !== audience)
        : [...prev, audience]
    );
  };

  // 지역 토글
  const toggleRegion = (region: string) => {
    setAvailableRegions((prev) =>
      prev.includes(region)
        ? prev.filter((r) => r !== region)
        : [...prev, region]
    );
  };

  // 이미지 선택
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  // 이미지 파일 처리 (공통)
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }
    setProfileImage(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfileImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // 드래그 앤 드롭 핸들러
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processImageFile(files[0]);
    }
  };

  // 제출
  const handleSubmit = async () => {
    // 유효성 검사
    if (!regionData) {
      setError('위치를 선택해주세요.');
      return;
    }
    if (!displayName.trim()) {
      setError('이름을 입력해주세요.');
      return;
    }
    if (!email.trim()) {
      setError('이메일을 입력해주세요.');
      return;
    }
    if (specialties.length === 0) {
      setError('전문분야를 1개 이상 선택해주세요.');
      return;
    }
    if (targetAudience.length === 0) {
      setError('연수 대상을 1개 이상 선택해주세요.');
      return;
    }
    if (availableRegions.length === 0) {
      setError('활동 가능 지역을 1개 이상 선택해주세요.');
      return;
    }
    if (!privacyAgreed) {
      setError('개인정보 이용에 동의해주세요.');
      return;
    }
    if (!user?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      let profileImageUrl: string | undefined;

      // 이미지 업로드
      if (profileImage) {
        profileImageUrl = await uploadInstructorProfileImage(profileImage, user.id);
      }

      // 지역 주소 기반 랜덤 좌표 생성 (±500m 오프셋 적용)
      const coords = await getRandomizedCoordsFromAddress(regionData.fullAddress);

      const input: InstructorMarkerInput = {
        user_id: user.id,
        latitude: coords.lat,
        longitude: coords.lng,
        display_name: displayName.trim(),
        email: email.trim(),
        specialties,
        custom_specialty: customSpecialty.trim() || undefined,
        available_regions: availableRegions,
        experience_years: experienceYears || undefined,
        target_audience: targetAudience,
        activity_history: activityHistory.trim() || undefined,
        profile_image_url: profileImageUrl,
        privacy_agreed: privacyAgreed,
      };

      const newMarker = await createInstructorMarker(input);
      showToast('교원연수 강사 등록이 완료되었습니다!', 'success');
      // 낙관적 업데이트를 위해 새로 생성된 마커 데이터 전달
      onSuccess(newMarker);
      handleClose();
    } catch (err: any) {
      console.error('강사 등록 실패:', err);
      const errorMessage = err?.message || '등록에 실패했습니다. 다시 시도해주세요.';
      setError(errorMessage);
      showToast('등록 실패: ' + errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기 시 상태 초기화
  const handleClose = () => {
    setRegionData(null);
    setDisplayName(generateRandomNickname());
    setEmail(user?.email || '');
    setSpecialties([]);
    setCustomSpecialty('');
    setShowCustomInput(false);
    setTargetAudience([]);
    setAvailableRegions([]);
    setExperienceYears('');
    setActivityHistory('');
    setProfileImage(null);
    setProfileImagePreview(null);
    setPrivacyAgreed(false);
    setError(null);
    onClose();
  };

  // 폼 유효성 체크
  const isFormValid =
    regionData &&
    displayName.trim() &&
    email.trim() &&
    specialties.length > 0 &&
    targetAudience.length > 0 &&
    availableRegions.length > 0 &&
    privacyAgreed;

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
            className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 - 스카이블루 글래스모피즘 (다른 모달과 동일) */}
            <div
              className="px-6 py-4 border-b flex-shrink-0 backdrop-blur-md"
              style={{
                background: `linear-gradient(135deg, rgba(104, 178, 255, 0.15) 0%, rgba(104, 178, 255, 0.25) 100%)`,
                borderColor: 'rgba(104, 178, 255, 0.3)',
                boxShadow: '0 4px 30px rgba(104, 178, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* 마커 색상만 핑크 유지 */}
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: INSTRUCTOR_MARKER_COLORS.base }}
                  />
                  <h2 className="text-lg font-bold text-gray-900">교원연수 강사등록</h2>
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

            {/* 본문 - 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* ========== 희망 활동 위치 ========== */}
              <section>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  희망 활동 위치 <span className="text-red-500">*</span>
                </label>
                <RegionSearchInput
                  value={regionData}
                  onChange={setRegionData}
                />
              </section>

              {/* ========== 기본 정보 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  기본 정보
                </h3>

                {/* 이름 (닉네임) */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    이름/닉네임 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="이름 또는 닉네임을 입력하세요"
                      className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                    />
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
                </div>

                {/* 이메일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="example@email.com"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    학교 담당자가 연락할 수 있는 이메일 주소입니다.
                  </p>
                </div>
              </section>

              {/* ========== 전문분야 (복수 선택) ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  전문분야 <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-400 ml-2">(복수 선택 가능)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {INSTRUCTOR_SPECIALTIES.map((specialty) => {
                    const isSelected = specialties.includes(specialty);
                    return (
                      <button
                        key={specialty}
                        type="button"
                        onClick={() => toggleSpecialty(specialty)}
                        className={`px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium ${
                          isSelected
                            ? 'text-white bg-sky-500 border-sky-500'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {specialty}
                      </button>
                    );
                  })}
                </div>
                {specialties.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    선택됨: {specialties.join(', ')}
                  </p>
                )}

                {/* 기타 전문분야 직접 입력 */}
                <div className="mt-3">
                  <button
                    type="button"
                    onClick={() => setShowCustomInput(!showCustomInput)}
                    className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                      showCustomInput
                        ? 'bg-sky-50 border-sky-300 text-sky-700'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    + 기타 전문분야 직접입력
                  </button>
                  {showCustomInput && (
                    <div className="mt-2">
                      <input
                        type="text"
                        value={customSpecialty}
                        onChange={(e) => setCustomSpecialty(e.target.value)}
                        placeholder="예) 레크리에이션, 드론교육, 오카리나..."
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                      />
                    </div>
                  )}
                </div>
              </section>

              {/* ========== 연수 대상 (복수 선택) ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  연수 대상 <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-400 ml-2">(복수 선택)</span>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {TARGET_AUDIENCE_OPTIONS.map((audience) => {
                    const isSelected = targetAudience.includes(audience);
                    return (
                      <label
                        key={audience}
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleTargetAudience(audience)}
                          className="w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                        />
                        <span className="text-sm text-gray-700">{audience}</span>
                      </label>
                    );
                  })}
                </div>
              </section>

              {/* ========== 활동 가능 지역 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  활동 가능 지역 <span className="text-red-500">*</span>
                  <span className="font-normal text-gray-400 ml-2">(복수 선택)</span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  {REGION_OPTIONS.map((region) => {
                    const isSelected = availableRegions.includes(region);
                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => toggleRegion(region)}
                        className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                          isSelected
                            ? 'bg-sky-50 border-sky-300 text-sky-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                        }`}
                      >
                        {region}
                      </button>
                    );
                  })}
                </div>
                {availableRegions.length > 0 && (
                  <p className="mt-2 text-xs text-gray-500">
                    선택됨: {availableRegions.join(', ')}
                  </p>
                )}
              </section>

              {/* ========== 추가 정보 (선택) ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  추가 정보
                  <span className="font-normal text-gray-400 ml-2">(선택)</span>
                </h3>

                {/* 경력 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">경력</label>
                  <div className="flex flex-wrap gap-2">
                    {EXPERIENCE_OPTIONS.map((exp) => {
                      const isSelected = experienceYears === exp;
                      return (
                        <button
                          key={exp}
                          type="button"
                          onClick={() => setExperienceYears(isSelected ? '' : exp)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                            isSelected
                              ? 'bg-sky-50 border-sky-300 text-sky-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {exp}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 그동안의 활동내용 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    그동안의 활동내용 (자유양식)
                  </label>
                  <textarea
                    value={activityHistory}
                    onChange={(e) => setActivityHistory(e.target.value.slice(0, 1000))}
                    placeholder="주요 강의 이력, 저서, 자격증, 출강 경험 등을 자유롭게 작성해주세요 (최대 1000자)"
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-400 text-right">
                    {activityHistory.length}/1000
                  </p>
                </div>

                {/* 프로필 이미지 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    프로필 이미지
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                  {profileImagePreview ? (
                    <div
                      className="relative w-20 h-20"
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                    >
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
                      onDragOver={handleDragOver}
                      onDragEnter={handleDragEnter}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`w-20 h-20 border-2 border-dashed rounded-lg transition-colors flex flex-col items-center justify-center gap-1 ${
                        isDragging
                          ? 'border-sky-500 bg-sky-50 text-sky-500'
                          : 'border-gray-300 text-gray-400 hover:border-gray-400 hover:text-gray-500'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-xs">{isDragging ? '놓기' : '업로드'}</span>
                    </button>
                  )}
                </div>
              </section>

              {/* ========== 개인정보 동의 ========== */}
              <section className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  개인정보 동의 <span className="text-red-500">*</span>
                </h3>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700 leading-relaxed">
                    학교와 사람을 연결하기 위한 최소한의 정보만 수집합니다.
                    서비스 내에서 노출과 활용에 동의하십니까?
                  </span>
                </label>
              </section>

              {/* 에러 메시지 */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || !isFormValid}
                className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-sky-500 hover:bg-sky-600"
                style={{ boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)' }}
              >
                {isSubmitting ? '등록 중...' : '등록하기'}
              </button>
              {!privacyAgreed && (
                <p className="mt-2 text-xs text-center text-gray-500">
                  동의 체크 필수 - 미체크 시 버튼 비활성화
                </p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
