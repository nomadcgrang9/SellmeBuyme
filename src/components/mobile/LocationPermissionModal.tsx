import React from 'react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onAllow: () => void;
  onDeny: () => void;
}

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onAllow,
  onDeny,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 백드롭 */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onDeny}
      />

      {/* 모달 */}
      <div
        className="relative w-[90%] max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-scale-up"
        role="dialog"
        aria-modal="true"
        aria-labelledby="location-modal-title"
        aria-describedby="location-modal-description"
      >
        {/* 상단 일러스트 영역 */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 flex justify-center">
          <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center">
            <svg
              className="w-12 h-12 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
              />
            </svg>
          </div>
        </div>

        {/* 본문 */}
        <div className="p-6 text-center">
          <h2
            id="location-modal-title"
            className="text-xl font-bold text-gray-900 mb-3"
          >
            내 주변 공고 찾기
          </h2>
          <p
            id="location-modal-description"
            className="text-gray-600 text-sm leading-relaxed mb-6"
          >
            현재 위치 기반으로 가까운 학교 채용공고를
            <br />
            빠르게 찾아드릴게요.
          </p>

          {/* 버튼 그룹 */}
          <div className="flex flex-col gap-3">
            <button
              onClick={onAllow}
              className="w-full py-3.5 bg-blue-500 text-white font-semibold rounded-2xl
                transition-all duration-200 active:scale-[0.98] active:bg-blue-600
                shadow-lg shadow-blue-500/30"
            >
              위치 허용하기
            </button>
            <button
              onClick={onDeny}
              className="w-full py-3 text-gray-500 font-medium
                transition-colors duration-200 active:text-gray-700"
            >
              나중에 할게요
            </button>
          </div>
        </div>

        {/* 하단 안내 */}
        <div className="px-6 pb-6">
          <p className="text-xs text-gray-400 text-center">
            위치 정보는 공고 검색에만 사용되며 저장되지 않습니다.
          </p>
        </div>
      </div>

      {/* 애니메이션 스타일 */}
      <style>{`
        @keyframes scale-up {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-scale-up {
          animation: scale-up 0.2s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default LocationPermissionModal;
