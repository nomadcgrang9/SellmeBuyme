'use client';

import { useEffect, useMemo, useState } from 'react';
import { X, AlertCircle, Bell, Sparkles, User as UserIcon } from 'lucide-react';
import { fetchUserProfile, type UserProfileRow } from '@/lib/supabase/profiles';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface MobileProfilePageProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string | null | undefined;
  userEmail: string | null | undefined;
  onRequestEdit?: (profile: UserProfileRow | null) => void;
}

type LoadState = 'idle' | 'loading' | 'success' | 'empty' | 'error';

export default function MobileProfilePage({
  isOpen,
  onClose,
  userId,
  userEmail,
  onRequestEdit
}: MobileProfilePageProps) {
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

  const handleAdminLogin = () => {
    window.location.href = '/admin-portal';
  };

  const isAdmin = profile?.roles?.includes('admin');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white md:hidden flex flex-col animate-slide-in-right">
      {/* 상단 네비 - 고정 */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">내 프로필</h1>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <X size={24} />
        </button>
      </header>

      {/* 스크롤 가능한 콘텐츠 영역 */}
      <div className="flex-1 overflow-y-auto pb-20">
        <div className="px-4 py-6 space-y-4">
          {loadState === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-gray-500">
              <span className="animate-spin text-3xl">⏳</span>
              <span>프로필 정보를 불러오는 중입니다...</span>
            </div>
          )}

          {loadState === 'error' && error && (
            <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
              <AlertCircle size={20} className="flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">프로필을 불러오지 못했습니다.</p>
                <p className="mt-1 text-xs text-red-600/80">{error}</p>
              </div>
            </div>
          )}

          {loadState === 'empty' && (
            <div className="rounded-2xl border border-dashed border-[#7aa3cc]/40 bg-[#eef5fb] px-5 py-8 text-center text-sm text-gray-600">
              아직 프로필 정보가 없습니다. 프로필을 먼저 완성해 주세요.
            </div>
          )}

          {loadState === 'success' && profile && (
            <div className="space-y-4">
              {/* 프로필 헤더 */}
              <section className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-3xl p-6">
                <div className="flex items-start gap-4">
                  {profile.profile_image_url ? (
                    <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-full border-4 border-white shadow-lg">
                      <img
                        src={supabase.storage.from('profiles').getPublicUrl(profile.profile_image_url).data.publicUrl}
                        alt="프로필 사진"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex-shrink-0 rounded-full bg-white p-4 text-[#4b83c6] shadow-lg">
                      <UserIcon size={32} />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xl font-bold text-gray-900">{profile.display_name}</p>
                      {isAdmin && (
                        <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-bold text-purple-700">
                          admin
                        </span>
                      )}
                    </div>
                    {roleList.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {roleList.map((role) => (
                          <span key={role} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#4b83c6] shadow-sm">
                            {role}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-gray-600">{userEmail ?? '이메일 정보 없음'}</p>
                    <p className="text-xs text-gray-500">가입: {new Date(profile.created_at).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}</p>
                  </div>
                </div>
              </section>

              {/* 역할 & 활동 정보 */}
              <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                  <Sparkles size={18} className="text-[#7aa3cc]" />
                  <h3 className="text-base font-bold text-gray-900">역할 & 활동 정보</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-500 block mb-1">경력</span>
                    <p className="text-base text-gray-800">{experienceLabel}</p>
                  </div>

                  {profile.roles?.includes('교사') && profile.teacher_level && (
                    <div>
                      <span className="text-sm font-semibold text-gray-500 block mb-1">교사 역할</span>
                      <p className="text-base text-gray-800">
                        {profile.teacher_level}
                        {profile.special_education_type && (
                          <span className="text-sm text-gray-600"> ({profile.special_education_type})</span>
                        )}
                      </p>
                    </div>
                  )}

                  {profile.roles?.includes('강사') && (profile.instructor_fields?.length || profile.instructor_custom_field) && (
                    <div>
                      <span className="text-sm font-semibold text-gray-500 block mb-2">강사 분야</span>
                      <div className="flex flex-wrap gap-2">
                        {profile.instructor_fields?.map((field) => (
                          <span key={field} className="rounded-full bg-[#eef3fb] px-3 py-1.5 text-sm font-semibold text-[#4b83c6]">
                            {field}
                          </span>
                        ))}
                        {profile.instructor_custom_field && (
                          <span className="rounded-full bg-[#eef3fb] px-3 py-1.5 text-sm font-semibold text-[#4b83c6]">
                            {profile.instructor_custom_field}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-semibold text-gray-500 block mb-2">관심 지역</span>
                    {interestRegions.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {interestRegions.map((region) => (
                          <span key={region} className="rounded-full bg-[#f0f6fa] px-3 py-1.5 text-sm font-semibold text-[#4b83c6]">
                            {region}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">관심 지역을 아직 추가하지 않았습니다.</p>
                    )}
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-gray-500 block mb-1">한 줄 소개</span>
                    <p className="text-base text-gray-700 italic leading-relaxed">
                      {profile.intro ? profile.intro : '아직 소개가 등록되지 않았습니다.'}
                    </p>
                  </div>
                </div>
              </section>

              {/* 알림 & 약관 */}
              <section className="rounded-2xl border border-gray-200 bg-gray-50 p-5 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                  <Bell size={18} className="text-[#7aa3cc]" />
                  <h3 className="text-base font-bold text-gray-700">알림 & 약관</h3>
                </div>

                <div className="space-y-3">
                  <div>
                    <span className="text-sm font-semibold text-gray-500 block mb-1">알림 수신</span>
                    <p className="text-base text-gray-700">
                      {profile.receive_notifications ? '✓ 수신 중' : '✗ 미수신'}
                    </p>
                  </div>

                  <div>
                    <span className="text-sm font-semibold text-gray-500 block mb-2">약관 동의</span>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className={profile.agree_terms ? 'text-emerald-600' : 'text-gray-400'}>
                          {profile.agree_terms ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-700">이용약관</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={profile.agree_privacy ? 'text-emerald-600' : 'text-gray-400'}>
                          {profile.agree_privacy ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-700">개인정보 처리방침</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className={profile.agree_marketing ? 'text-blue-600' : 'text-gray-400'}>
                          {profile.agree_marketing ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-700">마케팅 정보 수신</span>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>
      </div>

      {/* 하단 버튼 영역 - 고정 (하단 네비 위에 표시) */}
      <footer className="flex flex-col gap-2 px-4 py-4 border-t border-gray-200 bg-white flex-shrink-0">
        {isAdmin && (
          <button
            type="button"
            onClick={handleAdminLogin}
            className="w-full rounded-xl border-2 border-purple-600 bg-purple-600 px-4 py-3 text-base font-semibold text-white transition-colors active:bg-purple-700"
            aria-label="관리자 페이지로 이동"
          >
            관리자 로그인
          </button>
        )}
        <button
          type="button"
          onClick={() => onRequestEdit?.(profile)}
          className="w-full rounded-xl border-2 border-[#4b83c6] px-4 py-3 text-base font-semibold text-[#4b83c6] transition-colors active:bg-[#e7f1fb]"
        >
          프로필 수정
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full rounded-xl bg-[#4b83c6] px-4 py-3 text-base font-semibold text-white transition-colors active:bg-[#3d73b4] disabled:opacity-60"
        >
          {loggingOut ? '로그아웃 중...' : '로그아웃'}
        </button>
      </footer>
    </div>
  );
}
