'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { IconX } from '@tabler/icons-react';
import { supabase } from '@/lib/supabase/client';
import { useState } from 'react';

export type AuthProvider = 'google' | 'kakao';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// 구글 로고 SVG
const GoogleLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
    </svg>
);

// 카카오 로고 SVG
const KakaoLogo = () => (
    <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path
            fill="#000000"
            d="M12 3c-5.52 0-10 3.59-10 8 0 2.84 1.87 5.32 4.68 6.73-.15.54-.97 3.48-1 3.64 0 .12.05.24.14.32.1.08.22.1.34.06.16-.05 3.74-2.44 4.28-2.79.51.08 1.03.12 1.56.12 5.52 0 10-3.59 10-8s-4.48-8-10-8z"
        />
    </svg>
);

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [loadingProvider, setLoadingProvider] = useState<AuthProvider | null>(null);

    const handleSelectProvider = async (provider: AuthProvider) => {
        try {
            setLoadingProvider(provider);
            const redirectTo = `${window.location.origin}/auth/callback`;

            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo,
                    queryParams: provider === 'kakao' ? { prompt: 'login' } : undefined
                } as Record<string, unknown>
            });

            if (error) {
                console.error('소셜 로그인 오류:', error.message);
            }
        } catch (error) {
            console.error('소셜 로그인 처리 중 오류:', error);
        } finally {
            setLoadingProvider(null);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                >
                    <motion.div
                        className="relative w-full max-w-[320px] mx-4 bg-white rounded-2xl shadow-xl p-6"
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* 닫기 버튼 */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
                            aria-label="닫기"
                        >
                            <IconX size={20} />
                        </button>

                        {/* 로고 */}
                        <div className="flex justify-center mb-6">
                            <img src="/logo.png" alt="쌤찾기" className="h-12" />
                        </div>

                        {/* 소셜 로그인 버튼들 */}
                        <div className="space-y-3">
                            {/* 구글 */}
                            <button
                                onClick={() => handleSelectProvider('google')}
                                disabled={loadingProvider !== null}
                                className="w-full h-12 flex items-center justify-center gap-2 
                           bg-white border border-gray-200 rounded-lg 
                           text-sm font-medium text-gray-700
                           hover:border-gray-300 hover:bg-gray-50
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
                            >
                                {loadingProvider === 'google' ? (
                                    <span className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                                ) : (
                                    <GoogleLogo />
                                )}
                                <span>Google로 계속하기</span>
                            </button>

                            {/* 카카오 */}
                            <button
                                onClick={() => handleSelectProvider('kakao')}
                                disabled={loadingProvider !== null}
                                className="w-full h-12 flex items-center justify-center gap-2 
                           bg-white border border-gray-200 rounded-lg 
                           text-sm font-medium text-gray-700
                           hover:border-gray-300 hover:bg-gray-50
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-colors"
                            >
                                {loadingProvider === 'kakao' ? (
                                    <span className="animate-spin w-5 h-5 border-2 border-gray-300 border-t-gray-600 rounded-full" />
                                ) : (
                                    <KakaoLogo />
                                )}
                                <span>카카오로 계속하기</span>
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
