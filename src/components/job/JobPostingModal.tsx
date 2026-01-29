// 공고 등록 모달 (단일 스크롤 방식)
// Anti-Vibe Design 원칙 적용
// 작성일: 2026-01-29

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PRIMARY_CATEGORY_OPTIONS,
  SUB_CATEGORY_OPTIONS,
  type PrimaryCategory
} from '@/types/markers';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import FileDropzone from './FileDropzone';
import { createJobPosting, updateJobPosting, uploadJobAttachment } from '@/lib/supabase/jobPostings';
import type { JobPostingCard } from '@/types';

// 학교급 옵션
const SCHOOL_LEVEL_OPTIONS = [
  '유치원',
  '초등학교',
  '중학교',
  '고등학교',
  '특수학교',
  '기타'
] as const;

interface JobPostingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialCoords?: { lat: number; lng: number } | null;
  initialAddress?: string | null;
  onRequestLocationChange?: () => void;
  editData?: JobPostingCard | null; // 수정 모드용 기존 데이터
}

export default function JobPostingModal({
  isOpen,
  onClose,
  onSuccess,
  initialCoords,
  initialAddress,
  onRequestLocationChange,
  editData
}: JobPostingModalProps) {
  const isEditMode = !!editData;
  const { user } = useAuthStore();
  const { showToast } = useToastStore();
  const contentRef = useRef<HTMLDivElement>(null);

  // 폼 상태 - 위치
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string>('');

  // 폼 상태 - 기본 정보
  const [organization, setOrganization] = useState('');
  const [schoolLevel, setSchoolLevel] = useState<string>('');
  const [title, setTitle] = useState('');

  // 폼 상태 - 분류
  const [primaryCategory, setPrimaryCategory] = useState<PrimaryCategory | null>(null);
  const [subCategories, setSubCategories] = useState<string[]>([]);

  // 폼 상태 - 모집 조건
  const [deadline, setDeadline] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [workPeriodStart, setWorkPeriodStart] = useState(''); // 근무기간 시작일
  const [workPeriodEnd, setWorkPeriodEnd] = useState(''); // 근무기간 종료일

  // 폼 상태 - 상세 내용
  const [description, setDescription] = useState('');

  // 폼 상태 - 첨부파일
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

  // 폼 상태 - 연락처
  const [contactPhone, setContactPhone] = useState('');

  // 동의
  const [privacyAgreed, setPrivacyAgreed] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 초기값 설정 (수정 모드 시 기존 데이터로 채움)
  useEffect(() => {
    if (isOpen) {
      if (editData) {
        // 수정 모드: 기존 데이터로 폼 채우기
        setCoords(editData.latitude && editData.longitude
          ? { lat: editData.latitude, lng: editData.longitude }
          : null);
        setAddress(editData.location || '');
        setOrganization(editData.organization || '');
        setSchoolLevel(editData.school_level || '');
        setTitle(editData.title || '');
        setPrimaryCategory((editData as any).primary_category || null);
        // sub_categories는 JobPostingCard에 없을 수 있음
        setSubCategories([]);
        // deadline 형식 변환 (~ MM.DD → YYYY-MM-DD)
        if (editData.deadline) {
          // "~ 02.06" 형식을 "2026-02-06" 형식으로 변환
          const match = editData.deadline.match(/(\d{2})\.(\d{2})/);
          if (match) {
            const year = new Date().getFullYear();
            setDeadline(`${year}-${match[1]}-${match[2]}`);
          } else {
            setDeadline(editData.deadline);
          }
        }
        setIsUrgent(editData.daysLeft !== undefined && editData.daysLeft <= 1);
        // work_period 파싱 (시작일 ~ 종료일)
        if (editData.work_period) {
          const parts = editData.work_period.split('~').map(s => s.trim());
          setWorkPeriodStart(parts[0] || '');
          setWorkPeriodEnd(parts[1] || '');
        }
        setDescription(editData.detail_content || '');
        setContactPhone(editData.contact || '');
        setPrivacyAgreed(true); // 수정 시 이미 동의한 것으로 간주
      } else {
        // 등록 모드: 초기 좌표만 설정
        setCoords(initialCoords || null);
        setAddress(initialAddress || '');
      }
    }
  }, [isOpen, initialCoords, initialAddress, editData]);

  // 1차 분류 선택
  const handlePrimarySelect = (category: PrimaryCategory) => {
    if (primaryCategory === category) {
      setPrimaryCategory(null);
      setSubCategories([]);
    } else {
      setPrimaryCategory(category);
      setSubCategories([]);
    }
  };

  // 2차 분류 토글
  const toggleSubCategory = (sub: string) => {
    setSubCategories(prev =>
      prev.includes(sub)
        ? prev.filter(s => s !== sub)
        : [...prev, sub]
    );
  };

  // 위치 변경 요청
  const handleLocationChange = useCallback(() => {
    if (onRequestLocationChange) {
      onRequestLocationChange();
    }
  }, [onRequestLocationChange]);

  // 파일 선택 핸들러
  const handleFileSelect = (file: File | null) => {
    setAttachmentFile(file);
  };

  // 제출
  const handleSubmit = async () => {
    // 유효성 검사
    if (!coords) {
      setError('위치를 선택해주세요.');
      return;
    }
    if (!organization.trim()) {
      setError('학교/기관명을 입력해주세요.');
      return;
    }
    if (!schoolLevel) {
      setError('학교급을 선택해주세요.');
      return;
    }
    if (!title.trim()) {
      setError('공고 제목을 입력해주세요.');
      return;
    }
    if (!primaryCategory) {
      setError('1차 분류를 선택해주세요.');
      return;
    }
    if (!deadline) {
      setError('모집 마감일을 선택해주세요.');
      return;
    }
    if (!privacyAgreed) {
      setError('등록정보 이용에 동의해주세요.');
      return;
    }
    if (!user?.id) {
      setError('로그인이 필요합니다.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // 임시 ID 생성 (파일 업로드용)
      const tempId = crypto.randomUUID();
      let attachmentUrl: string | undefined;

      // 첨부파일 업로드
      if (attachmentFile) {
        attachmentUrl = await uploadJobAttachment(attachmentFile, user.id, tempId);
      }

      // 공고 등록
      console.log('[JobPostingModal] Submitting job posting...', {
        user_id: user.id,
        organization: organization.trim(),
        coords,
        deadline,
        primaryCategory
      });

      // 근무기간 문자열 조합
      const workPeriodStr = workPeriodStart && workPeriodEnd
        ? `${workPeriodStart} ~ ${workPeriodEnd}`
        : workPeriodStart || workPeriodEnd || undefined;

      if (isEditMode && editData) {
        // 수정 모드
        await updateJobPosting(editData.id, {
          organization: organization.trim(),
          title: title.trim(),
          content: description.trim() || undefined,
          work_period: workPeriodStr,
          deadline,
          is_urgent: isUrgent,
          latitude: coords.lat,
          longitude: coords.lng,
          location: address,
          school_level: schoolLevel,
          primary_category: primaryCategory,
          sub_categories: subCategories.length > 0 ? subCategories : undefined,
          contact_phone: contactPhone.trim() || undefined,
          attachment_url: attachmentUrl || editData.attachment_url,
        });
        showToast('공고가 수정되었습니다.', 'success');
      } else {
        // 등록 모드
        await createJobPosting({
          user_id: user.id,
          organization: organization.trim(),
          title: title.trim(),
          content: description.trim() || undefined,
          work_period: workPeriodStr,
          deadline,
          is_urgent: isUrgent,
          latitude: coords.lat,
          longitude: coords.lng,
          location: address,
          school_level: schoolLevel,
          primary_category: primaryCategory,
          sub_categories: subCategories.length > 0 ? subCategories : undefined,
          contact_phone: contactPhone.trim() || undefined,
          attachment_url: attachmentUrl,
          source: 'user_posted'
        });
        showToast('공고가 등록되었습니다.', 'success');
      }
      onSuccess();
      handleClose();
    } catch (err: any) {
      console.error('공고 등록 실패:', err);
      const errorMessage = err?.message || '공고 등록에 실패했습니다. 다시 시도해주세요.';
      setError(errorMessage);
      showToast('공고 등록 실패: ' + errorMessage, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 모달 닫기 시 상태 초기화
  const handleClose = () => {
    setCoords(null);
    setAddress('');
    setOrganization('');
    setSchoolLevel('');
    setTitle('');
    setPrimaryCategory(null);
    setSubCategories([]);
    setDeadline('');
    setIsUrgent(false);
    setWorkPeriodStart('');
    setWorkPeriodEnd('');
    setDescription('');
    setAttachmentFile(null);
    setContactPhone('');
    setPrivacyAgreed(false);
    setError(null);
    onClose();
  };

  // 2차 분류 옵션 가져오기
  const subCategoryOptions = primaryCategory
    ? SUB_CATEGORY_OPTIONS[primaryCategory]
    : [];

  const hasSubCategories = subCategoryOptions.length > 0;

  // 오늘 날짜 (마감일 최소값)
  const today = new Date().toISOString().split('T')[0];

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
            {/* 헤더 - 글래스모피즘 적용 */}
            <div
              className="px-6 py-4 border-b flex-shrink-0 backdrop-blur-md"
              style={{
                background: 'linear-gradient(135deg, rgba(104, 178, 255, 0.15) 0%, rgba(104, 178, 255, 0.25) 100%)',
                borderColor: 'rgba(104, 178, 255, 0.3)',
                boxShadow: '0 4px 30px rgba(104, 178, 255, 0.1)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)'
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: '#68B2FF' }}
                  />
                  <h2 className="text-lg font-bold text-gray-900">{isEditMode ? '공고 수정' : '공고 등록'}</h2>
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
            <div ref={contentRef} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              {/* ========== 위치 정보 ========== */}
              <section>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  위치 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="truncate max-w-[250px]">
                      {address || '위치를 선택해주세요'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLocationChange}
                    className="text-xs text-sky-600 hover:text-sky-700 font-medium whitespace-nowrap"
                  >
                    변경
                  </button>
                </div>
              </section>

              {/* ========== 기본 정보 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  기본 정보
                </h3>

                {/* 학교/기관명 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    학교/기관명 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    placeholder="예) OO초등학교"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                  />
                </div>

                {/* 학교급 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    학교급 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SCHOOL_LEVEL_OPTIONS.map((level) => {
                      const isSelected = schoolLevel === level;
                      return (
                        <button
                          key={level}
                          type="button"
                          onClick={() => setSchoolLevel(isSelected ? '' : level)}
                          className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                            isSelected
                              ? 'bg-sky-50 border-sky-300 text-sky-700'
                              : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                          }`}
                        >
                          {level}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 공고 제목 */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    공고 제목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="예) 2026학년도 기간제 영어교사 채용 공고"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                  />
                </div>
              </section>

              {/* ========== 분류 정보 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  분류 정보
                </h3>

                {/* 1차 분류 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    1차 분류 <span className="text-red-500">*</span>
                    <span className="font-normal text-gray-400 ml-2">(1개만 선택)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {PRIMARY_CATEGORY_OPTIONS.map((category) => {
                      const isSelected = primaryCategory === category;
                      return (
                        <button
                          key={category}
                          type="button"
                          onClick={() => handlePrimarySelect(category)}
                          className={`px-3 py-2 text-sm rounded-lg border-2 transition-all font-medium ${
                            isSelected
                              ? 'text-white bg-sky-500 border-sky-500'
                              : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          {category}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2차 분류 */}
                {primaryCategory && hasSubCategories && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">
                      2차 분류
                      <span className="font-normal text-gray-400 ml-2">(복수 선택 가능)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {subCategoryOptions.map((sub) => {
                        const isSelected = subCategories.includes(sub);
                        return (
                          <button
                            key={sub}
                            type="button"
                            onClick={() => toggleSubCategory(sub)}
                            className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                              isSelected
                                ? 'bg-sky-50 border-sky-300 text-sky-700'
                                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {sub}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              {/* ========== 모집 조건 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  모집 조건
                </h3>

                {/* 모집 마감일 */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-600 mb-1.5">
                    모집 마감일 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={deadline}
                    min={today}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    마감일 이후 자동으로 지도에서 숨김 처리됩니다.
                  </p>
                </div>

              </section>

              {/* ========== 근무기간 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  근무기간
                  <span className="font-normal text-gray-400 ml-2">(선택)</span>
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">시작일</label>
                    <input
                      type="date"
                      value={workPeriodStart}
                      min={today}
                      onChange={(e) => setWorkPeriodStart(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                    />
                  </div>
                  <span className="text-gray-400 mt-5">~</span>
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">종료일</label>
                    <input
                      type="date"
                      value={workPeriodEnd}
                      min={workPeriodStart || today}
                      onChange={(e) => setWorkPeriodEnd(e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                    />
                  </div>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  상세보기에서 구직자에게 노출됩니다.
                </p>
              </section>

              {/* ========== 상세 내용 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  상세 내용
                  <span className="font-normal text-gray-400 ml-2">(선택)</span>
                </h3>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 2000))}
                  placeholder="담당업무, 자격요건, 우대사항 등을 적어주세요 (최대 2000자)"
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all resize-none text-sm"
                />
                <p className="mt-1 text-xs text-gray-400 text-right">
                  {description.length}/2000
                </p>
              </section>

              {/* ========== 첨부파일 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  첨부파일
                  <span className="font-normal text-gray-400 ml-2">(선택, 최대 30MB)</span>
                </h3>
                {/* 수정 모드: 기존 첨부파일 표시 */}
                {isEditMode && editData?.attachment_url && !attachmentFile && (
                  <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="text-sm text-blue-700 font-medium">기존 첨부파일</span>
                      </div>
                      <a
                        href={editData.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:underline"
                      >
                        보기
                      </a>
                    </div>
                    <p className="mt-1 text-xs text-blue-600">새 파일을 업로드하면 기존 파일이 교체됩니다.</p>
                  </div>
                )}
                <FileDropzone
                  file={attachmentFile}
                  onFileSelect={handleFileSelect}
                  maxSizeMB={30}
                  acceptedExtensions={['pdf', 'hwp', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif']}
                />
              </section>

              {/* ========== 연락처 ========== */}
              <section>
                <h3 className="text-sm font-semibold text-gray-700 mb-3 pb-2 border-b border-gray-100">
                  연락처
                  <span className="font-normal text-gray-400 ml-2">(선택)</span>
                </h3>
                <input
                  type="text"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  placeholder="전화번호 또는 이메일 주소"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all text-sm"
                />
              </section>

              {/* ========== 등록 동의 ========== */}
              <section className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  등록정보 동의 <span className="text-red-500">*</span>
                </h3>
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">
                  실제 구인구직이 되기 위한 정말 최소한의 필요한 정보만 받고 있습니다.
                  올리신 내용은 학교와 사람을 연결하는 구인구직에만 사용하겠습니다.
                </p>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={privacyAgreed}
                    onChange={(e) => setPrivacyAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 text-sky-600 border-gray-300 rounded focus:ring-sky-500"
                  />
                  <span className="text-sm text-gray-700">
                    등록정보 이용 및 서비스 내 노출에 동의합니다.
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
                disabled={isSubmitting || !coords || !primaryCategory || !privacyAgreed}
                className="w-full py-3 text-sm font-semibold text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-sky-500 hover:bg-sky-600"
                style={{
                  boxShadow: '0 4px 14px rgba(14, 165, 233, 0.4)'
                }}
              >
                {isSubmitting ? (isEditMode ? '수정 중...' : '등록 중...') : (isEditMode ? '수정하기' : '등록하기')}
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
