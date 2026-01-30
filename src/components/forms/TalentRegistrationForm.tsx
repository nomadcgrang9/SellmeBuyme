'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { talentRegistrationSchema, type TalentRegistrationFormData } from '@/lib/validation/formSchemas';
import FormLayout from './FormLayout';
import RegionSelector from './RegionSelector';
import RegionSearchInput, { type RegionData } from './RegionSearchInput';
import SpecialtySelector from './SpecialtySelector';
import { useState } from 'react';

interface TalentRegistrationFormProps {
  onClose: () => void;
  onSubmit?: (data: TalentRegistrationFormData) => Promise<void>;
  mode?: 'create' | 'edit';
  initialData?: Partial<TalentRegistrationFormData> | null;
  onDelete?: () => Promise<void> | void;
}

export default function TalentRegistrationForm({ onClose, onSubmit, mode = 'create', initialData, onDelete }: TalentRegistrationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<TalentRegistrationFormData>({
    resolver: zodResolver(talentRegistrationSchema),
    defaultValues: {
      markerLocation: initialData?.markerLocation ?? undefined,
      name: initialData?.name ?? '',
      specialty: {
        contractTeacher: {
          enabled: initialData?.specialty?.contractTeacher?.enabled ?? false,
          kindergarten: initialData?.specialty?.contractTeacher?.kindergarten ?? false,
          elementary: initialData?.specialty?.contractTeacher?.elementary ?? false,
          secondary: initialData?.specialty?.contractTeacher?.secondary ?? false,
          secondarySubjects: initialData?.specialty?.contractTeacher?.secondarySubjects ?? '',
          special: initialData?.specialty?.contractTeacher?.special ?? false,
        },
        careerEducation: initialData?.specialty?.careerEducation ?? false,
        counseling: initialData?.specialty?.counseling ?? false,
        afterSchool: initialData?.specialty?.afterSchool ?? false,
        neulbom: initialData?.specialty?.neulbom ?? false,
        cooperativeInstructor: initialData?.specialty?.cooperativeInstructor ?? false,
        adultTraining: initialData?.specialty?.adultTraining ?? false,
        other: initialData?.specialty?.other ?? ''
      },
      experience: initialData?.experience,
      location: {
        seoulAll: initialData?.location && 'seoulAll' in initialData.location ? (initialData.location as any).seoulAll : false,
        gyeonggiAll: initialData?.location && 'gyeonggiAll' in initialData.location ? (initialData.location as any).gyeonggiAll : false,
        seoul: initialData?.location?.seoul ?? [],
        gyeonggi: initialData?.location?.gyeonggi ?? []
      },
      license: initialData?.license ?? '',
      introduction: initialData?.introduction ?? '',
      phone: initialData?.phone ?? '',
      email: initialData?.email ?? ''
    }
  });

  const specialty = watch('specialty');
  const location = watch('location');
  const experience = watch('experience');
  const markerLocation = watch('markerLocation');

  const handleFormSubmit = async (data: TalentRegistrationFormData) => {
    setIsSubmitting(true);
    try {
      if (onSubmit) {
        await onSubmit(data);
      } else {
        console.log('인력 등록 데이터:', data);
        alert('인력 등록이 완료되었습니다. (백엔드 미구현)');
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
      title={mode === 'edit' ? '인력 수정' : '인력 등록'}
      onClose={onClose}
      onSubmit={handleSubmit(handleFormSubmit)}
      isSubmitting={isSubmitting}
    >
      {/* 위치 선택 (전체 너비) */}
      <div className="mb-4">
        <label className="text-[14px] font-semibold text-gray-700 block mb-1">
          위치 <span className="text-red-500">*</span>
        </label>
        <RegionSearchInput
          value={markerLocation as RegionData | null}
          onChange={(region) => setValue('markerLocation', region ?? undefined)}
          error={errors.markerLocation?.regionName?.message as string}
        />
      </div>

      {/* 3단 컬럼 그리드 */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-1">

        {/* 좌측 컬럼: 기본 정보 */}
        <div className="space-y-1">
          {/* 이름 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('name')}
              type="text"
              placeholder="예: 홍길동"
              className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
            {errors.name && (
              <p className="text-[13px] text-red-600 mt-0.5">{errors.name.message}</p>
            )}
          </div>

          {/* 전문 분야 */}
          <SpecialtySelector
            value={specialty}
            onChange={(newSpecialty) => setValue('specialty', newSpecialty)}
            error={errors.specialty?.message as string}
          />

          {/* 경력 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">
              경력 <span className="text-red-500">*</span>
            </label>
            <div className="space-y-0.5">
              {['신규', '1~3년', '3~5년', '5년 이상'].map((exp) => (
                <label key={exp} className="flex items-center gap-1 cursor-pointer">
                  <input
                    {...register('experience')}
                    type="radio"
                    value={exp}
                    className="w-4 h-4"
                  />
                  <span className="text-[13px] text-gray-700">{exp}</span>
                </label>
              ))}
            </div>
            {errors.experience && (
              <p className="text-[13px] text-red-600 mt-0.5">{errors.experience.message}</p>
            )}
          </div>
        </div>

        {/* 중앙 컬럼: 활동 선호 조건 */}
        <div className="space-y-1">
          {/* 희망 지역 */}
          <RegionSelector
            value={location}
            onChange={(newLocation) => setValue('location', newLocation)}
            error={errors.location?.message as string}
          />

          {/* 자격/면허 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">자격/면허</label>
            <input
              {...register('license')}
              type="text"
              placeholder="예: 중등교사 2급 정교사 (영어)"
              className="w-full h-8 px-2 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent"
            />
          </div>

          {/* 자기소개 */}
          <div>
            <label className="text-[14px] font-semibold text-gray-700 block mb-0.5">자기소개</label>
            <textarea
              {...register('introduction')}
              rows={3}
              placeholder="전문성, 경력, 교육 철학 등"
              className="w-full px-2 py-1 text-[14px] border border-gray-300 rounded focus:ring-1 focus:ring-blue-400 focus:border-transparent resize-none"
            />
          </div>
        </div>

        {/* 우측 컬럼: 연락처, 버튼 */}
        <div className="space-y-1">
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
            <p className="text-[12px] text-gray-500 mt-0.5">
              휴대전화 번호는 일반에 공개되지 않으며 로그인 및 인증과정을 거친 학교 사용자들을 대상으로만 공개됩니다.
            </p>
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
          <div className="flex items-center justify-between gap-1.5 pt-1">
            {mode === 'edit' && onDelete && (
              <button
                type="button"
                onClick={() => onDelete()}
                className="px-3 py-1.5 text-[14px] font-medium text-white bg-red-500 rounded hover:bg-red-600 transition-colors"
              >
                삭제하기
              </button>
            )}
            <div className="flex items-center gap-1.5">
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
                className="px-3 py-1.5 text-[14px] font-medium text-white bg-gradient-to-r from-[#7db8a3] to-[#6fb59b] rounded hover:from-[#6da893] hover:to-[#5fa58b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (mode === 'edit' ? '수정 중...' : '등록 중...') : (mode === 'edit' ? '수정하기' : '등록하기')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </FormLayout>
  );
}
