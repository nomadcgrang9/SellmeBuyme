'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { jobPostingSchema, type JobPostingFormData } from '@/lib/validation/formSchemas';
import { updateJobPosting, type UpdateJobPostingInput, mapJobPostingToCard } from '@/lib/supabase/queries';
import { JobPostingCard } from '@/types';
import FormLayout from './FormLayout';
import RegionSelector from './RegionSelector';
import SchoolLevelSelector from './SchoolLevelSelector';
import FileUploadField from './FileUploadField';
import { useState, useEffect } from 'react';
import { IconX } from '@tabler/icons-react';

interface JobPostingEditModalProps {
  job: JobPostingCard;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedJob: JobPostingCard) => void;
}

export default function JobPostingEditModal({
  job,
  isOpen,
  onClose,
  onSuccess
}: JobPostingEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [removeAttachment, setRemoveAttachment] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<JobPostingFormData>({
    resolver: zodResolver(jobPostingSchema),
    defaultValues: {
      organization: '',
      title: '',
      schoolLevel: {
        kindergarten: false,
        elementary: false,
        secondary: false,
        high: false,
        special: false,
        adultTraining: false,
        other: ''
      },
      subject: '',
      location: {
        seoul: [],
        gyeonggi: []
      },
      compensation: '',
      recruitmentStart: '',
      recruitmentEnd: '',
      isOngoing: false,
      workStart: '',
      workEnd: '',
      isNegotiable: false,
      description: '',
      phone: '',
      email: ''
    }
  });

  // 모달 열릴 때 기존 데이터로 폼 채우기
  useEffect(() => {
    if (!isOpen || !job.form_payload) return;

    const payload = job.form_payload;
    reset({
      organization: payload.organization || '',
      title: payload.title || '',
      schoolLevel: payload.schoolLevel || {
        kindergarten: false,
        elementary: false,
        secondary: false,
        high: false,
        special: false,
        adultTraining: false,
        other: ''
      },
      subject: payload.subject || '',
      location: payload.location || {
        seoul: [],
        gyeonggi: []
      },
      compensation: payload.compensation || '',
      recruitmentStart: payload.recruitmentStart || '',
      recruitmentEnd: payload.recruitmentEnd || '',
      isOngoing: payload.isOngoing || false,
      workStart: payload.workStart || '',
      workEnd: payload.workEnd || '',
      isNegotiable: payload.isNegotiable || false,
      description: payload.description || '',
      phone: payload.phone || '',
      email: payload.email || ''
    });
    setRemoveAttachment(false);
  }, [isOpen, job, reset]);

  const schoolLevel = watch('schoolLevel');
  const location = watch('location');
  const isOngoing = watch('isOngoing');
  const isNegotiable = watch('isNegotiable');
  const attachment = watch('attachment');

  const shouldShowSubject = schoolLevel.secondary || schoolLevel.adultTraining;

  const handleFormSubmit = async (data: JobPostingFormData) => {
    setIsSubmitting(true);
    try {
      const payload: UpdateJobPostingInput = {
        jobId: job.id,
        organization: data.organization,
        title: data.title,
        schoolLevel: data.schoolLevel,
        subject: data.subject,
        location: data.location,
        compensation: data.compensation,
        recruitmentStart: data.recruitmentStart,
        recruitmentEnd: data.recruitmentEnd,
        isOngoing: data.isOngoing,
        workStart: data.workStart,
        workEnd: data.workEnd,
        isNegotiable: data.isNegotiable,
        description: data.description,
        phone: data.phone,
        email: data.email,
        attachmentFile: data.attachment || null,
        removeAttachment
      };

      const updatedJobRow = await updateJobPosting(payload);

      // 업데이트된 공고 정보 반환
      const updatedJob = mapJobPostingToCard(updatedJobRow);

      alert('공고가 수정되었습니다.');
      onSuccess?.(updatedJob);
      onClose();
    } catch (error) {
      console.error('수정 실패:', error);
      const message = error instanceof Error ? error.message : '수정에 실패했습니다. 다시 시도해주세요.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">공고 수정</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <IconX size={20} className="text-gray-500" />
          </button>
        </div>

        {/* 폼 컨텐츠 */}
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-4">
          {/* 3단 컬럼 그리드 */}
          <div className="grid grid-cols-3 gap-x-2 gap-y-1">

            {/* 좌측 컬럼: 기본 정보, 학교급, 근무지역 */}
            <div className="space-y-1">
              {/* 학교/기관명 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  학교/기관명 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('organization')}
                  type="text"
                  placeholder="예: 수원 ○○초등학교"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.organization && (
                  <p className="text-[11px] text-red-600 mt-0.5">{errors.organization.message}</p>
                )}
              </div>

              {/* 공고 제목 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  공고 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('title')}
                  type="text"
                  placeholder="예: 초등 담임교사 (기간제) 모집"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.title && (
                  <p className="text-[11px] text-red-600 mt-0.5">{errors.title.message}</p>
                )}
              </div>

              {/* 학교급 (드롭다운) */}
              <SchoolLevelSelector
                value={schoolLevel}
                onChange={(newSchoolLevel) => setValue('schoolLevel', newSchoolLevel)}
                error={errors.schoolLevel?.message as string}
              />

              {/* 근무 지역 */}
              <RegionSelector
                value={location}
                onChange={(newLocation) => setValue('location', newLocation)}
                error={errors.location?.message as string}
              />
            </div>

            {/* 중앙 컬럼: 모집기간, 근무기간, 급여/처우, 상세설명 */}
            <div className="space-y-1">
              {/* 모집기간 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  모집기간 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    {...register('recruitmentStart')}
                    type="date"
                    disabled={isOngoing}
                    className="flex-1 h-7 px-1 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100"
                  />
                  <span className="text-[11px] text-gray-500">~</span>
                  <input
                    {...register('recruitmentEnd')}
                    type="date"
                    disabled={isOngoing}
                    className="flex-1 h-7 px-1 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <label className="flex items-center gap-0.5 cursor-pointer mt-0.5">
                  <input
                    {...register('isOngoing')}
                    type="checkbox"
                    className="w-3 h-3 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-[11px] text-gray-700">상시 모집</span>
                </label>
                {(errors.recruitmentStart || errors.recruitmentEnd) && (
                  <p className="text-[11px] text-red-600 mt-0.5">
                    {errors.recruitmentStart?.message || errors.recruitmentEnd?.message}
                  </p>
                )}
              </div>

              {/* 근무기간 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  근무기간 <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-1">
                  <input
                    {...register('workStart')}
                    type="date"
                    disabled={isNegotiable}
                    className="flex-1 h-7 px-1 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100"
                  />
                  <span className="text-[11px] text-gray-500">~</span>
                  <input
                    {...register('workEnd')}
                    type="date"
                    disabled={isNegotiable}
                    className="flex-1 h-7 px-1 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <label className="flex items-center gap-0.5 cursor-pointer mt-0.5">
                  <input
                    {...register('isNegotiable')}
                    type="checkbox"
                    className="w-3 h-3 rounded border-gray-300 text-blue-600"
                  />
                  <span className="text-[11px] text-gray-700">협의 가능</span>
                </label>
                {(errors.workStart || errors.workEnd) && (
                  <p className="text-[11px] text-red-600 mt-0.5">
                    {errors.workStart?.message || errors.workEnd?.message}
                  </p>
                )}
              </div>

              {/* 급여/처우 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">급여/처우</label>
                <input
                  {...register('compensation')}
                  type="text"
                  placeholder="예: 월 250만원, 4대보험"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
              </div>

              {/* 상세 설명 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">상세 설명</label>
                <textarea
                  {...register('description')}
                  rows={2}
                  placeholder="담당 업무, 우대 사항 등"
                  className="w-full px-2 py-1 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent resize-none"
                />
              </div>
            </div>

            {/* 우측 컬럼: 전화번호, 이메일, 공고문 첨부, 취소/수정 버튼 */}
            <div className="space-y-1">
              {/* 과목 (조건부) */}
              {shouldShowSubject && (
                <div>
                  <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                    과목 <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('subject')}
                    type="text"
                    placeholder="예: 국어, 수학, 영어"
                    className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                  />
                  {errors.subject && (
                    <p className="text-[11px] text-red-600 mt-0.5">{errors.subject.message}</p>
                  )}
                </div>
              )}

              {/* 전화번호 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="예: 031-XXXX-XXXX"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.phone && (
                  <p className="text-[11px] text-red-600 mt-0.5">{errors.phone.message}</p>
                )}
              </div>

              {/* 이메일 */}
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@school.kr"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.email && (
                  <p className="text-[11px] text-red-600 mt-0.5">{errors.email.message}</p>
                )}
              </div>

              {/* 공고문 첨부 */}
              <FileUploadField
                value={attachment}
                onChange={(file) => {
                  setValue('attachment', file || undefined);
                  if (file) setRemoveAttachment(false);
                }}
                error={errors.attachment?.message as string}
              />

              {/* 첨부파일 제거 옵션 */}
              {job.attachment_url && !attachment && (
                <label className="flex items-center gap-0.5 cursor-pointer p-2 bg-gray-50 border border-gray-300 rounded text-[11px]">
                  <input
                    type="checkbox"
                    checked={removeAttachment}
                    onChange={(e) => setRemoveAttachment(e.target.checked)}
                    className="w-3 h-3 rounded border-gray-300 text-red-600"
                  />
                  <span className="text-gray-700">기존 첨부파일 제거</span>
                </label>
              )}

              {/* 취소/수정 버튼 */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-[12px] font-medium text-white bg-gradient-to-r from-[#7aa3cc] to-[#68B2FF] rounded hover:from-[#6a93bc] hover:to-[#58A2EF] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '수정 중...' : '수정하기'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
