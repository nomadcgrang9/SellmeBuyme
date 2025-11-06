'use client';

import { motion } from 'framer-motion';
import React from 'react';

interface TourOverlayProps {
  highlightPosition: {
    top: number;
    left: number;
    width: number;
    height: number;
  } | null;
  isFirstStep: boolean;
  children: React.ReactNode;
}

export default function TourOverlay({
  highlightPosition,
  isFirstStep,
  children
}: TourOverlayProps) {
  return (
    <>
      {/* 어두운 배경 */}
      <motion.div
        className="tour-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* 하이라이트 박스 (첫 단계 제외) */}
      {!isFirstStep && highlightPosition && (
        <motion.div
          className="tour-highlight"
          initial={{
            top: highlightPosition.top,
            left: highlightPosition.left,
            width: highlightPosition.width,
            height: highlightPosition.height,
            opacity: 0
          }}
          animate={{
            top: highlightPosition.top,
            left: highlightPosition.left,
            width: highlightPosition.width,
            height: highlightPosition.height,
            opacity: 1
          }}
          exit={{
            opacity: 0
          }}
          transition={{ duration: 0.3 }}
        />
      )}

      {/* 투어 텍스트 박스 */}
      {children}
    </>
  );
}
