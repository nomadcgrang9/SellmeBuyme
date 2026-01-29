/**
 * 프로필 모달
 * Anti-vibe 디자인 적용: 이모지 금지, 배경색 금지, 심플
 */

import { useEffect, useRef } from 'react';
import { X, LogOut, MapPin, User, Settings } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onManageMarkers?: () => void;
}

export default function ProfileModal({
  isOpen,
  onClose,
  onManageMarkers,
}: ProfileModalProps) {
  const { user, logout } = useAuthStore();
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // 외부 클릭으로 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleLogout = async () => {
    try {
      await logout();
      onClose();
      window.location.reload();
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // 이메일에서 이니셜 추출
  const getInitial = () => {
    if (!user?.email) return '?';
    return user.email.charAt(0).toUpperCase();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end pt-20 pr-4">
      {/* 배경 오버레이 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 모달 본체 */}
      <div
        ref={modalRef}
        className="relative bg-white rounded-xl shadow-xl border border-gray-200 w-72 animate-scaleIn"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
      >
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <X size={18} />
        </button>

        {/* 프로필 정보 */}
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            {/* 아바타 */}
            <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-100 text-gray-600 text-lg font-bold">
              {getInitial()}
            </div>
            {/* 이메일 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 truncate">
                {user?.email || '이메일 없음'}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                로그인됨
              </p>
            </div>
          </div>
        </div>

        {/* 메뉴 목록 */}
        <div className="py-2">
          {/* 내 마커 관리 */}
          {onManageMarkers && (
            <button
              onClick={() => {
                onManageMarkers();
                onClose();
              }}
              className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
            >
              <MapPin size={18} className="text-gray-400" />
              <span>내 마커 관리</span>
            </button>
          )}

          {/* 구분선 */}
          {onManageMarkers && <div className="h-px bg-gray-100 mx-4 my-1" />}

          {/* 로그아웃 */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-5 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors text-left"
          >
            <LogOut size={18} className="text-gray-400" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  );
}
