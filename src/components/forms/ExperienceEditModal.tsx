'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { IconX } from '@tabler/icons-react';

import RegionSelector from './RegionSelector';
import TargetSchoolLevelSelector from './TargetSchoolLevelSelector';
import CategorySelector from './CategorySelector';
import OperationTypeSelector from './OperationTypeSelector';
import {
  experienceRegistrationSchema,
  type ExperienceRegistrationFormData,
} from '@/lib/validation/formSchemas';
import {
  updateExperience,
  deleteExperience,
  type UpdateExperienceInput,
} from '@/lib/supabase/queries';
import type { ExperienceCard } from '@/types';

interface ExperienceEditModalProps {
  experience: ExperienceCard;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (updatedExperience: ExperienceCard) => void;
  onDelete?: (experienceId: string) => void;
}

type StableLocation = Required<Required<ExperienceRegistrationFormData>['location']>;

const EMPTY_LOCATION: StableLocation = {
  seoul: [],
  gyeonggi: [],
};

function toFormValues(experience: ExperienceCard): ExperienceRegistrationFormData {
  const payload = experience.form_payload ?? null;

  if (payload) {
    return {
      programTitle: payload.programTitle ?? experience.programTitle,
      category: payload.category ?? experience.categories ?? [],
      targetSchoolLevel: payload.targetSchoolLevel ?? experience.targetSchoolLevels ?? [],
      location: {
        seoul: payload.location?.seoul ?? experience.regionSeoul ?? [],
        gyeonggi: payload.location?.gyeonggi ?? experience.regionGyeonggi ?? [],
      },
      introduction: payload.introduction ?? experience.introduction ?? '',
      operationType: payload.operationType ?? experience.operationTypes ?? [],
      capacity: payload.capacity ?? experience.capacity ?? '',
      phone: payload.phone ?? experience.contactPhone ?? '',
      email: payload.email ?? experience.contactEmail ?? '',
    };
  }

  return {
    programTitle: experience.programTitle,
    category: experience.categories ?? [],
    targetSchoolLevel: experience.targetSchoolLevels ?? [],
    location: {
      seoul: experience.regionSeoul ?? [],
      gyeonggi: experience.regionGyeonggi ?? [],
    },
    introduction: experience.introduction ?? '',
    operationType: experience.operationTypes ?? [],
    capacity: experience.capacity ?? '',
    phone: experience.contactPhone ?? '',
    email: experience.contactEmail ?? '',
  };
}

export default function ExperienceEditModal({
  experience,
  isOpen,
  onClose,
  onSuccess,
  onDelete,
}: ExperienceEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const defaultValues = useMemo(() => toFormValues(experience), [experience]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ExperienceRegistrationFormData>({
    resolver: zodResolver(experienceRegistrationSchema),
    defaultValues,
  });

  useEffect(() => {
    if (isOpen) {
      reset(toFormValues(experience));
    }
  }, [experience, isOpen, reset]);

  const category = watch('category');
  const targetSchoolLevel = watch('targetSchoolLevel');
  const location = watch('location') ?? EMPTY_LOCATION;
  const operationType = watch('operationType');

  const normalizeLocation = (value: Partial<StableLocation> | undefined): StableLocation => ({
    seoul: value?.seoul ?? [],
    gyeonggi: value?.gyeonggi ?? [],
  });

  const handleFormSubmit = async (data: ExperienceRegistrationFormData) => {
    setIsSubmitting(true);
    try {
      const payload: UpdateExperienceInput = {
        id: experience.id,
        programTitle: data.programTitle,
        category: data.category,
        targetSchoolLevel: data.targetSchoolLevel,
        location: normalizeLocation(data.location),
        introduction: data.introduction,
        operationType: data.operationType,
        capacity: data.capacity ?? '',
        phone: data.phone,
        email: data.email,
      };

      const updatedExperience = await updateExperience(payload);
      alert('체험이 수정되었습니다.');
      onSuccess?.(updatedExperience);
      onClose();
    } catch (error) {
      console.error('체험 수정 실패:', error);
      const message =
        error instanceof Error ? error.message : '체험 수정에 실패했습니다. 잠시 후 다시 시도해주세요.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('정말로 삭제하시겠어요? 삭제 후 복구할 수 없습니다.')) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteExperience(experience.id);
      alert('체험이 삭제되었습니다.');
      onDelete?.(experience.id);
      onClose();
    } catch (error) {
      console.error('체험 삭제 실패:', error);
      const message =
        error instanceof Error ? error.message : '체험 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.';
      alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-white">
          <h2 className="text-lg font-semibold text-gray-900">체험 수정</h2>
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
            {/* 좌측 컬럼: 프로그램명, 카테고리, 대상학교급 */}
            <div className="space-y-1">
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  프로그램 제목 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('programTitle')}
                  type="text"
                  placeholder="예: 코딩로봇 체험교실"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.programTitle && (
                  <p className="text-[11px] text-red-600 mt-0.5">{errors.programTitle.message}</p>
                )}
              </div>

              <CategorySelector
                value={category ?? []}
                onChange={(next) => setValue('category', next, { shouldValidate: true })}
                error={errors.category?.message as string}
              />

              <TargetSchoolLevelSelector
                value={targetSchoolLevel ?? []}
                onChange={(next) => setValue('targetSchoolLevel', next, { shouldValidate: true })}
                error={errors.targetSchoolLevel?.message as string}
              />
            </div>

            {/* 중앙 컬럼: 지역, 운영방식, 수용인원 */}
            <div className="space-y-1">
              <RegionSelector
                value={normalizeLocation(location)}
                onChange={(next) => setValue('location', normalizeLocation(next), { shouldValidate: true })}
                error={errors.location?.message as string}
              />

              <OperationTypeSelector
                value={operationType ?? []}
                onChange={(next) => setValue('operationType', next, { shouldValidate: true })}
                error={errors.operationType?.message as string}
              />

              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">수용 인원</label>
                <input
                  {...register('capacity')}
                  type="text"
                  placeholder="예: 20~30명 / 학급 단위"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
              </div>
            </div>

            {/* 우측 컬럼: 소개, 전화번호, 이메일, 버튼 */}
            <div className="space-y-1">
              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  프로그램 소개 <span className="text-red-500">*</span>
                </label>
                <textarea
                  {...register('introduction')}
                  rows={3}
                  placeholder="프로그램 내용, 특징, 준비물 등"
                  className="w-full px-2 py-1 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent resize-none"
                />
                {errors.introduction && (
                  <p className="text-[11px] text-red-600 mt-0.5">{errors.introduction.message}</p>
                )}
              </div>

              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('phone')}
                  type="tel"
                  placeholder="예: 010-XXXX-XXXX"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.phone && <p className="text-[11px] text-red-600 mt-0.5">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-[12px] font-semibold text-gray-700 block mb-0.5">
                  이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="example@email.com"
                  className="w-full h-7 px-2 text-[12px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
                />
                {errors.email && <p className="text-[11px] text-red-600 mt-0.5">{errors.email.message}</p>}
              </div>

              {/* 버튼 */}
              <div className="flex items-center justify-end gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting || isSubmitting}
                  className="px-3 py-1.5 text-[12px] font-medium text-red-600 bg-white border border-red-200 rounded hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeleting ? '삭제 중...' : '삭제하기'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 text-[12px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  닫기
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3 py-1.5 text-[12px] font-medium text-gray-900 bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] rounded hover:from-[#f4c96b] hover:to-[#ebb850] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '수정 중...' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
