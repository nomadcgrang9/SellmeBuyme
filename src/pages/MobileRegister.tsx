import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronLeft, ChevronDown } from 'lucide-react';
import {
  jobPostingSchema,
  talentRegistrationSchema,
  experienceRegistrationSchema,
  type JobPostingFormData,
  type TalentRegistrationFormData,
  type ExperienceRegistrationFormData
} from '@/lib/validation/formSchemas';
import RegionSelector from '@/components/forms/RegionSelector';
import SpecialtySelector from '@/components/forms/SpecialtySelector';
import CategorySelector from '@/components/forms/CategorySelector';
import TargetSchoolLevelSelector from '@/components/forms/TargetSchoolLevelSelector';
import OperationTypeSelector from '@/components/forms/OperationTypeSelector';
import SchoolLevelSelector from '@/components/forms/SchoolLevelSelector';
import FileUploadField from '@/components/forms/FileUploadField';
import { createJobPosting, createTalent, createExperience } from '@/lib/supabase/queries';
import type { CreateJobPostingInput } from '@/lib/supabase/queries';
import MobileBottomNav from '@/components/mobile/MobileBottomNav';

type RegistrationType = 'job' | 'talent' | 'experience';

export default function MobileRegister() {
  const [registrationType, setRegistrationType] = useState<RegistrationType>('job');
  const [currentBottomTab, setCurrentBottomTab] = useState<'home' | 'chat' | 'profile' | null>(null);

  const handleBack = () => {
    window.history.back();
  };

  const handleHomeClick = () => {
    window.location.href = '/';
  };

  const handleChatClick = () => {
    window.location.href = '/chat';
  };

  const handleProfileClick = () => {
    window.location.href = '/';
  };

  const handleRegisterClick = () => {
    // 이미 등록 페이지에 있으므로 아무것도 하지 않음
  };

  return (
    <div className="min-h-screen bg-white pb-24">
      {/* 헤더 */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="flex items-center h-14 px-4">
          <button
            onClick={handleBack}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="뒤로가기"
          >
            <ChevronLeft size={24} className="text-gray-700" strokeWidth={1.5} />
          </button>
          <h1 className="flex-1 text-center text-lg font-bold text-gray-900 pr-10">
            등록하기
          </h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* 등록 유형 선택 드롭다운 */}
        <div className="mb-6">
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            무엇을 등록하시겠어요? <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={registrationType}
              onChange={(e) => setRegistrationType(e.target.value as RegistrationType)}
              className="w-full h-12 px-4 pr-10 text-base border border-gray-300 rounded-lg bg-white text-gray-900 appearance-none focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all !font-light font-synthesis-none"
              style={{
                fontFamily: "'KakaoSmallSans', 'esamanru-light', 'esamanru', -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
                fontWeight: 300,
                letterSpacing: '0.02em'
              }}
            >
              <option value="job" style={{ fontWeight: 300 }}>공고 등록</option>
              <option value="talent" style={{ fontWeight: 300 }}>인력 등록</option>
              <option value="experience" style={{ fontWeight: 300 }}>체험 등록</option>
            </select>
            <ChevronDown
              size={20}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              strokeWidth={1.5}
            />
          </div>
        </div>

        <div className="h-px bg-gray-200 my-6" />

        {/* 동적 폼 영역 */}
        {registrationType === 'job' && <JobRegistrationForm />}
        {registrationType === 'talent' && <TalentRegistrationForm />}
        {registrationType === 'experience' && <ExperienceRegistrationForm />}
      </div>

      {/* 모바일 하단 네비게이션 */}
      <MobileBottomNav
        currentTab={currentBottomTab}
        onTabChange={setCurrentBottomTab}
        onChatClick={handleChatClick}
        onProfileClick={handleProfileClick}
        onRegisterClick={handleRegisterClick}
        onHomeClick={handleHomeClick}
      />
    </div>
  );
}

// 공고 등록 폼
function JobRegistrationForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      location: { seoul: [], gyeonggi: [] },
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

  const schoolLevel = watch('schoolLevel');
  const location = watch('location');
  const isOngoing = watch('isOngoing');
  const isNegotiable = watch('isNegotiable');
  const shouldShowSubject = schoolLevel.secondary || schoolLevel.adultTraining;

  const onSubmit = async (data: JobPostingFormData) => {
    setIsSubmitting(true);
    try {
      const payload: CreateJobPostingInput = {
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
        attachmentFile: data.attachment || null
      };

      await createJobPosting(payload);
      reset();
      alert('공고가 등록되었습니다.');
      window.history.back();
    } catch (error) {
      console.error('등록 실패:', error);
      const message = error instanceof Error ? error.message : '등록에 실패했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 공고 정보 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">공고 정보</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            학교/기관명 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('organization')}
            type="text"
            placeholder="예: 수원 행복초등학교"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.organization && (
            <p className="text-sm text-red-600 mt-1">{errors.organization.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            공고 제목 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('title')}
            type="text"
            placeholder="예: 초등 담임교사(기간제) 모집"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.title && (
            <p className="text-sm text-red-600 mt-1">{errors.title.message}</p>
          )}
        </div>

        <SchoolLevelSelector
          value={schoolLevel}
          onChange={(newSchoolLevel) => setValue('schoolLevel', newSchoolLevel)}
          error={errors.schoolLevel?.message as string}
        />

        {shouldShowSubject && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              과목 <span className="text-red-500">*</span>
            </label>
            <input
              {...register('subject')}
              type="text"
              placeholder="예: 국어, 수학, 영어"
              className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
            />
            {errors.subject && (
              <p className="text-sm text-red-600 mt-1">{errors.subject.message}</p>
            )}
          </div>
        )}

        <RegionSelector
          value={location}
          onChange={(newLocation) => setValue('location', newLocation)}
          error={errors.location?.message as string}
        />
      </section>

      {/* 모집 및 근무 기간 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">모집 및 근무 기간</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            모집 기간 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              {...register('recruitmentStart')}
              type="date"
              disabled={isOngoing}
              className="flex-1 h-11 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-all"
            />
            <span className="text-gray-400">~</span>
            <input
              {...register('recruitmentEnd')}
              type="date"
              disabled={isOngoing}
              className="flex-1 h-11 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-all"
            />
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              {...register('isOngoing')}
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-[#68B2FF] focus:ring-[#68B2FF]"
            />
            <span className="text-sm text-gray-700">상시 모집</span>
          </label>
          {(errors.recruitmentStart || errors.recruitmentEnd) && (
            <p className="text-sm text-red-600 mt-1">
              {errors.recruitmentStart?.message || errors.recruitmentEnd?.message}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            근무 기간 <span className="text-red-500">*</span>
          </label>
          <div className="flex items-center gap-2">
            <input
              {...register('workStart')}
              type="date"
              disabled={isNegotiable}
              className="flex-1 h-11 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-all"
            />
            <span className="text-gray-400">~</span>
            <input
              {...register('workEnd')}
              type="date"
              disabled={isNegotiable}
              className="flex-1 h-11 px-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-500 transition-all"
            />
          </div>
          <label className="flex items-center gap-2 mt-2 cursor-pointer">
            <input
              {...register('isNegotiable')}
              type="checkbox"
              className="w-4 h-4 rounded border-gray-300 text-[#68B2FF] focus:ring-[#68B2FF]"
            />
            <span className="text-sm text-gray-700">협의 가능</span>
          </label>
          {(errors.workStart || errors.workEnd) && (
            <p className="text-sm text-red-600 mt-1">
              {errors.workStart?.message || errors.workEnd?.message}
            </p>
          )}
        </div>
      </section>

      {/* 추가 정보 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">추가 정보</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">급여/처우</label>
          <input
            {...register('compensation')}
            type="text"
            placeholder="예: 월 250만원, 4대보험"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">상세 설명</label>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="담당 업무, 우대 사항 등"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent resize-none transition-all"
          />
        </div>
      </section>

      {/* 연락처 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">연락처</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            전화번호 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('phone')}
            type="tel"
            placeholder="예: 031-XXXX-XXXX"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="example@school.kr"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>

        <FileUploadField
          value={watch('attachment')}
          onChange={(file) => setValue('attachment', file || undefined)}
          error={errors.attachment?.message as string}
        />
      </section>

      {/* 등록 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base font-semibold text-white bg-[#68B2FF] rounded-lg hover:bg-[#5AA2EF] active:bg-[#4A92DF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '등록 중...' : '등록하기'}
      </button>
    </form>
  );
}

// 인력 등록 폼
function TalentRegistrationForm() {
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
      name: '',
      specialty: {
        contractTeacher: {
          enabled: false,
          kindergarten: false,
          elementary: false,
          secondary: false,
          secondarySubjects: '',
          special: false
        },
        careerEducation: false,
        counseling: false,
        afterSchool: false,
        neulbom: false,
        cooperativeInstructor: false,
        adultTraining: false,
        other: ''
      },
      experience: undefined,
      location: { seoul: [], gyeonggi: [] },
      license: '',
      introduction: '',
      phone: '',
      email: ''
    }
  });

  const specialty = watch('specialty');
  const location = watch('location');

  const onSubmit = async (data: TalentRegistrationFormData) => {
    setIsSubmitting(true);
    try {
      await createTalent(data);
      alert('인력 등록이 완료되었습니다.');
      window.history.back();
    } catch (error) {
      console.error('등록 실패:', error);
      const message = error instanceof Error ? error.message : '등록에 실패했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 기본 정보 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">기본 정보</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('name')}
            type="text"
            placeholder="예: 홍길동"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.name && (
            <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
          )}
        </div>

        <SpecialtySelector
          value={specialty}
          onChange={(newSpecialty) => setValue('specialty', newSpecialty)}
          error={errors.specialty?.message as string}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            경력 <span className="text-red-500">*</span>
          </label>
          <div className="space-y-2">
            {['신규', '1~3년', '3~5년', '5년 이상'].map((exp) => (
              <label key={exp} className="flex items-center gap-2 cursor-pointer">
                <input
                  {...register('experience')}
                  type="radio"
                  value={exp}
                  className="w-4 h-4 text-[#68B2FF] focus:ring-[#68B2FF]"
                />
                <span className="text-sm text-gray-700">{exp}</span>
              </label>
            ))}
          </div>
          {errors.experience && (
            <p className="text-sm text-red-600 mt-1">{errors.experience.message}</p>
          )}
        </div>
      </section>

      {/* 활동 선호 조건 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">활동 선호 조건</h2>

        <RegionSelector
          value={location}
          onChange={(newLocation) => setValue('location', newLocation)}
          error={errors.location?.message as string}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">자격/면허</label>
          <input
            {...register('license')}
            type="text"
            placeholder="예: 중등교사 2급 정교사(영어)"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">자기소개</label>
          <textarea
            {...register('introduction')}
            rows={4}
            placeholder="전문성, 경력, 교육 철학 등"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent resize-none transition-all"
          />
        </div>
      </section>

      {/* 연락처 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">연락처</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            전화번호 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('phone')}
            type="tel"
            placeholder="예: 010-XXXX-XXXX"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          <p className="text-xs text-gray-500 mt-1.5">
            휴대전화 번호는 로그인한 학교 사용자에게만 공개됩니다.
          </p>
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="example@email.com"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>
      </section>

      {/* 등록 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base font-semibold text-white bg-[#68B2FF] rounded-lg hover:bg-[#5AA2EF] active:bg-[#4A92DF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '등록 중...' : '등록하기'}
      </button>
    </form>
  );
}

// 체험 등록 폼
function ExperienceRegistrationForm() {
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
      location: { seoul: [], gyeonggi: [] },
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

  const onSubmit = async (data: ExperienceRegistrationFormData) => {
    setIsSubmitting(true);
    try {
      await createExperience(data);
      alert('체험 등록이 완료되었습니다.');
      window.history.back();
    } catch (error) {
      console.error('등록 실패:', error);
      const message = error instanceof Error ? error.message : '등록에 실패했습니다.';
      alert(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* 프로그램 정보 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">프로그램 정보</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            프로그램명 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('programTitle')}
            type="text"
            placeholder="예: AI 코딩 체험 교실"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.programTitle && (
            <p className="text-sm text-red-600 mt-1">{errors.programTitle.message}</p>
          )}
        </div>

        <CategorySelector
          value={category}
          onChange={(newCategory) => setValue('category', newCategory)}
          error={errors.category?.message as string}
        />

        <TargetSchoolLevelSelector
          value={targetSchoolLevel}
          onChange={(newLevel) => setValue('targetSchoolLevel', newLevel)}
          error={errors.targetSchoolLevel?.message as string}
        />
      </section>

      {/* 운영 조건 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">운영 조건</h2>

        <RegionSelector
          value={location}
          onChange={(newLocation) => setValue('location', newLocation)}
          error={errors.location?.message as string}
        />

        <OperationTypeSelector
          value={operationType}
          onChange={(newType) => setValue('operationType', newType)}
          error={errors.operationType?.message as string}
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">수용 인원</label>
          <input
            {...register('capacity')}
            type="text"
            placeholder="예: 20~30명 / 학급 단위"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            프로그램 소개 <span className="text-red-500">*</span>
          </label>
          <textarea
            {...register('introduction')}
            rows={4}
            placeholder="프로그램 내용, 특징, 준비물, 비용 등"
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent resize-none transition-all"
          />
          {errors.introduction && (
            <p className="text-sm text-red-600 mt-1">{errors.introduction.message}</p>
          )}
        </div>
      </section>

      {/* 연락처 섹션 */}
      <section className="space-y-4">
        <h2 className="text-base font-bold text-gray-900">연락처</h2>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            담당자 전화번호 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('phone')}
            type="tel"
            placeholder="예: 010-XXXX-XXXX"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.phone && (
            <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            담당자 이메일 <span className="text-red-500">*</span>
          </label>
          <input
            {...register('email')}
            type="email"
            placeholder="program@school.com"
            className="w-full h-11 px-4 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#68B2FF] focus:border-transparent transition-all"
          />
          {errors.email && (
            <p className="text-sm text-red-600 mt-1">{errors.email.message}</p>
          )}
        </div>
      </section>

      {/* 등록 버튼 */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full h-12 text-base font-semibold text-white bg-[#68B2FF] rounded-lg hover:bg-[#5AA2EF] active:bg-[#4A92DF] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? '등록 중...' : '등록하기'}
      </button>
    </form>
  );
}
