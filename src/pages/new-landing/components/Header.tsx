import React from 'react';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 font-header">
      <div className="w-full px-4">
        {/* Podia 스타일: 높이 60px, 상하 패딩 16px */}
        <div className="h-[60px] flex items-center gap-6">
          {/* Logo - 사이드바 너비(240px)에 맞춰 가운데 정렬, 로고 높이 28px */}
          <a href="/" className="flex-shrink-0 w-[240px] flex items-center justify-center">
            <Logo className="h-7" />
          </a>

          {/* 중앙 여백 - 추후 네비게이션 메뉴 등 추가 가능 */}
          <div className="flex-1" />

          {/* 우측 CTA 영역 - 간단한 로그인/회원가입만 */}
          <div className="flex items-center gap-3">
            <button className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors">
              로그인
            </button>
            <button className="h-9 px-4 text-sm font-semibold text-white rounded-lg bg-gray-900 hover:bg-gray-800 transition-colors">
              회원가입
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};