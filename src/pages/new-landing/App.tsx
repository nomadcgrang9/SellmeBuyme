import React from 'react';
import { Hero } from './components/Hero';
import { PWAProvider } from '@/components/pwa';
import { useActivityTracking } from '@/lib/hooks/useActivityTracking';

const App: React.FC = () => {
  // 사용자 활동 트래킹 (페이지뷰 자동 기록)
  useActivityTracking();

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
