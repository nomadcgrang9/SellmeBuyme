import React, { useState, useEffect } from 'react';
import { Logo } from './Logo';
import { MOCK_BANNERS } from '../constants';

const THEMES = {
  'neon-blue': {
    wrapper: 'bg-gradient-to-br from-blue-900 to-slate-800',
    orb1: 'bg-blue-400',
    orb2: 'bg-cyan-300',
    orb3: 'bg-indigo-400',
  },
  'midnight-purple': {
    wrapper: 'bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900',
    orb1: 'bg-fuchsia-400',
    orb2: 'bg-purple-300',
    orb3: 'bg-pink-400',
  },
};

// Character animation component
const AnimatedText = ({
  text,
  className,
  baseDelay = 0,
  staggerDelay = 30
}: {
  text: string;
  className?: string;
  baseDelay?: number;
  staggerDelay?: number;
}) => {
  const lines = text.split('\n');
  let charGlobalIndex = 0;

  return (
    <div className={className}>
      {lines.map((line, lineIndex) => (
        <div key={lineIndex} className="block">
          {line.split('').map((char, charIndex) => {
            const currentDelay = baseDelay + (charGlobalIndex * staggerDelay);
            charGlobalIndex++;
            return (
              <span
                key={`${lineIndex}-${charIndex}`}
                className="inline-block opacity-0 animate-fade-in"
                style={{
                  animationDelay: `${currentDelay}ms`,
                  animationFillMode: 'forwards',
                  marginRight: char === ' ' ? '0.25em' : '0'
                }}
              >
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export const Header: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOCK_BANNERS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeBanner = MOCK_BANNERS[activeIndex];
  const theme = THEMES[activeBanner.theme as keyof typeof THEMES] || THEMES['neon-blue'];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100 font-header shadow-sm">
      <div className="max-w-6xl mx-auto px-4">
        <div className="h-28 flex items-center gap-6">
          {/* Logo */}
          <div className="flex-shrink-0 cursor-pointer">
            <Logo />
          </div>

          {/* Hero Banner (옆에 배치) */}
          <div className={`relative flex-1 h-20 overflow-hidden rounded-xl shadow-md ${!activeBanner.backgroundImage ? theme.wrapper : ''}`}>
            {/* Background Image */}
            {activeBanner.backgroundImage && (
              <div
                className="absolute inset-0 bg-cover bg-center scale-105 blur-[1px]"
                style={{ backgroundImage: `url(${activeBanner.backgroundImage})` }}
              />
            )}
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-black/50"></div>

            {/* Animated Orbs */}
            <div className={`absolute inset-0 overflow-hidden ${activeBanner.backgroundImage ? 'opacity-30' : ''}`}>
              <div className={`absolute top-0 right-[-10%] w-[150px] h-[150px] rounded-full blur-[30px] opacity-50 animate-blob ${theme.orb1}`}></div>
              <div className={`absolute bottom-[-20%] left-[-10%] w-[120px] h-[120px] rounded-full blur-[25px] opacity-40 animate-blob animation-delay-2000 ${theme.orb2}`}></div>
            </div>

            {/* Content */}
            <div className="absolute inset-0 flex items-center px-5 z-10">
              <div key={`content-${activeIndex}`} className="font-sandoll">
                <AnimatedText
                  text={activeBanner.title.replace('\n', ' ')}
                  className="text-sm md:text-base font-bold text-white tracking-wide leading-tight [text-shadow:_0_1px_4px_rgba(0,0,0,0.7)]"
                  baseDelay={300}
                  staggerDelay={25}
                />
                <AnimatedText
                  text={activeBanner.subtitle}
                  className="text-[10px] md:text-xs text-white/80 mt-1 leading-snug [text-shadow:_0_1px_2px_rgba(0,0,0,0.5)]"
                  baseDelay={1000}
                  staggerDelay={15}
                />
              </div>
            </div>

            {/* Paginator */}
            <div className="absolute bottom-2 right-4 flex gap-1.5 z-20">
              {MOCK_BANNERS.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1 rounded-full transition-all duration-300 ${idx === activeIndex ? 'w-4 bg-white' : 'w-1 bg-white/40'}`}
                />
              ))}
            </div>
          </div>

          {/* Promo Banner (알림 서비스) */}
          <div className="hidden lg:flex flex-shrink-0 h-20 w-[280px] items-center gap-3 px-4 rounded-xl bg-gradient-to-r from-slate-800 to-blue-900 shadow-md overflow-hidden relative">
            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/20 rounded-full blur-xl"></div>
            <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-16 h-16 text-white/5 rotate-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>

            {/* Content */}
            <div className="relative z-10 flex-1">
              <div className="text-[10px] text-blue-200 font-medium mb-0.5">스마트 알림 서비스</div>
              <div className="text-xs font-bold text-white leading-tight">
                원하는 공고만<br/>실시간 알림
              </div>
            </div>
            <button className="relative z-10 flex-shrink-0 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold py-1.5 px-3 rounded-full transition-colors">
              무료 알림
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};