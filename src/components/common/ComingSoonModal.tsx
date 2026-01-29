import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles } from 'lucide-react';

interface ComingSoonModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
}

export default function ComingSoonModal({ isOpen, onClose, title }: ComingSoonModalProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={onClose}
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative w-full max-w-sm bg-white rounded-2xl shadow-xl overflow-hidden"
                    >
                        <button
                            onClick={onClose}
                            className="absolute top-3 right-3 p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-16 h-16 mb-6 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                <Sparkles size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">
                                {title}
                            </h3>
                            <p className="text-gray-500 mb-6 font-medium">
                                해당 기능은 2월 초 업데이트 예정입니다.<br />
                                조금만 기다려주세요!
                            </p>
                            <button
                                onClick={onClose}
                                className="w-full py-3 px-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
