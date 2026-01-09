import React from 'react';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 font-header shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        {/* Logo Only */}
        <div className="h-16 flex items-center">
          <div className="flex-shrink-0 cursor-pointer">
            <Logo />
          </div>
        </div>
      </div>
    </header>
  );
};