'use client';

import { X } from 'lucide-react';
import { MessageCircle } from 'lucide-react';

export type AuthProvider = 'google' | 'kakao';

type ProviderConfig = {
  id: AuthProvider;
  labels: {
    signup: string;
    login: string;
  };
  description: string;
  bgColor: string;
  textColor: string;
  icon: string; // emoji
};

const providerConfigs: ProviderConfig[] = [
  {
    id: 'google',
    labels: {
      signup: '구글로 가입하기',
      login: '구글로 로그인하기'
    },
    description: 'Google 계정으로 빠르게 가입하세요.',
    bgColor: 'bg-white',
    textColor: 'text-gray-900',
    icon: '🔵'
  },
  {
    id: 'kakao',
    labels: {
      signup: '카카오톡으로 가입하기',
      login: '카카오톡으로 로그인하기'
    },
    description: 'Kakao 계정과 연동하여 이용하세요.',
    bgColor: 'bg-[#FEE500]',
    textColor: 'text-[#3C1E1E]',
    icon: '💬'
  }
];

interface MobileAuthPageProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProvider: (provider: AuthProvider) => void;
  loadingProvider?: AuthProvider | null;
  mode?: 'signup' | 'login';
}

export default function MobileAuthPage({
  isOpen,
  onClose,
  onSelectProvider,
  loadingProvider = null,
  mode = 'login'
}: MobileAuthPageProps) {
  const titleByMode = {
    signup: '회원가입',
    login: '로그인'
  } as const;

  const subtitleByMode = {
    signup: '소셜 계정으로 간편하게 가입하세요',
    login: '소셜 계정으로 로그인하세요'
  } as const;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white md:hidden flex flex-col animate-slide-in-right">
      {/* 상단 네비 - 고정 */}
      <header className="flex items-center justify-between px-4 h-14 border-b border-gray-200 bg-white flex-shrink-0">
        <h1 className="text-lg font-bold text-gray-900">{titleByMode[mode]}</h1>
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <X size={24} />
        </button>
      </header>

      {/* 메인 콘텐츠 */}
      <div className="flex-1 flex flex-col justify-center px-6 pb-20">
        {/* 로고 & 타이틀 */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#4facfe] to-[#00f2fe] mb-4 shadow-lg">
            <span className="text-3xl font-bold text-white">셀</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">셀미바이미</h2>
          <p className="text-sm text-gray-600">{subtitleByMode[mode]}</p>
        </div>

        {/* 소셜 로그인 버튼들 */}
        <div className="space-y-3">
          {providerConfigs.map(({ id, labels, description, bgColor, textColor, icon }) => {
            const isLoading = loadingProvider === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onSelectProvider(id)}
                disabled={isLoading}
                className={`w-full rounded-2xl border-2 border-gray-200 px-6 py-4 text-left transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4facfe] flex items-center gap-4 ${bgColor} ${
                  isLoading ? 'cursor-wait opacity-60' : 'active:scale-[0.98] shadow-md hover:shadow-lg'
                }`}
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/50 text-2xl">
                  {icon}
                </span>
                <span className="flex-1">
                  <span className={`block text-base font-bold ${textColor}`}>{labels[mode]}</span>
                  <span className="mt-0.5 block text-xs text-gray-600">{description}</span>
                </span>
                {isLoading && (
                  <span className="animate-spin text-xl">⏳</span>
                )}
              </button>
            );
          })}
        </div>

        {/* 안내 문구 */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500 leading-relaxed">
            {mode === 'signup'
              ? '소셜 계정 인증 후 프로필 정보를 입력하게 됩니다.'
              : '등록된 계정으로 로그인하면 내 정보를 불러옵니다.'
            }
          </p>
        </div>

        {/* 모드 전환 링크 (옵션) */}
        <div className="mt-6 text-center">
          {mode === 'login' ? (
            <p className="text-sm text-gray-600">
              계정이 없으신가요?{' '}
              <button className="font-semibold text-[#4facfe] hover:underline">
                회원가입하기 →
              </button>
            </p>
          ) : (
            <p className="text-sm text-gray-600">
              이미 계정이 있으신가요?{' '}
              <button className="font-semibold text-[#4facfe] hover:underline">
                로그인하기 →
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
