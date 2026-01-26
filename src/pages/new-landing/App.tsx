import React from 'react';
import { Hero } from './components/Hero';
import { PWAProvider } from '@/components/pwa';

const App: React.FC = () => {
  return (
    <PWAProvider>
      <div className="h-screen w-screen overflow-hidden">
        {/* 맵이 전체 화면을 차지 (헤더 없음) */}
        <Hero />
      </div>
    </PWAProvider>
  );
};

export default App;
