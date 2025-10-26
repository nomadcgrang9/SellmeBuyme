'use client';

import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  IconAlertCircle,
  IconMapPin,
  IconSparkles,
  IconUser,
  IconX
} from '@tabler/icons-react';
import { fetchUserProfile, type UserProfileRow } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface ProfileViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null | undefined;
  userEmail: string | null | undefined;
  onRequestEdit?: (profile: UserProfileRow | null) => void;
}

type LoadState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export default function ProfileViewModal({ isOpen, onClose, userId, userEmail, onRequestEdit }: ProfileViewModalProps) {
  const logout = useAuthStore((state) => state.logout);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [profile, setProfile] = useState<UserProfileRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    if (!isOpen) {
      return () => {
        isMounted = false;
      };
    }

    if (!userId) {
      setProfile(null);
      setError('로그인 세션이 만료되었습니다. 다시 로그인해 주세요.');
      setLoadState('error');
      return () => {
        isMounted = false;
      };
    }

    setLoadState('loading');
    setError(null);

    void fetchUserProfile(userId).then(({ data, error: fetchError }) => {
      if (!isMounted) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoadState('error');
        return;
      }

      if (!data) {
        setProfile(null);
        setLoadState('empty');
        return;
      }

      setProfile(data);
      setLoadState('success');
    });

    return () => {
      isMounted = false;
    };
  }, [isOpen, userId]);

  const roleList = useMemo(() => {
    if (!profile?.roles?.length) return [] as string[];
    return profile.roles.filter(Boolean);
  }, [profile?.roles]);

  const interestRegions = useMemo(() => {
    if (!profile?.interest_regions?.length) return [] as string[];
    return profile.interest_regions.filter(Boolean);
  }, [profile?.interest_regions]);

  const experienceLabel = useMemo(() => {
    if (profile?.experience_years === null || profile?.experience_years === undefined) {
      return '입력 안 함';
    }
    return `${profile.experience_years}년`;
  }, [profile?.experience_years]);

  const handleLogout = async () => {
    if (loggingOut) return;
    try {
      setLoggingOut(true);
      await logout();
      onClose();
    } finally {
      setLoggingOut(false);
    }
  };

  // ⭐ 관리자 페이지 이동 핸들러
  const handleAdminLogin = () => {
    // 방식 B: 고정 진입점 사용 (/admin-portal)
    // Cloudflare Function이 인증 후 실제 관리자 경로로 리다이렉트
    window.location.href = '/admin-portal';
  };

  const isAdmin = profile?.roles?.includes('admin');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-lg mx-4 rounded-3xl bg-white shadow-2xl font-esamanru"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#7aa3cc] uppercase tracking-wide">내 프로필</p>
                <h2 className="text-2xl font-extrabold text-gray-900">{profile?.display_name ?? '회원 정보'}</h2>
                <p className="text-xs text-gray-500">가입 이메일: {userEmail ?? '알 수 없음'}</p>
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

            <div className="px-7 py-6 space-y-6 max-h-[70vh] overflow-y-auto">
              {loadState === 'loading' && (
                <div className="flex flex-col items-center justify-center gap-3 py-10 text-sm text-gray-500">
                  <span className="animate-spin text-2xl">⏳</span>
                  <span>프로필 정보를 불러오는 중입니다...</span>
                </div>
              )}

              {loadState === 'error' && error && (
                <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  <IconAlertCircle size={18} />
                  <div>
                    <p className="font-semibold">프로필을 불러오지 못했습니다.</p>
                    <p className="mt-1 text-xs text-red-600/80">{error}</p>
                  </div>
                </div>
              )}

              {loadState === 'empty' && (
                <div className="rounded-2xl border border-dashed border-[#7aa3cc]/40 bg-[#eef5fb] px-5 py-6 text-center text-sm text-gray-600">
                  아직 프로필 정보가 없습니다. 프로필을 먼저 완성해 주세요.
                </div>
              )}

              {loadState === 'success' && profile && (
                <div className="space-y-6">
                  <section className="rounded-2xl border border-gray-100 bg-[#f8fbff] px-5 py-5">
                    <div className="flex items-start gap-3">
                      {profile.profile_image_url ? (
                        <div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-white shadow-lg">
                          <img
                            src={supabase.storage.from('profiles').getPublicUrl(profile.profile_image_url).data.publicUrl}
                            alt="프로필 사진"
                            className="h-full w-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="mt-1 rounded-full bg-white p-2 text-[#4b83c6]"><IconUser size={18} /></div>
                      )}
                      <div className="space-y-1 text-sm text-gray-700">
                        <p className="text-xs font-semibold text-[#7aa3cc]">기본 정보</p>
                        <p className="text-base font-bold text-gray-900">{profile.display_name}</p>
                        <p>{userEmail ?? '이메일 정보 없음'}</p>
                        <p className="text-xs text-gray-400">가입: {new Date(profile.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-100 bg-white px-5 py-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <IconSparkles size={18} className="text-[#7aa3cc]" />
                      <h3 className="text-sm font-bold text-gray-900">역할 & 활동 정보</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {roleList.length > 0 ? (
                        roleList.map((role) => (
                          <span key={role} className="rounded-full bg-[#eef3fb] px-3 py-1 text-xs font-semibold text-[#4b83c6]">
                            {role}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">역할 정보가 없습니다.</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-gray-500">경력 연차</span>
                      <p className="text-sm text-gray-800">{experienceLabel}</p>
                    </div>
                    {profile.roles?.includes('교사') && profile.teacher_level && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-gray-500">교사 역할</span>
                        <p className="text-sm text-gray-800">{profile.teacher_level}</p>
                        {profile.special_education_type && (
                          <p className="text-xs text-gray-600">({profile.special_education_type})</p>
                        )}
                      </div>
                    )}
                    {profile.roles?.includes('강사') && (profile.instructor_fields?.length || profile.instructor_custom_field) && (
                      <div className="space-y-1">
                        <span className="text-xs font-semibold text-gray-500">강사 분야</span>
                        <div className="flex flex-wrap gap-1">
                          {profile.instructor_fields?.map((field) => (
                            <span key={field} className="rounded-full bg-[#eef3fb] px-2 py-1 text-xs font-semibold text-[#4b83c6]">
                              {field}
                            </span>
                          ))}
                          {profile.instructor_custom_field && (
                            <span className="rounded-full bg-[#eef3fb] px-2 py-1 text-xs font-semibold text-[#4b83c6]">
                              {profile.instructor_custom_field}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-gray-500">관심 지역</span>
                      {interestRegions.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {interestRegions.map((region) => (
                            <span key={region} className="rounded-full bg-[#f0f6fa] px-3 py-1 text-xs font-semibold text-[#4b83c6]">
                              {region}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-500">관심 지역을 아직 추가하지 않았습니다.</p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <span className="text-xs font-semibold text-gray-500">한 줄 소개</span>
                      <p className="rounded-xl border border-gray-200 bg-[#fdfefe] px-4 py-3 text-sm text-gray-700">
                        {profile.intro ? profile.intro : '아직 소개가 등록되지 않았습니다.'}
                      </p>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-100 bg-white px-5 py-4 text-xs text-gray-500 space-y-2">
                    <p className="font-semibold text-gray-600">알림 수신 여부</p>
                    <p className="text-sm text-gray-700">
                      {profile.receive_notifications ? '서비스 알림을 받는 중입니다.' : '서비스 알림을 받고 있지 않습니다.'}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[11px] text-gray-500">
                      <span className={`rounded-full px-2.5 py-1 border ${profile.agree_terms ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        이용약관 동의 {profile.agree_terms ? '완료' : '미동의'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 border ${profile.agree_privacy ? 'border-emerald-300 bg-emerald-50 text-emerald-600' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        개인정보 처리방침 동의 {profile.agree_privacy ? '완료' : '미동의'}
                      </span>
                      <span className={`rounded-full px-2.5 py-1 border ${profile.agree_marketing ? 'border-blue-200 bg-blue-50 text-blue-600' : 'border-gray-200 bg-gray-50 text-gray-500'}`}>
                        마케팅 정보 수신 {profile.agree_marketing ? '동의' : '거부'}
                      </span>
                    </div>
                  </section>
                </div>
              )}
            </div>

            <footer className="flex items-center justify-end gap-2 px-7 py-5 border-t border-gray-100 bg-[#f9fbfe]">
                {/* ⭐ 관리자만 표시되는 버튼 */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={handleAdminLogin}
                    className="inline-flex items-center gap-2 rounded-xl border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
                    aria-label="관리자 페이지로 이동"
                  >
                    관리자 로그인
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRequestEdit?.(profile)}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#4b83c6] px-4 py-2 text-sm font-semibold text-[#4b83c6] transition-colors hover:bg-[#e7f1fb]"
                >
                  프로필 수정
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#4b83c6] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#3d73b4] disabled:opacity-60"
                >
                  {loggingOut ? '로그아웃 중...' : '로그아웃'}
                </button>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
