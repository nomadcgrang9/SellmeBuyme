'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconX, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { REGION_OPTIONS } from '@/lib/constants/filters';
import { upsertUserProfile } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import { useToastStore } from '@/stores/toastStore';

export type RoleOption = '교사' | '강사' | '업체' | '학부모' | '학생' | '기타';

export const ROLE_OPTIONS: RoleOption[] = ['교사', '강사', '업체', '학부모', '학생', '기타'];
const MAX_INTEREST_REGIONS = 5;
const EXPERIENCE_LIMIT = 30;

export type ProfileSetupFormData = {
  name: string;
  email: string | null;
  roles: RoleOption[];
  primaryRegion: string;
  interestRegions: string[];
  experienceYears: number | null;
  receiveNotifications: boolean;
  intro: string;
  agreeTerms: boolean;
  agreePrivacy: boolean;
  agreeMarketing: boolean;
};

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
  userId?: string | null;
  onComplete?: () => void;
  mode?: 'create' | 'edit';
  initialData?: {
    displayName: string | null;
    roles: RoleOption[] | null;
    primaryRegion: string | null;
    interestRegions: string[] | null;
    experienceYears: number | null;
    receiveNotifications: boolean | null;
    intro: string | null;
    agreeTerms: boolean | null;
    agreePrivacy: boolean | null;
    agreeMarketing: boolean | null;
  };
}

export default function ProfileSetupModal({
  isOpen,
  onClose,
  userEmail,
  userId,
  onComplete,
  mode = 'create',
  initialData
}: ProfileSetupModalProps) {
  const showToast = useToastStore((state) => state.showToast);
  const [name, setName] = useState('');
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [primaryRegion, setPrimaryRegion] = useState('');
  const [interestRegions, setInterestRegions] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [experienceYears, setExperienceYears] = useState<number | null>(null);
  const [receiveNotifications, setReceiveNotifications] = useState(true);
  const [intro, setIntro] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [agreeMarketing, setAgreeMarketing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (mode === 'edit' && initialData) {
      setName(initialData.displayName ?? '');
      setRoles(initialData.roles ?? []);
      setPrimaryRegion(initialData.primaryRegion ?? '');
      setInterestRegions(initialData.interestRegions ?? []);
      setExperienceYears(initialData.experienceYears ?? null);
      setReceiveNotifications(initialData.receiveNotifications ?? true);
      setIntro(initialData.intro ?? '');
      setAgreeTerms(initialData.agreeTerms ?? false);
      setAgreePrivacy(initialData.agreePrivacy ?? false);
      setAgreeMarketing(initialData.agreeMarketing ?? false);
    }

    if (mode === 'create') {
      setName('');
      setRoles([]);
      setPrimaryRegion('');
      setInterestRegions([]);
      setExperienceYears(null);
      setReceiveNotifications(true);
      setIntro('');
      setAgreeTerms(false);
      setAgreePrivacy(false);
      setAgreeMarketing(false);
    }
  }, [isOpen, mode, initialData]);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSubmitStatus('idle');
    setSubmitError(null);
  }, [isOpen, mode, initialData]);

  const experienceOptions = useMemo(() => Array.from({ length: EXPERIENCE_LIMIT + 1 }, (_, index) => index), []);

  const handleToggleRole = (role: RoleOption) => {
    setRoles((prev) => (prev.includes(role) ? prev.filter((item) => item !== role) : [...prev, role]));
  };

  const handleInterestAdd = () => {
    const value = interestInput.trim();
    if (!value) return;
    if (interestRegions.length >= MAX_INTEREST_REGIONS) return;
    if (interestRegions.some((region) => region === value)) return;
    setInterestRegions((prev) => [...prev, value]);
    setInterestInput('');
  };

  const handleInterestRemove = (value: string) => {
    setInterestRegions((prev) => prev.filter((region) => region !== value));
  };

  const handleInterestKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleInterestAdd();
    }
  };

  const canSubmit =
    Boolean(name.trim()) &&
    roles.length > 0 &&
    (mode === 'edit' || (agreeTerms && agreePrivacy)) &&
    !!userId;

  const submitLabel = !userId
    ? '로그인 정보가 필요합니다'
    : !name.trim()
      ? '이름을 입력해 주세요'
      : roles.length === 0
        ? '역할을 선택해 주세요'
        : mode === 'edit'
          ? '변경 사항 저장'
          : !agreeTerms || !agreePrivacy
          ? '필수 약관에 동의해 주세요'
          : '등록 완료';

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || !userId) return;

    setSubmitStatus('loading');
    setSubmitError(null);

    const payload: ProfileSetupFormData = {
      name: name.trim(),
      email: userEmail ?? null,
      roles,
      primaryRegion,
      interestRegions,
      experienceYears,
      receiveNotifications,
      intro: intro.trim(),
      agreeTerms,
      agreePrivacy,
      agreeMarketing
    };

    const { error } = await upsertUserProfile(userId, {
      displayName: payload.name,
      roles: payload.roles,
      primaryRegion: payload.primaryRegion || null,
      interestRegions: payload.interestRegions,
      experienceYears: payload.experienceYears,
      receiveNotifications: payload.receiveNotifications,
      intro: payload.intro,
      agreeTerms: payload.agreeTerms,
      agreePrivacy: payload.agreePrivacy,
      agreeMarketing: payload.agreeMarketing
    });

    if (error) {
      setSubmitStatus('error');
      setSubmitError(error.message);
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;

      if (accessToken) {
        const { error: recommendError } = await supabase.functions.invoke('profile-recommendations', {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        });

        if (recommendError) {
          console.error('추천 생성 함수 호출 실패:', recommendError);
        }
      }
    } catch (invokeError) {
      console.error('추천 생성 호출 중 오류:', invokeError);
    }

    sessionStorage.removeItem('profileSetupPending');
    setSubmitStatus('success');
    showToast(mode === 'edit' ? '프로필이 업데이트되었습니다' : '가입완료 되었습니다', 'success');
    onComplete?.();
    onClose();
  };

  const submitButtonLabel = submitStatus === 'loading' ? '저장 중...' : submitLabel;

  const selectedSummary = useMemo(
    () => [...roles, ...interestRegions.slice(0, 2)].join(' · '),
    [roles, interestRegions]
  );

  const isEditMode = mode === 'edit';
  const headerBadge = isEditMode ? '프로필 수정' : 'Step 1 / 기본정보';
  const headerTitle = isEditMode ? '프로필 정보를 수정해 주세요' : '프로필 정보를 완성해 주세요';
  const headerDescription = isEditMode
    ? '필요한 항목만 업데이트할 수 있어요.'
    : `${userEmail ?? '소셜 계정'} 인증이 완료되었습니다. 맞춤 추천을 위해 아래 정보를 입력해 주세요.`;
  const cancelLabel = isEditMode ? '취소' : '이전 단계로 돌아가기';

  return (
    <AnimatePresence>
      {isOpen && (
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
                  <span>셀바바이미</span>
                  <span className="px-2 py-0.5 rounded-full bg-[#e6f0fb] text-[#4b83c6]">{headerBadge}</span>
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">{headerTitle}</h2>
                <p className="text-sm text-gray-500">{headerDescription}</p>
              </div>
              <div className="flex items-center gap-3">
                {selectedSummary && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f1f5fb] text-xs text-[#4b83c6] font-semibold">
                    <IconAlertCircle size={16} />
                    <span>{selectedSummary}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                  aria-label="닫기"
                >
                  <IconX size={18} />
                </button>
              </div>
            </header>

            <form onSubmit={handleSubmit} className="px-8 pb-8 pt-6 max-h-[80vh] overflow-y-auto">
              <section className="space-y-6">
                {submitStatus === 'error' && submitError && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                    저장에 실패했습니다: {submitError}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#f8fbff] px-5 py-5">
                    <div>
                      <span className="text-xs font-semibold text-[#4b83c6]">기본 정보</span>
                      <h3 className="mt-1 text-lg font-bold text-gray-900">어떻게 불러드리면 될까요?</h3>
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold text-gray-600">이름</span>
                      <input
                        type="text"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        disabled={isEditMode}
                        readOnly={isEditMode}
                        placeholder="홍길동"
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
                      />
                    </label>
                    <div className="grid gap-2 text-sm text-gray-600">
                      <span className="font-semibold text-gray-700">연동된 소셜 계정</span>
                      <div className="flex items-center justify-between rounded-xl border border-dashed border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700">
                        <span>{userEmail ?? '이메일 정보 없음'}</span>
                        <span className="text-xs text-gray-400">변경은 계정 설정에서 가능합니다</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-[0_6px_20px_rgba(15,97,153,0.06)]">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#7aa3cc]">역할 선택</span>
                      <h3 className="text-lg font-bold text-gray-900">어떤 형태로 활동 중인가요?</h3>
                      <p className="text-xs text-gray-500">여러 역할을 함께 선택하면 AI 매칭이 더 정확해집니다.</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ROLE_OPTIONS.map((role) => {
                        const isActive = roles.includes(role);
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => handleToggleRole(role)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                              isActive
                                ? 'bg-[#7aa3cc] text-white shadow-sm'
                                : 'border border-gray-200 text-gray-600 hover:border-[#7aa3cc]' }
                            `}
                          >
                            {role}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#7aa3cc]">활동 지역</span>
                      <h3 className="text-lg font-bold text-gray-900">활동하는 지역을 알려주세요</h3>
                      <p className="text-xs text-gray-500">주요 지역 1곳과 관심 지역을 최대 {MAX_INTEREST_REGIONS}개까지 입력할 수 있습니다.</p>
                    </div>
                    <label className="space-y-2">
                      <span className="text-xs font-semibold text-gray-600">주 활동 지역</span>
                      <select
                        value={primaryRegion}
                        onChange={(event) => setPrimaryRegion(event.target.value)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
                      >
                        <option value="">선택해 주세요</option>
                        {REGION_OPTIONS.map((region) => (
                          <option key={region} value={region}>
                            {region}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-gray-600">서비스 알림 수신</span>
                        <span className="text-xs text-gray-400">새 공고와 추천을 이메일로 받아보세요</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReceiveNotifications((prev) => !prev)}
                        disabled={isEditMode}
                        className={`relative h-7 w-12 rounded-full transition-colors ${
                          receiveNotifications ? 'bg-[#7aa3cc]' : 'bg-gray-300'
                        }`}
                        aria-pressed={receiveNotifications}
                      >
                        <span
                          className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                            receiveNotifications ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </label>

                    <div className="flex flex-col gap-3">
                      <label className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={agreeTerms}
                          onChange={(event) => setAgreeTerms(event.target.checked)}
                          disabled={isEditMode}
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
                          disabled={isEditMode}
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

                <footer className="flex flex-col gap-3 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>입력하신 정보는 맞춤 추천과 통계 목적으로만 사용됩니다.</span>
                    <span className="text-[#7aa3cc] font-semibold">AI 추천 활성화까지 1분 이내</span>
                  </div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={onClose}
                      className="h-11 rounded-xl border border-gray-300 px-6 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100"
                    >
                      {cancelLabel}
                    </button>
                    <button
                      type="submit"
                      disabled={!canSubmit || submitStatus === 'loading'}
                      className={`w-full rounded-xl px-5 py-3 text-sm font-semibold text-white transition-colors ${
                        canSubmit ? 'bg-[#4b83c6] hover:bg-[#3d73b4]' : 'bg-gray-300 cursor-not-allowed'
                      }`}
                    >
                      {submitButtonLabel}
                    </button>
                  </div>
                </footer>
              </section>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
