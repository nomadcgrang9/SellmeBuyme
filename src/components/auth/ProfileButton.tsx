// 프로필 버튼 컴포넌트
// 로그인 상태에서 우측 상단에 표시되는 동그란 프로필 버튼
// Anti-Vibe Design: 이모지 없음, 미니멀 디자인
// 작성일: 2026-01-12

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';

interface ProfileButtonProps {
    onManageMarkers?: () => void;
}

export default function ProfileButton({ onManageMarkers }: ProfileButtonProps) {
    const { user, logout } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        try {
            await logout();
            setIsOpen(false);
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

    return (
        <div className="relative" ref={dropdownRef}>
            {/* 프로필 버튼 (FAB 스타일, 48px) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-12 h-12 rounded-full flex items-center justify-center text-base font-semibold transition-all duration-200 hover:scale-105"
                style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08)',
                    border: '2px solid rgba(255,255,255,0.8)',
                    color: '#374151'
                }}
                aria-label="프로필 메뉴"
            >
                {getInitial()}
            </button>

            {/* 드롭다운 메뉴 - 위로 열리도록 수정 */}
            {isOpen && (
                <div
                    className="absolute right-0 bottom-full mb-2 w-48 py-1 rounded-lg"
                    style={{
                        background: 'rgba(255, 255, 255, 0.98)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        border: '1px solid rgba(0,0,0,0.06)'
                    }}
                >
                    {/* 이메일 표시 */}
                    <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-xs text-gray-500 truncate">
                            {user?.email || '이메일 없음'}
                        </p>
                    </div>

                    {/* 메뉴 항목들 */}
                    <div className="py-1">
                        {onManageMarkers && (
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    onManageMarkers();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                내 마커 관리
                            </button>
                        )}
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
