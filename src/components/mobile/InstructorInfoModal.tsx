/**
 * 교원연수 강사등록 안내 모달
 * Anti-vibe 디자인: 이모지 금지, 심플
 */

import { X } from 'lucide-react';
import PresentationGraph from '@solar-icons/react/csr/business/PresentationGraph';

interface InstructorInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegister?: () => void;  // 등록하기 버튼 클릭 콜백
}

export default function InstructorInfoModal({
  isOpen,
  onClose,
  onRegister,
}: InstructorInfoModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
      />

      {/* 모달 본체 */}
      <div className="relative bg-white rounded-2xl shadow-xl border border-gray-200 w-full max-w-md p-8 animate-scaleIn">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 transition-colors"
          aria-label="닫기"
        >
          <X size={20} />
        </button>

        {/* 내용 */}
        <div className="flex flex-col items-center text-center">
          {/* 아이콘 */}
          <div className="w-16 h-16 rounded-full bg-[#EBF4FF] flex items-center justify-center mb-5">
            <PresentationGraph size={32} color="#4facfe" />
          </div>

          {/* 제목 */}
          <h3 className="text-2xl font-bold text-gray-800 mb-6">
            교원연수 강사등록
          </h3>

          {/* 본문 */}
          <div className="text-[18px] text-gray-600 leading-relaxed space-y-4 mb-8">
            <p>
              선생님이 가지신 재능이 있다면<br />
              강사로 나서보시면 어떠실까요.
            </p>
            <p>
              교직원 및 학부모 대상<br />
              에듀테크 강사, 전통문화 강의,<br />
              세계시민교육 강의 등.
            </p>
            <p>
              알음알음 인맥중심으로 하던 틀에서<br />
              벗어나 지도와 모바일 기반으로<br />
              선생님의 재능을 학교와 연결합니다.
            </p>
          </div>

          {/* 버튼 */}
          <div className="flex gap-3 w-full">
            {onRegister ? (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 border border-gray-300 text-gray-600 hover:bg-gray-50 rounded-xl text-lg font-medium transition-colors"
                >
                  닫기
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onRegister();
                  }}
                  className="flex-1 py-3.5 bg-pink-400 hover:bg-pink-500 text-white rounded-xl text-lg font-medium transition-colors"
                >
                  등록하기
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="w-full py-3.5 bg-[#4facfe] hover:bg-[#3d9bef] text-white rounded-xl text-lg font-medium transition-colors"
              >
                확인
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
