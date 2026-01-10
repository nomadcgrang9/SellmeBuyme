import React from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';

const App: React.FC = () => {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header />

      {/* Spacer for fixed header (112px = h-28) */}
      <div className="h-[112px] flex-shrink-0"></div>

      <main className="flex-1 overflow-hidden">
        <Hero />
      </main>
    </div>
  );
};

export default App;
