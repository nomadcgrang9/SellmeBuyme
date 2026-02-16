import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase/client';
import { TERMS_CHAPTERS, TERMS_EFFECTIVE_DATE, TERMS_APPENDIX } from '@/pages/terms-content';

interface TermsAgreementModalProps {
  isOpen: boolean;
  userId: string;
  onComplete: () => void;
}

// 개인정보처리방침 요약 (인라인 표시용)
const PRIVACY_SUMMARY = [
  { title: '수집 항목', content: '이메일(필수), 프로필 정보(선택)' },
  { title: '수집 목적', content: '회원 관리, 서비스 제공, 맞춤 추천' },
  { title: '보유 기간', content: '회원 탈퇴 시까지 (법령에 따른 예외 있음)' },
  { title: '제3자 제공', content: '원칙적으로 제공하지 않음' },
  { title: '문의', content: 'teamsellba@gmail.com' },
];

/**
 * 소셜로그인 후 신규 사용자에게 표시되는 약관동의 모달
 * 필수 항목만 (마케팅 없음) + 인라인 펼치기/접기
 */
export default function TermsAgreementModal({ isOpen, userId, onComplete }: TermsAgreementModalProps) {
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedTerms, setExpandedTerms] = useState(false);
  const [expandedPrivacy, setExpandedPrivacy] = useState(false);

  const canSubmit = agreeTerms && agreePrivacy;

  const handleSubmit = async () => {
    console.log('[Terms] handleSubmit 시작', { canSubmit, isSubmitting, userId });
    if (!canSubmit || isSubmitting) {
      console.log('[Terms] 조건 미충족으로 리턴');
      return;
    }

    setIsSubmitting(true);
    try {
      // 1단계: 기존 프로필이 있는지 확인
      console.log('[Terms] 기존 프로필 확인...');
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('user_id')
        .eq('user_id', userId)
        .single();

      if (existingProfile) {
        // 기존 프로필이 있으면 약관동의만 업데이트
        console.log('[Terms] 기존 프로필 업데이트...');
        const { error } = await supabase
          .from('user_profiles')
          .update({ agree_terms: true, agree_privacy: true })
          .eq('user_id', userId);

        if (error) {
          console.error('[Terms] 약관동의 업데이트 실패:', error.message, error);
          return;
        }
      } else {
        // 신규 프로필 생성 (display_name 기본값 필요)
        console.log('[Terms] 신규 프로필 생성...');
        const defaultDisplayName = `사용자${Math.floor(Math.random() * 10000)}`;
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            user_id: userId,
            display_name: defaultDisplayName,
            agree_terms: true,
            agree_privacy: true,
          });

        if (error) {
          console.error('[Terms] 프로필 생성 실패:', error.message, error);
          return;
        }
      }

      console.log('[Terms] 저장 성공, 플래그 정리 및 onComplete 호출');
      sessionStorage.removeItem('needsTermsAgreement');
      // 영구 플래그 저장 (새로고침해도 모달 안 뜸)
      localStorage.setItem(`termsAgreed_${userId}`, 'true');
      onComplete();
    } catch (err) {
      console.error('[Terms] 약관동의 처리 실패:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative w-full max-w-md mx-4 bg-white rounded-xl shadow-xl border border-gray-200 p-6 font-esamanru max-h-[85vh] overflow-hidden flex flex-col"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="mb-4 flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">서비스 이용 동의</h2>
              <div className="w-12 h-0.5 bg-[#3B82F6] mt-2" />
              <p className="text-sm text-gray-500 mt-3">
                서비스를 이용하시려면 아래 약관에 동의해 주세요.
              </p>
            </div>

            {/* 동의 체크박스 - 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-1">
              {/* 이용약관 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <label className="flex items-center gap-3 p-3 cursor-pointer bg-gray-50">
                  <input
                    type="checkbox"
                    checked={agreeTerms}
                    onChange={(e) => setAgreeTerms(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                  />
                  <span className="flex-1 text-sm text-gray-800">
                    이용약관에 동의합니다
                    <span className="text-red-500 ml-1">(필수)</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedTerms(!expandedTerms);
                    }}
                    className="text-xs font-semibold text-[#3B82F6] hover:underline shrink-0"
                  >
                    {expandedTerms ? '접기' : '보기'}
                  </button>
                </label>

                <AnimatePresence>
                  {expandedTerms && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto p-3 bg-white border-t border-gray-100 text-xs text-gray-600 space-y-3">
                        <p className="text-gray-500">시행일: {TERMS_EFFECTIVE_DATE}</p>
                        {TERMS_CHAPTERS.map((chapter, cIdx) => (
                          <div key={cIdx}>
                            <h4 className="font-bold text-gray-800 mb-1">{chapter.title}</h4>
                            {chapter.sections.map((section) => (
                              <div key={section.id} className="mb-2">
                                <h5 className="font-semibold text-gray-700">{section.title}</h5>
                                {section.content.map((line, lIdx) => (
                                  <p key={lIdx} className="ml-2 leading-relaxed">{line}</p>
                                ))}
                              </div>
                            ))}
                          </div>
                        ))}
                        <p className="pt-2 border-t border-gray-100">{TERMS_APPENDIX}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* 개인정보처리방침 */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <label className="flex items-center gap-3 p-3 cursor-pointer bg-gray-50">
                  <input
                    type="checkbox"
                    checked={agreePrivacy}
                    onChange={(e) => setAgreePrivacy(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-[#3B82F6] focus:ring-[#3B82F6]"
                  />
                  <span className="flex-1 text-sm text-gray-800">
                    개인정보 수집 및 이용에 동의합니다
                    <span className="text-red-500 ml-1">(필수)</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setExpandedPrivacy(!expandedPrivacy);
                    }}
                    className="text-xs font-semibold text-[#3B82F6] hover:underline shrink-0"
                  >
                    {expandedPrivacy ? '접기' : '보기'}
                  </button>
                </label>

                <AnimatePresence>
                  {expandedPrivacy && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="max-h-48 overflow-y-auto p-3 bg-white border-t border-gray-100 text-xs text-gray-600">
                        <p className="font-semibold text-gray-800 mb-2">개인정보처리방침 요약</p>
                        <table className="w-full border border-gray-200 rounded text-xs">
                          <tbody>
                            {PRIVACY_SUMMARY.map((item, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                                <td className="px-2 py-1.5 font-medium text-gray-700 border-r border-gray-200 w-24">
                                  {item.title}
                                </td>
                                <td className="px-2 py-1.5 text-gray-600">{item.content}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <a
                          href="/privacy"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block mt-2 text-[#3B82F6] hover:underline"
                        >
                          전문 보기 →
                        </a>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* 버튼 */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
              className={`w-full h-11 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 ${
                canSubmit
                  ? 'bg-[#3B82F6] text-white hover:bg-blue-600'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? '처리 중...' : '동의하고 시작하기'}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
