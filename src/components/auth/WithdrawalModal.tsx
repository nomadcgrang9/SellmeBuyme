import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useToastStore } from '@/stores/toastStore';

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function WithdrawalModal({ isOpen, onClose }: WithdrawalModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const logout = useAuthStore((s) => s.logout);
  const showToast = useToastStore((s) => s.showToast);

  const canConfirm = confirmText === '탈퇴';

  const handleWithdraw = async () => {
    if (!canConfirm || isProcessing) return;

    setIsProcessing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        showToast('로그인 상태를 확인할 수 없습니다', 'error');
        return;
      }

      const { error } = await supabase.functions.invoke('delete-account', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error('탈퇴 처리 실패:', error);
        showToast('탈퇴 처리 중 오류가 발생했습니다', 'error');
        return;
      }

      await logout();
      onClose();
      showToast('탈퇴가 완료되었습니다', 'success');
      window.location.replace('/');
    } catch (err) {
      console.error('탈퇴 처리 중 예외:', err);
      showToast('탈퇴 처리 중 오류가 발생했습니다', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return;
    setConfirmText('');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
        >
          <motion.div
            className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-xl border border-gray-200 p-6 font-esamanru"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="mb-5">
              <h2 className="text-xl font-bold text-gray-900">회원 탈퇴</h2>
              <div className="w-12 h-0.5 bg-red-500 mt-2" />
            </div>

            {/* 안내 */}
            <div className="mb-5 text-sm text-gray-600 leading-relaxed">
              <p className="mb-3">탈퇴 시 다음 정보가 즉시 삭제되며 복구할 수 없습니다.</p>
              <ul className="space-y-1.5 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">-</span>
                  <span>프로필 정보</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">-</span>
                  <span>등록한 인력풀 마커 (구직자, 강사)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">-</span>
                  <span>채팅 내역 및 전송 파일</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-gray-400 mt-0.5">-</span>
                  <span>즐겨찾기 목록</span>
                </li>
              </ul>
            </div>

            {/* 확인 입력 */}
            <div className="mb-5">
              <label className="block text-sm text-gray-700 mb-1.5">
                탈퇴를 확인하려면 <strong>"탈퇴"</strong>를 입력해 주세요.
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="탈퇴"
                className="w-full h-10 px-3 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400"
                disabled={isProcessing}
              />
            </div>

            {/* 버튼 */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                className="flex-1 h-11 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleWithdraw}
                disabled={!canConfirm || isProcessing}
                className={`flex-1 h-11 rounded-lg text-sm font-semibold transition-colors ${
                  canConfirm
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isProcessing ? '처리 중...' : '탈퇴하기'}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
