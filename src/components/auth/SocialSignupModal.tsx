'use client';

import { AnimatePresence, motion } from 'framer-motion';
import {
  IconX,
  IconBrandGoogle,
  IconMessageCircle
} from '@tabler/icons-react';

type AuthProvider = 'google' | 'kakao';

type ProviderConfig = {
  id: AuthProvider;
  label: string;
  description: string;
  accent: string;
  icon: typeof IconBrandGoogle;
};

const providerConfigs: ProviderConfig[] = [
  {
    id: 'google',
    label: '구글로 가입하기',
    description: 'Google 계정으로 빠르게 가입하세요.',
    accent: 'bg-[#F4F8FF] text-[#1A73E8]',
    icon: IconBrandGoogle
  },
  {
    id: 'kakao',
    label: '카카오톡으로 가입하기',
    description: 'Kakao 계정과 연동하여 이용하세요.',
    accent: 'bg-[#FFF4D6] text-[#3C1E1E]',
    icon: IconMessageCircle
  }
];

interface SocialSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: AuthProvider) => void;
  loadingProvider?: AuthProvider | null;
}

export default function SocialSignupModal({
  isOpen,
  onClose,
  onSelectProvider,
  loadingProvider = null
}: SocialSignupModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[999] flex items-center justify-center bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative w-full max-w-md mx-4 rounded-2xl bg-white shadow-2xl"
            initial={{ y: 32, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 32, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">셀미바이미 회원가입</h2>
                <p className="mt-1 text-xs text-gray-500">원하는 서비스로 인증을 진행하세요.</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <IconX size={18} />
              </button>
            </header>

            <div className="px-5 pb-6 pt-4 space-y-3">
              {providerConfigs.map(({ id, label, description, icon: Icon, accent }) => {
                const isLoading = loadingProvider === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectProvider(id)}
                    disabled={isLoading}
                    className={`w-full rounded-xl border border-gray-200 px-4 py-3 text-left transition-shadow focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7aa3cc] flex items-center gap-3 ${
                      isLoading ? 'bg-gray-50 cursor-wait opacity-80' : 'hover:shadow-md'
                    }`}
                  >
                    <span className={`flex h-11 w-11 items-center justify-center rounded-full ${accent}`}>
                      <Icon size={22} stroke={1.8} />
                    </span>
                    <span className="flex-1">
                      <span className="block text-sm font-semibold text-gray-900">{label}</span>
                      <span className="mt-1 block text-xs text-gray-500">{description}</span>
                    </span>
                    {isLoading && (
                      <span className="text-xs font-semibold text-[#7aa3cc]">연결 중...</span>
                    )}
                  </button>
                );
              })}
            </div>

            <footer className="px-5 pb-5 text-center text-[11px] text-gray-400">
              소셜 계정 인증 후 프로필 정보를 추가로 입력하게 됩니다.
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type { AuthProvider };
