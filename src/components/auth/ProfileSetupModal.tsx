'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IconX, IconPlus, IconAlertCircle } from '@tabler/icons-react';
import { REGION_OPTIONS } from '@/lib/constants/filters';
import { upsertUserProfile } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import { useToastStore } from '@/stores/toastStore';

type RoleOption = '교사' | '강사' | '업체' | '학부모' | '학생' | '기타';

const ROLE_OPTIONS: RoleOption[] = ['교사', '강사', '업체', '학부모', '학생', '기타'];
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
}

export default function ProfileSetupModal({ isOpen, onClose, userEmail, userId, onComplete }: ProfileSetupModalProps) {
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
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  const canSubmit = Boolean(name.trim()) && roles.length > 0 && agreeTerms && agreePrivacy && !!userId;

  const submitLabel = !userId
    ? '로그인 정보가 필요합니다'
    : !name.trim()
      ? '이름을 입력해 주세요'
      : roles.length === 0
        ? '역할을 선택해 주세요'
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
    showToast('가입완료 되었습니다', 'success');
    onComplete?.();
    onClose();
  };

  const submitButtonLabel = submitStatus === 'loading' ? '저장 중...' : submitLabel;

  const selectedSummary = useMemo(
    () => [...roles, ...interestRegions.slice(0, 2)].join(' · '),
    [roles, interestRegions]
  );

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
                  <span className="px-2 py-0.5 rounded-full bg-[#e6f0fb] text-[#4b83c6]">Step 1 / 기본정보</span>
                </div>
                <h2 className="text-2xl font-extrabold text-gray-900">프로필 정보를 완성해 주세요</h2>
                <p className="text-sm text-gray-500">{userEmail ?? '소셜 계정'} 인증이 완료되었습니다. 맞춤 추천을 위해 아래 정보를 입력해 주세요.</p>
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

                    <div className="space-y-3">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-semibold text-gray-600">관심 지역</span>
                        <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                          <input
                            type="text"
                            value={interestInput}
                            onChange={(event) => setInterestInput(event.target.value)}
                            onKeyDown={handleInterestKeyDown}
                            placeholder="예: 경기도/수원"
                            className="flex-1 bg-transparent text-sm outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleInterestAdd}
                            disabled={!interestInput.trim() || interestRegions.length >= MAX_INTEREST_REGIONS}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-white transition-colors ${
                              interestInput.trim() && interestRegions.length < MAX_INTEREST_REGIONS
                                ? 'bg-[#7aa3cc] hover:bg-[#6b95be]'
                                : 'bg-gray-300 cursor-not-allowed'
                            }`}
                            aria-label="관심 지역 추가"
                          >
                            <IconPlus size={18} />
                          </button>
                        </div>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {interestRegions.map((region) => (
                          <span
                            key={region}
                            className="inline-flex items-center gap-2 rounded-full bg-[#f0f6fa] px-3 py-1.5 text-xs font-semibold text-[#4b83c6]"
                          >
                            {region}
                            <button
                              type="button"
                              onClick={() => handleInterestRemove(region)}
                              className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-[#4b83c6] hover:bg-[#e2edf6]"
                              aria-label={`관심 지역 ${region} 제거`}
                            >
                              <IconX size={14} />
                            </button>
                          </span>
                        ))}
                        {interestRegions.length === 0 && (
                          <span className="text-xs text-gray-400">입력 후 Enter를 누르거나 추가 버튼을 눌러주세요.</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400">{interestRegions.length} / {MAX_INTEREST_REGIONS}개 입력</div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white px-5 py-5">
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-semibold text-[#7aa3cc]">추가 정보</span>
                      <h3 className="text-lg font-bold text-gray-900">경력과 소개를 알려주세요</h3>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="space-y-2">
                        <span className="text-xs font-semibold text-gray-600">주요 경력 연차</span>
                        <select
                          value={experienceYears ?? ''}
                          onChange={(event) => {
                            const value = event.target.value;
                            setExperienceYears(value === '' ? null : Number(value));
                          }}
                          className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
                        >
                          <option value="">선택 안 함</option>
                          {experienceOptions.map((year) => (
                            <option key={year} value={year}>
                              {year}년
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
                    </div>

                    <label className="space-y-2">
                      <span className="text-xs font-semibold text-gray-600">한 줄 소개 (선택)</span>
                      <textarea
                        value={intro}
                        onChange={(event) => setIntro(event.target.value)}
                        maxLength={150}
                        placeholder="예: 초등 코딩 방과후 수업을 6년째 운영 중입니다. AI 융합 프로젝트 수업을 좋아해요!"
                        className="min-h-[96px] w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-[#7aa3cc] focus:ring-2 focus:ring-[#cfe0f3]"
                      />
                      <span className="block text-right text-[11px] text-gray-400">{intro.length}/150자</span>
                    </label>
                  </div>

                  <div className="space-y-3 rounded-2xl border border-gray-100 bg-white px-5 py-5">
                    <h3 className="text-lg font-bold text-gray-900">약관 동의</h3>
                    <div className="space-y-2 text-sm text-gray-600">
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
                      이전 단계로 돌아가기
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
