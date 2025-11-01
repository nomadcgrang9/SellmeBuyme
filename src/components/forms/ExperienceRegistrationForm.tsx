'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { experienceRegistrationSchema, type ExperienceRegistrationFormData } from '@/lib/validation/formSchemas';
import FormLayout from './FormLayout';
import RegionSelector from './RegionSelector';
import TargetSchoolLevelSelector from './TargetSchoolLevelSelector';
import CategorySelector from './CategorySelector';
import OperationTypeSelector from './OperationTypeSelector';
import { useState } from 'react';

interface ExperienceRegistrationFormProps {
  onClose: () => void;
  onSubmit?: (data: ExperienceRegistrationFormData) => Promise<void>;
}

export default function ExperienceRegistrationForm({ onClose, onSubmit }: ExperienceRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<ExperienceRegistrationFormData>({
    resolver: zodResolver(experienceRegistrationSchema),
    defaultValues: {
      programTitle: '',
      category: [],
      targetSchoolLevel: [],
      location: {
        seoul: [],
        gyeonggi: []
      },
      introduction: '',
      operationType: [],
      capacity: '',
      phone: '',
      email: ''
    }
  });

  const category = watch('category');
  const targetSchoolLevel = watch('targetSchoolLevel');
  const location = watch('location');
  const operationType = watch('operationType');

  const handleFormSubmit = async (data: ExperienceRegistrationFormData) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        console.log('체험 등록 데이터:', data);
        alert('체험 등록이 완료되었습니다.');
        onClose();
      }
    } catch (error) {
      console.error('등록 실패:', error);
      alert('등록에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormLayout
      title="체험 등록"
      onClose={onClose}
      onSubmit={handleSubmit(handleFormSubmit)}
      isSubmitting={isSubmitting}
    >
      {/* 3단 컬럼 그리드 */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1">

        {/* 좌측 컬럼: 기본 정보 */}
        <div className="space-y-1">
          {/* 프로그램 제목 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
              프로그램 제목 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('programTitle')}
              type="text"
              placeholder="예: 코딩로봇 체험교실"
              className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
            {errors.programTitle && (
              <p className="text-[13px] text-red-600 mt-0.5">{errors.programTitle.message}</p>
            )}
          </div>

          {/* 카테고리 */}
          <CategorySelector
            value={category}
            onChange={(newCategory) => setValue('category', newCategory)}
            error={errors.category?.message as string}
          />

          {/* 대상 학교급 */}
          <TargetSchoolLevelSelector
            value={targetSchoolLevel}
            onChange={(newLevel) => setValue('targetSchoolLevel', newLevel)}
            error={errors.targetSchoolLevel?.message as string}
          />
        </div>

        {/* 중앙 컬럼: 운영 조건 */}
        <div className="space-y-1">
          {/* 희망 지역 */}
          <RegionSelector
            value={location}
            onChange={(newLocation) => setValue('location', newLocation)}
            error={errors.location?.message as string}
          />

          {/* 운영 방식 */}
          <OperationTypeSelector
            value={operationType}
            onChange={(newType) => setValue('operationType', newType)}
            error={errors.operationType?.message as string}
          />

          {/* 수용 인원 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">수용 인원</label>
            <input
              {...register('capacity')}
              type="text"
              placeholder="예: 20~30명 / 학급 단위"
              className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* 우측 컬럼: 소개, 연락처, 버튼 */}
        <div className="space-y-1">
          {/* 프로그램 소개 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
              프로그램 소개 <span className="text-red-500">*</span>
            </label>
            <textarea
              {...register('introduction')}
              rows={3}
              placeholder="프로그램 내용, 특징, 준비물 등"
              className="w-full px-2 py-1 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent resize-none"
            />
            {errors.introduction && (
              <p className="text-[13px] text-red-600 mt-0.5">{errors.introduction.message}</p>
            )}
          </div>

          {/* 전화번호 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
              전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="예: 010-XXXX-XXXX"
              className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
            {errors.phone && (
              <p className="text-[13px] text-red-600 mt-0.5">{errors.phone.message}</p>
            )}
          </div>

          {/* 이메일 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
              이메일 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('email')}
              type="email"
              placeholder="example@email.com"
              className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
            {errors.email && (
              <p className="text-[13px] text-red-600 mt-0.5">{errors.email.message}</p>
            )}
          </div>

          {/* 취소/등록 버튼 */}
          <div className="flex items-center justify-end gap-1.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-[14px] font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-3 py-1.5 text-[14px] font-medium text-gray-900 bg-gradient-to-r from-[#ffd98e] to-[#f4c96b] rounded hover:from-[#f4c96b] hover:to-[#ebb850] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '등록 중...' : '등록하기'}
            </button>
          </div>
        </div>
      </div>
    </FormLayout>
  );
}
