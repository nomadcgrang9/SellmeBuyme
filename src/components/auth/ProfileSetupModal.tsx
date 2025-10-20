'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { IconX, IconArrowRight } from '@tabler/icons-react';

interface ProfileSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string | null;
}

export default function ProfileSetupModal({ isOpen, onClose, userEmail }: ProfileSetupModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[998] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-xl mx-4 rounded-3xl bg-white shadow-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 28 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-start justify-between px-7 pt-7 pb-4 border-b border-gray-100">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-[#7aa3cc] uppercase tracking-wider">회원 정보 설정</p>
                <h2 className="text-2xl font-extrabold text-gray-900 leading-tight">셀바 AI 추천을 위한 프로필을 완성해 주세요</h2>
                <p className="text-sm text-gray-500">{userEmail ?? '새로운 계정'}으로 가입을 시작했어요. 몇 가지 정보를 알려주시면 맞춤 추천을 준비할게요.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <IconX size={20} />
              </button>
            </header>

            <div className="px-7 py-6 space-y-4">
              <div className="grid gap-3">
                <div className="rounded-2xl border border-gray-100 bg-[#f8fbff] px-5 py-4">
                  <p className="text-sm font-semibold text-gray-800">1단계. 역할 선택</p>
                  <p className="text-xs text-gray-500 mt-1">교사, 강사, 업체 여부를 복수로 선택할 수 있도록 준비 중입니다.</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-[#f9f9ff] px-5 py-4">
                  <p className="text-sm font-semibold text-gray-800">2단계. 관심 지역</p>
                  <p className="text-xs text-gray-500 mt-1">주 활동 지역과 관심 지역을 태그 형태로 입력하게 됩니다.</p>
                </div>
                <div className="rounded-2xl border border-gray-100 bg-[#fff8ed] px-5 py-4">
                  <p className="text-sm font-semibold text-gray-800">3단계. 알림 설정</p>
                  <p className="text-xs text-gray-500 mt-1">새로운 공고 소식과 추천 알림을 토글로 제어할 수 있도록 설계 중입니다.</p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7aa3cc] to-[#5f89b4] py-3 text-sm font-semibold text-white shadow-md hover:from-[#6b95be] hover:to-[#517aa5] transition-colors"
              >
                프로필 작성 시작하기
                <IconArrowRight size={18} />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
