import React, { useState } from 'react';
import { generateSchoolImage } from '../services/geminiService';

interface SmartImageProps {
  src: string;
  alt: string;
  className?: string;
  promptContext: string;
}

export const SmartImage: React.FC<SmartImageProps> = ({ src, alt, className, promptContext }) => {
  const [currentSrc, setCurrentSrc] = useState(src);
  const [loading, setLoading] = useState(false);

  // This function is purely for demo purposes to show "Nano Banana" integration.
  // In a real app, this might be an admin feature or automatic fallback.
  const handleRegenerate = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;

    setLoading(true);
    const newImage = await generateSchoolImage(promptContext);
    if (newImage) {
      setCurrentSrc(newImage);
    } else {
      alert("AI 이미지 생성에 실패했거나 API 키가 없습니다.");
    }
    setLoading(false);
  };

  return (
    <div className={`relative group ${className}`}>
      <img src={currentSrc} alt={alt} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
      
      {/* AI Generate Button Overlay - visible on hover for demo */}
      <button 
        onClick={handleRegenerate}
        className="absolute bottom-2 right-2 bg-black/60 hover:bg-blue-600 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 backdrop-blur-sm"
        title="Nano Banana로 이미지 생성"
      >
        {loading ? (
           <svg className="animate-spin h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
           </svg>
        ) : (
          <>
             ✨ AI생성
          </>
        )}
      </button>
    </div>
  );
};