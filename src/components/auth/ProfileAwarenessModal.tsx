'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { IconX } from '@tabler/icons-react';
import { useCallback } from 'react';

interface ProfileAwarenessModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onClose?: () => void;
}

export default function ProfileAwarenessModal({ isOpen, onConfirm, onClose }: ProfileAwarenessModalProps) {
  const handleBackdropClick = useCallback(() => {
    onClose?.();
  }, [onClose]);

  const handleContainerClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className="relative w-full max-w-md mx-4 rounded-3xl bg-white shadow-2xl font-esamanru"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            onClick={handleContainerClick}
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-5 right-5 inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
              aria-label="닫기"
            >
              <IconX size={18} />
            </button>

            <div className="px-8 pt-10 pb-8 space-y-7">
              <header className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#7aa3cc]">프로필 입력 안내</p>
                <h2 className="text-2xl font-extrabold text-gray-900">맞춤 추천을 위해 단계별로 함께 준비해요</h2>
              </header>

              <section className="rounded-2xl border border-[#e3edf9] bg-[#f6f9fe] px-6 py-5 text-sm text-gray-700 space-y-2">
                <p>선생님, 단계별로 자세히 입력해주실수록 AI가 가장 정확하게, 가장 빨리 추천해 드릴 수 있습니다.</p>
                <p className="text-[#4b83c6] font-semibold">조금만 시간을 내어 프로필을 완성해 주세요. 부탁드립니다.</p>
              </section>

              <footer className="flex justify-end">
                <button
                  type="button"
                  onClick={onConfirm}
                  className="inline-flex min-w-[120px] items-center justify-center rounded-xl bg-[#4b83c6] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#3d73b4]"
                >
                  시작하기
                </button>
              </footer>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
