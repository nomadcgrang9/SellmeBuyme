'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconX, IconChevronLeft, IconChevronRight } from '@tabler/icons-react';
import { upsertUserProfile, fetchUserProfile } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import { useToastStore } from '@/stores/toastStore';
import ProfileStep1Basic from './ProfileStep1Basic';
import ProfileStep1Role from './ProfileStep1Role';
import ProfileStep2Field from './ProfileStep2Field';
import ProfileStep3Location from './ProfileStep3Location';

export type RoleOption = '교사' | '강사' | '업체' | '기타';

export const ROLE_OPTIONS: RoleOption[] = ['교사', '강사', '업체', '기타'];

export type TeacherLevel = '유치원' | '초등' | '중등' | '특수';
export type SpecialEducationType = '초등특수' | '중등특수';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userId?: string | null;
  onComplete?: () => void;
  mode?: 'create' | 'edit';
}

export default function ProfileSetupModal({
  isOpen,
  onClose,
  userEmail,
  userId,
  onComplete,
  mode = 'create'
}: ProfileSetupModalProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [currentStep, setCurrentStep] = useState(0);
  const [showInitialModal, setShowInitialModal] = useState(true);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [existingProfileImageUrl, setExistingProfileImageUrl] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [teacherLevel, setTeacherLevel] = useState<TeacherLevel | null>(null);
  const [specialEducationType, setSpecialEducationType] = useState<SpecialEducationType | null>(null);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [instructorFields, setInstructorFields] = useState<string[]>([]);
  const [instructorCustomField, setInstructorCustomField] = useState('');
  const [interestRegions, setInterestRegions] = useState<string[]>([]);
  const [capableSubjects, setCapableSubjects] = useState<string[]>([]);
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);
  const [introduction, setIntroduction] = useState('');
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    
    if (mode === 'create') {
      setCurrentStep(0);
      setShowInitialModal(true);
      setName('');
      setPhone('');
      setProfileImage(null);
      setExistingProfileImageUrl(null);
      setRoles([]);
      setTeacherLevel(null);
      setSpecialEducationType(null);
      setTeacherSubjects([]);
      setInstructorFields([]);
      setInstructorCustomField('');
      setInterestRegions([]);
      setCapableSubjects([]);
      setIntroduction('');
      setReceiveNotifications(true);
      setAgreeTerms(false);
      setAgreePrivacy(false);
      setAgreeMarketing(false);
    } else if (mode === 'edit' && userId) {
      // Load existing profile data
      void fetchUserProfile(userId).then(({ data }) => {
        if (data) {
          setCurrentStep(1);
          setShowInitialModal(false);
          setName(data.display_name || '');
          setPhone(data.phone || '');
          setRoles((data.roles as RoleOption[]) || []);
          setInterestRegions(data.interest_regions || []);
          setCapableSubjects(data.capable_subjects || []);
          setIntroduction(data.intro || '');
          setReceiveNotifications(data.receive_notifications ?? true);
          setAgreeTerms(data.agree_terms ?? false);
          setAgreePrivacy(data.agree_privacy ?? false);
          setAgreeMarketing(data.agree_marketing ?? false);
          // Load new fields
          setTeacherLevel(data.teacher_level as TeacherLevel || null);
          setSpecialEducationType(data.special_education_type as SpecialEducationType || null);
          setInstructorFields(data.instructor_fields || []);
          setInstructorCustomField(data.instructor_custom_field || '');
          setExistingProfileImageUrl(data.profile_image_url || null);
          // Note: profileImage state is for File objects, not URLs
          // URL loading will be handled separately if needed
        }
      });
    }
    
    setSubmitStatus('idle');
    setSubmitError(null);
  }, [isOpen, mode, userId]);

  useEffect(() => {
    if (!roles.includes('교사')) {
      setTeacherLevel(null);
      setSpecialEducationType(null);
      setTeacherSubjects([]);
      setCapableSubjects([]);
    }

    if (!roles.includes('강사')) {
      setInstructorFields([]);
      setInstructorCustomField('');
    }
  }, [roles]);

  const profileImagePublicUrl = useMemo(() => {
    if (!existingProfileImageUrl) return null;
    const { data } = supabase.storage.from('profiles').getPublicUrl(existingProfileImageUrl);
    return data?.publicUrl ?? null;
  }, [existingProfileImageUrl]);

  const handleProfileImageChange = (file: File | null) => {
    setProfileImage(file);
    if (!file) {
      setExistingProfileImageUrl(null);
    }
  };

  const canSubmit =
    Boolean(name.trim()) &&
    roles.length > 0 &&
    interestRegions.length > 0 &&
    agreeTerms &&
    agreePrivacy &&
    !!userId;
  

  const handleSubmit = async () => {
    if (currentStep !== 3) {
      return;
    }

    if (!canSubmit || !userId) {
      return;
    }

    setSubmitStatus('loading');
    setSubmitError(null);

    let profileImageUrl: string | null = existingProfileImageUrl;

    // Upload profile image if exists
    if (profileImage) {
      try {
        const fileExt = profileImage.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}.${fileExt}`;
        const filePath = `profile-images/${fileName}`;


        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('profiles')
          .upload(filePath, profileImage, { upsert: true });

        if (uploadError) {
          // Continue without image - don't fail the whole process
        } else {
          profileImageUrl = filePath;
          setExistingProfileImageUrl(filePath);
        }
      } catch (uploadError) {
        // Continue without image
      }
    }
    
    const { error, data: savedData } = await upsertUserProfile(userId, {
      displayName: name.trim(),
      phone: phone.trim() || undefined,
      roles,
      interestRegions,
      capableSubjects: capableSubjects.length > 0 ? capableSubjects : undefined,
      intro: introduction.trim() || undefined,
      receiveNotifications,
      agreeTerms,
      agreePrivacy,
      agreeMarketing,
      teacherLevel: teacherLevel || undefined,
      specialEducationType: specialEducationType || undefined,
      instructorFields: instructorFields.length > 0 ? instructorFields : undefined,
      instructorCustomField: instructorCustomField.trim() || undefined,
      profileImageUrl: profileImageUrl ?? null
    });


    if (error) {
      setSubmitStatus('error');
      setSubmitError(error.message);
      return;
    }

    if (savedData?.profile_image_url ?? profileImageUrl) {
      setExistingProfileImageUrl(savedData?.profile_image_url ?? profileImageUrl ?? null);
    } else {
      setExistingProfileImageUrl(null);
    }
    setProfileImage(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (accessToken) {
        await supabase.functions.invoke('profile-recommendations', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });
      }
    } catch (invokeError) {
      console.error('추천 생성 호출 중 오류:', invokeError);
    }

    sessionStorage.removeItem('profileSetupPending');
    setSubmitStatus('success');
    // Only show toast for new profile (not edit mode)
    if (mode === 'create') {
      showToast('가입완료 되었습니다', 'success');
    }
    onComplete?.();
    onClose();
    setCurrentStep(1);
  };

  const stepTitles = ['기본 정보', '역할 & 분야', '지역 & 선호도'];
  const totalSteps = 3;

  const getCanProceedToNext = () => {
    switch (currentStep) {
      case 1:
        return Boolean(name.trim());
      case 2:
        return roles.length > 0;
      case 3:
        return false;
      default:
        return false;
    }
  };

  const canProceedToNext = getCanProceedToNext();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {showInitialModal && currentStep === 0 && (
            <motion.div
              className="fixed inset-0 z-[999] flex items-center justify-center bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            >
              <motion.div
                className="relative w-full max-w-md mx-4 rounded-3xl bg-white shadow-2xl font-esamanru p-8"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={onClose}
                  className="absolute top-6 right-6 inline-flex h-8 w-8 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="닫기"
                >
                  <IconX size={18} />
                </button>

                <div className="space-y-6 text-center">
                  <div className="space-y-3">
                    <h2 className="text-2xl font-extrabold text-gray-900">
                      선생님, 조금만 시간내서 작성해주시면 가장 빠르고 정확한 AI 추천을 해드릴게요. 부탁드려요
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setShowInitialModal(false);
                      setCurrentStep(1);
                    }}
                    className="w-full h-12 rounded-xl bg-[#4b83c6] text-white font-semibold hover:bg-[#3d73b4] transition-colors"
                  >
                    시작하기
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {!showInitialModal && currentStep > 0 && (
            <motion.div
              className="fixed inset-0 z-[998] flex items-center justify-center bg-black/45 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
            >
              <motion.div
                className="relative w-full max-w-2xl mx-4 rounded-3xl bg-white shadow-2xl font-esamanru"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                onClick={(event) => event.stopPropagation()}
              >
                <header className="flex items-start justify-between px-8 pt-8 pb-4 border-b border-gray-100">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-[#7aa3cc] text-xs font-semibold tracking-wide uppercase">
                      <span>셀미바이미</span>
                      <span className="px-2 py-0.5 rounded-full bg-[#e6f0fb] text-[#4b83c6]">
                        Step {currentStep} / {stepTitles[currentStep - 1]}
                      </span>
                    </div>
                    <h2 className="text-2xl font-extrabold text-gray-900">{stepTitles[currentStep - 1]}</h2>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                    aria-label="닫기"
                  >
                    <IconX size={18} />
                  </button>
                </header>

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                  }}
                  className="px-8 pb-8 pt-6 max-h-[80vh] overflow-y-auto"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.ctrlKey === false && e.target instanceof HTMLTextAreaElement) {
                      e.preventDefault();
                    }
                  }}
                >
                  <section className="space-y-6">
                    {submitError && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                        저장에 실패했습니다: {submitError}
                      </div>
                    )}

                    {currentStep === 1 && (
                      <ProfileStep1Basic
                        displayName={name}
                        email={userEmail ?? null}
                        phone={phone}
                        profileImage={profileImage}
                        initialImageUrl={profileImagePublicUrl}
                        onNameChange={setName}
                        onPhoneChange={setPhone}
                        onImageChange={handleProfileImageChange}
                        isEditMode={false}
                      />
                    )}

                    {currentStep === 2 && (
                      <div className="space-y-6">
                        <ProfileStep1Role roles={roles} onRolesChange={setRoles} />
                        <ProfileStep2Field
                          roles={roles}
                          teacherLevel={teacherLevel}
                          specialEducationType={specialEducationType}
                          teacherSubjects={teacherSubjects}
                          instructorFields={instructorFields}
                          instructorCustomField={instructorCustomField}
                          onTeacherLevelChange={setTeacherLevel}
                          onSpecialEducationTypeChange={setSpecialEducationType}
                          onTeacherSubjectsChange={setTeacherSubjects}
                          onInstructorFieldsChange={setInstructorFields}
                          onInstructorCustomFieldChange={setInstructorCustomField}
                          onSyncCapableSubjects={setCapableSubjects}
                        />
                      </div>
                    )}

                    {currentStep === 3 && (
                      <div className="space-y-6">
                        <ProfileStep3Location
                          roles={roles}
                          selectedRegions={interestRegions}
                          onRegionsChange={setInterestRegions}
                          introduction={introduction}
                          onIntroductionChange={setIntroduction}
                        />

                        <div className="space-y-4 border-t border-gray-100 pt-6">
                          <div className="flex flex-col gap-3">
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={agreeTerms}
                                onChange={(event) => setAgreeTerms(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#7aa3cc] focus:ring-[#7aa3cc]"
                              />
                              <span className="flex-1">이용약관에 동의합니다 (필수)</span>
                              <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#7aa3cc]">보기</a>
                            </label>
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={agreePrivacy}
                                onChange={(event) => setAgreePrivacy(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#7aa3cc] focus:ring-[#7aa3cc]"
                              />
                              <span className="flex-1">개인정보 수집 및 이용에 동의합니다 (필수)</span>
                              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[#7aa3cc]">보기</a>
                            </label>
                            <label className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={agreeMarketing}
                                onChange={(event) => setAgreeMarketing(event.target.checked)}
                                className="h-4 w-4 rounded border-gray-300 text-[#7aa3cc] focus:ring-[#7aa3cc]"
                              />
                              <span className="flex-1">셀미바이미 소식 및 이벤트 정보를 받아볼게요 (선택)</span>
                            </label>
                          </div>
                        </div>
                      </div>
                    )}

                    <footer className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>단계 {currentStep} / {totalSteps}</span>
                        <div className="flex gap-1">
                          {Array.from({ length: totalSteps }).map((_, idx) => (
                            <div
                              key={idx}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                idx < currentStep ? 'bg-[#7aa3cc]' : 'bg-gray-200'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                        <button
                          type="button"
                          onClick={currentStep === 1 ? onClose : () => setCurrentStep(currentStep - 1)}
                          className="h-11 rounded-xl border border-gray-300 px-6 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100 flex items-center justify-center gap-2"
                        >
                          {currentStep > 1 && <IconChevronLeft size={16} />}
                          {currentStep === 1 ? '닫기' : '이전 단계'}
                        </button>
                        {currentStep < totalSteps ? (
                          <button
                            type="button"
                            onClick={() => {
                              console.log('[TRACE] 다음 단계 버튼 클릭', { currentStep, canProceedToNext });
                              if (!canProceedToNext) return;
                              console.log('[TRACE] Step 변경 전', { currentStep });
                              setCurrentStep(currentStep + 1);
                              console.log('[TRACE] Step 변경 후', { newStep: currentStep + 1 });
                            }}
                            disabled={!canProceedToNext}
                            className={`h-11 rounded-xl px-6 text-sm font-semibold transition-colors flex items-center justify-center gap-2 ${
                              canProceedToNext
                                ? 'bg-[#4b83c6] text-white hover:bg-[#3d73b4]'
                                : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            }`}
                          >
                            다음 단계
                            <IconChevronRight size={16} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={!canSubmit || submitStatus === 'loading'}
                            className={`h-11 rounded-xl px-6 text-sm font-semibold transition-colors ${
                              canSubmit ? 'bg-[#4b83c6] text-white hover:bg-[#3d73b4]' : 'bg-gray-300 text-gray-600 cursor-not-allowed'
                            }`}
                          >
                            {submitStatus === 'loading' ? '저장 중...' : '등록 완료'}
                          </button>
                        )}
                      </div>
                    </footer>
                  </section>
                </form>
              </motion.div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
  );
}
