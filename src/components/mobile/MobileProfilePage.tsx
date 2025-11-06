'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, User as UserIcon } from 'lucide-react';
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
      setError('로그인 세션이 만료되었습니다.');
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
      return '미입력';
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
    <div className="fixed inset-0 top-14 bottom-16 z-40 bg-gray-50 md:hidden overflow-y-auto animate-fade-in">
        {loadState === 'loading' && (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-sm text-gray-500">
            <span className="animate-spin text-2xl">⏳</span>
            <span>프로필 정보를 불러오는 중...</span>
          </div>
        )}

        {loadState === 'error' && error && (
          <div className="m-4 p-4 rounded-lg bg-red-50 border border-red-100 text-sm text-red-700">
            {error}
          </div>
        )}

        {loadState === 'empty' && (
          <div className="m-4 p-6 rounded-lg bg-white border border-gray-200 text-center text-sm text-gray-600">
            프로필 정보가 없습니다.
          </div>
        )}

        {loadState === 'success' && profile && (
          <div className="p-4 space-y-3">
            {/* 프로필 카드 */}
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              {/* 프로필 헤더 */}
              <div className="flex items-start gap-3 pb-4 border-b border-gray-100">
                {profile.profile_image_url ? (
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-full border-2 border-gray-200">
                    <img
                      src={supabase.storage.from('profiles').getPublicUrl(profile.profile_image_url).data.publicUrl}
                      alt="프로필"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 rounded-full bg-gray-100 p-3">
                    <UserIcon size={28} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-lg font-bold text-gray-900">{profile.display_name}</p>
                    {isAdmin && (
                      <span className="px-2 py-0.5 rounded text-xs font-semibold bg-purple-50 text-purple-700">
                        admin
                      </span>
                    )}
                  </div>
                  {roleList.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-1">
                      {roleList.map((role) => (
                        <span key={role} className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                          {role}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-gray-500 truncate">{userEmail ?? '이메일 없음'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(profile.created_at).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} 가입
                  </p>
                </div>
              </div>

              {/* 정보 목록 */}
              <div className="pt-3 space-y-2">
                {/* 경력 & 교사 역할 */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="block text-xs text-gray-500 mb-0.5">경력</span>
                    <span className="font-medium text-gray-900">{experienceLabel}</span>
                  </div>
                  {profile.roles?.includes('교사') && profile.teacher_level && (
                    <div>
                      <span className="block text-xs text-gray-500 mb-0.5">교사 역할</span>
                      <span className="font-medium text-gray-900">{profile.teacher_level}</span>
                    </div>
                  )}
                </div>

                {/* 관심 지역 */}
                {interestRegions.length > 0 && (
                  <div className="text-sm">
                    <span className="block text-xs text-gray-500 mb-1">관심 지역</span>
                    <p className="font-medium text-gray-900">{interestRegions.join(' · ')}</p>
                  </div>
                )}

                {/* 강사 분야 */}
                {profile.roles?.includes('강사') && (profile.instructor_fields?.length || profile.instructor_custom_field) && (
                  <div className="text-sm">
                    <span className="block text-xs text-gray-500 mb-1">강사 분야</span>
                    <p className="font-medium text-gray-900">
                      {[...(profile.instructor_fields || []), profile.instructor_custom_field]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                )}

                {/* 한 줄 소개 */}
                <div className="text-sm">
                  <span className="block text-xs text-gray-500 mb-1">한 줄 소개</span>
                  <p className="text-gray-700 leading-relaxed">
                    {profile.intro || '아직 소개가 등록되지 않았습니다.'}
                  </p>
                </div>

                {/* 알림 & 약관 */}
                <div className="pt-2 border-t border-gray-100 space-y-1.5 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">알림 수신</span>
                    <span className="text-xs font-medium text-gray-900">
                      {profile.receive_notifications ? '✓ 수신 중' : '미수신'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">약관 동의</span>
                    <div className="flex gap-1.5 text-xs">
                      <span className={profile.agree_terms ? 'text-green-600' : 'text-gray-400'}>
                        {profile.agree_terms ? '✓' : '✗'} 이용
                      </span>
                      <span className={profile.agree_privacy ? 'text-green-600' : 'text-gray-400'}>
                        {profile.agree_privacy ? '✓' : '✗'} 개인정보
                      </span>
                      <span className={profile.agree_marketing ? 'text-blue-600' : 'text-gray-400'}>
                        {profile.agree_marketing ? '✓' : '✗'} 마케팅
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 하단 버튼 영역 - 스크롤 영역 내부 */}
            <div className="flex gap-2 px-4 py-3 border-t border-gray-200 bg-white">
              {isAdmin ? (
                <>
                  <button
                    type="button"
                    onClick={() => onRequestEdit?.(profile)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white active:bg-gray-50"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={handleAdminLogin}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 bg-gray-50 active:bg-gray-100"
                  >
                    관리자
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-red-600 bg-white active:bg-red-50 disabled:opacity-60"
                  >
                    {loggingOut ? '...' : '로그아웃'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onRequestEdit?.(profile)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 bg-white active:bg-gray-50"
                  >
                    프로필 수정
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2.5 text-sm font-medium text-red-600 bg-white active:bg-red-50 disabled:opacity-60"
                  >
                    {loggingOut ? '로그아웃 중...' : '로그아웃'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
    </div>
  );
}
