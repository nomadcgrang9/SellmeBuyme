/**
 * 공통 사이드 서랍 패널 컨테이너
 * 사이드바(100px) 왼쪽에 슬라이드로 열리는 패널
 * 채팅/즐겨찾기/와글와글 패널과 동일한 디자인
 */

import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface SideDrawerPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  /** 헤더 왼쪽 컬러 도트 색상 */
  dotColor?: string;
  /** 패널 너비 (기본 420px) */
  width?: number;
  children: React.ReactNode;
}

export default function SideDrawerPanel({
  isOpen,
  onClose,
  title,
  dotColor,
  width = 420,
  children,
}: SideDrawerPanelProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/40 md:hidden"
          style={{ zIndex: 29 }}
          onClick={onClose}
        />
      )}
      {isOpen && (
        <motion.div
          key="panel"
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          className="fixed top-[60px] left-3 right-3 bottom-[76px] z-30 flex flex-col bg-white rounded-2xl overflow-hidden md:absolute md:inset-auto md:top-4 md:bottom-4 md:right-[128px] md:w-[420px]"
          style={{
            boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)',
            border: '1px solid rgba(0,0,0,0.06)',
          }}
        >
          {/* 헤더 */}
          <div
            className="px-5 py-3 border-b flex-shrink-0 backdrop-blur-md"
            style={{
              background: 'linear-gradient(135deg, rgba(104, 178, 255, 0.15) 0%, rgba(104, 178, 255, 0.25) 100%)',
              borderColor: 'rgba(104, 178, 255, 0.3)',
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {dotColor && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: dotColor }}
                  />
                )}
                <h2 className="text-[15px] font-bold text-gray-900">{title}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* 스크롤 가능한 콘텐츠 영역 */}
          <div className="flex-1 overflow-y-auto">
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
