import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className = "" }) => {
  return (
    <div className={`flex items-center select-none ${className}`}>
      <img
        src="/logo.png"
        alt="쌤찾기z"
        className="h-8 md:h-[72px] w-auto"
      />
    </div>
  );
};