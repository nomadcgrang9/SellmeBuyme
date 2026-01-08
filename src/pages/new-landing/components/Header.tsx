import React from 'react';
import { Logo } from './Logo';

export const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 font-header shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        {/* Top Row: Logo & Nav */}
        <div className="h-16 flex items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer">
            <Logo />
          </div>

          {/* Right Menu - With Dividers and Wider Spacing */}
          <div className="flex items-center">
             <button className="hidden md:block text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium tracking-tight whitespace-nowrap px-6">
               쌤찾기란?
             </button>

             {/* Divider */}
             <div className="hidden md:block w-px h-3 bg-gray-300"></div>

             <button className="hidden md:block text-gray-600 hover:text-blue-600 transition-colors text-sm font-medium tracking-tight whitespace-nowrap px-6">
               공지사항
             </button>

             {/* Divider */}
             <div className="hidden md:block w-px h-3 bg-gray-300"></div>
             
             {/* Notification Bell */}
             <button className="relative p-2 ml-2 md:ml-6 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-all group" aria-label="알림">
               <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
               </svg>
               {/* Notification Badge Dot */}
               <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
             </button>
          </div>
        </div>

        {/* Bottom Row: Search Bar */}
        <div className="pb-4">
            <div className="relative max-w-full">
                <input 
                    type="text" 
                    placeholder="학교명, 지역, 과목으로 검색해보세요 (예: 서울, 수학, 기간제)" 
                    className="w-full h-12 pl-12 pr-4 rounded-xl border-2 border-[#5B6EF7] bg-gray-50 focus:bg-white outline-none focus:ring-4 focus:ring-[#5B6EF7]/20 transition-all text-gray-800 placeholder-gray-400 font-medium shadow-sm"
                />
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#5B6EF7]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
            </div>
        </div>
      </div>
    </header>
  );
};