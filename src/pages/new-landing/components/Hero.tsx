import React, { useState, useEffect } from 'react';
import { MOCK_BANNERS } from '../constants';

const THEMES = {
  'neon-blue': {
    wrapper: 'bg-gradient-to-br from-blue-900 to-slate-800', 
    orb1: 'bg-blue-400',
    orb2: 'bg-cyan-300',
    orb3: 'bg-indigo-400',
    textAccent: 'text-blue-100'
  },
  'midnight-purple': {
    wrapper: 'bg-gradient-to-br from-violet-900 via-purple-900 to-fuchsia-900',
    orb1: 'bg-fuchsia-400',
    orb2: 'bg-purple-300',
    orb3: 'bg-pink-400',
    textAccent: 'text-purple-100'
  },
  'sunset-vibes': {
    wrapper: 'bg-gradient-to-br from-orange-800 to-red-900',
    orb1: 'bg-yellow-400',
    orb2: 'bg-orange-300',
    orb3: 'bg-rose-400',
    textAccent: 'text-orange-100'
  }
};

// Component to handle character-by-character animation
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
  // Split text by newlines to handle multi-line text blocks correctly
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

export const Hero: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // 10 seconds interval
    const interval = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % MOCK_BANNERS.length);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const activeBanner = MOCK_BANNERS[activeIndex];
  const theme = THEMES[activeBanner.theme] || THEMES['neon-blue'];

  return (
    // Expanded width to max-w-7xl as requested
    <section className="max-w-7xl mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:h-[340px]">
        
        {/* LEFT: Main Banner Slider (Span 2) */}
        {/* Removed rounded-xl for sharp corners */}
        <div className={`relative lg:col-span-2 overflow-hidden shadow-lg h-[300px] lg:h-full group w-full transition-all duration-1000 ease-in-out ${!activeBanner.backgroundImage ? theme.wrapper : ''}`}>

            {/* Background Image with blur effect */}
            {activeBanner.backgroundImage && (
              <div
                className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-105 blur-[2px]"
                style={{ backgroundImage: `url(${activeBanner.backgroundImage})` }}
              />
            )}

            {/* Dark Overlay for text readability */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"></div>

            {/* Animated Background Effects (optional, reduced opacity when image is present) */}
            <div className={`absolute inset-0 overflow-hidden ${activeBanner.backgroundImage ? 'opacity-30' : ''}`}>
                <div className={`absolute top-0 right-[-10%] w-[500px] h-[500px] rounded-full blur-[80px] opacity-50 mix-blend-screen animate-blob ${theme.orb1}`}></div>
                <div className={`absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full blur-[60px] opacity-40 mix-blend-screen animate-blob animation-delay-2000 ${theme.orb2}`}></div>
                <div className={`absolute top-[40%] left-[30%] w-[300px] h-[300px] rounded-full blur-[50px] opacity-40 mix-blend-plus-lighter animate-blob animation-delay-4000 ${theme.orb3}`}></div>
            </div>
            
            {/* Content Layer */}
            <div className="absolute inset-0 flex items-center justify-between p-6 md:p-10 z-10">
                <div className="w-full md:w-5/6 font-sandoll">
                    {/* Key prop ensures re-render on slide change, restarting animations */}
                    <div key={`content-${activeIndex}`}>
                        {/* Title: Adjusted size (lg:text-[2.2rem]) and margins */}
                        <AnimatedText
                            text={activeBanner.title}
                            className="text-2xl md:text-3xl lg:text-[2.2rem] font-bold mb-3 text-white tracking-wide leading-snug lg:leading-relaxed [text-shadow:_0_2px_8px_rgba(0,0,0,0.7),_0_4px_16px_rgba(0,0,0,0.5)]"
                            baseDelay={500}
                            staggerDelay={40}
                        />

                        {/* Subtitle: Size reduced to text-sm md:text-base */}
                        <AnimatedText
                            text={activeBanner.subtitle}
                            className={`text-sm md:text-base font-medium mb-5 text-white/90 leading-relaxed tracking-wider [text-shadow:_0_1px_4px_rgba(0,0,0,0.6),_0_2px_8px_rgba(0,0,0,0.4)]`}
                            baseDelay={1500}
                            staggerDelay={20}
                        />
                    </div>
                </div>
            </div>

            {/* Paginator */}
            <div className="absolute bottom-6 left-8 md:left-12 flex gap-2 z-20">
                {MOCK_BANNERS.map((_, idx) => (
                    <div 
                        key={idx} 
                        className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${idx === activeIndex ? 'w-8 bg-white' : 'w-2 bg-white/40'}`}
                    />
                ))}
            </div>
        </div>

        {/* RIGHT: Map Widget (Span 1) */}
        {/* Removed rounded-xl for sharp corners */}
        <div className="hidden lg:block relative overflow-hidden border border-gray-200 bg-gray-50 group cursor-pointer shadow-sm hover:shadow-md transition-all">
            <div className="absolute inset-0 bg-[url('https://maps.googleapis.com/maps/api/staticmap?center=Seoul&zoom=13&size=600x600&maptype=roadmap&style=feature:all|element:labels|visibility:off&style=feature:landscape|element:geometry|color:0xf5f5f5&style=feature:water|element:geometry|color:0xc9c9c9&style=feature:road|element:geometry.fill|color:0xffffff')] bg-cover bg-center opacity-60 group-hover:opacity-70 transition-opacity grayscale-[30%]"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent"></div>

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 z-10">
                 <div className="relative mb-4">
                     <span className="absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-20 animate-ping"></span>
                     <div className="relative bg-white p-3 rounded-full shadow-lg border border-blue-100">
                        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                     </div>
                 </div>

                 <h3 className="text-xl font-bold text-gray-900 mb-2">내 주변 공고 지도</h3>
                 <p className="text-sm text-gray-500 mb-4 word-keep">
                     집 근처 학교를 지도에서<br/>한눈에 확인해보세요!
                 </p>

                 <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2">
                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                     </svg>
                     지도로 보기
                 </button>
            </div>
        </div>

      </div>
    </section>
  );
};