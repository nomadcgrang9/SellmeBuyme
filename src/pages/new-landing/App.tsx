import React from 'react';
import { Hero } from './components/Hero';
import { PWAProvider } from '@/components/pwa';
import { useActivityTracking } from '@/lib/hooks/useActivityTracking';
import { useGeolocation } from '@/lib/hooks/useGeolocation';

const App: React.FC = () => {
  // 위치 정보 수집 (localStorage에 user_location 저장)
  useGeolocation();

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
