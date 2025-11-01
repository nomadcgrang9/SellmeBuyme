// ActionMenu - 플로팅 버튼 액션 메뉴
import { Lightbulb, Globe, Rocket, X } from 'lucide-react';

interface ActionMenuProps {
  onClose: () => void;
  onIdeaClick: () => void;
  onBoardClick: () => void;
  onProjectClick: () => void;
}

export default function ActionMenu({
  onClose,
  onIdeaClick,
  onBoardClick,
  onProjectClick,
}: ActionMenuProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* 배경 오버레이 */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* 메뉴 컨텐츠 */}
      <div className="relative w-full max-w-screen-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl p-6">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            무엇을 하시겠어요?
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors"
            aria-label="닫기"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 액션 버튼 */}
        <div className="space-y-3">
          {/* 글 작성 */}
          <button
            onClick={() => {
              onClose();
              onIdeaClick();
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-[#a8c5e0] hover:bg-[#f0f7fc] transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
                <Lightbulb className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">글 작성</h3>
                <p className="text-sm text-gray-600">
                  아이디어나 제안을 팀원들과 공유하세요
                </p>
              </div>
            </div>
          </button>

          {/* 게시판 등록 */}
          <button
            onClick={() => {
              onClose();
              onBoardClick();
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-[#a8c5e0] hover:bg-[#f0f7fc] transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-green-200 transition-colors">
                <Globe className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  게시판 등록
                </h3>
                <p className="text-sm text-gray-600">
                  크롤링할 게시판 URL을 제안하세요
                </p>
              </div>
            </div>
          </button>

          {/* 프로젝트 생성 */}
          <button
            onClick={() => {
              onClose();
              onProjectClick();
            }}
            className="w-full p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-[#a8c5e0] hover:bg-[#f0f7fc] transition-all text-left group"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 group-hover:bg-purple-200 transition-colors">
                <Rocket className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-1">
                  프로젝트 생성
                </h3>
                <p className="text-sm text-gray-600">
                  아이디어를 프로젝트로 전환하여 관리하세요
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 취소 버튼 */}
        <button
          onClick={onClose}
          className="w-full mt-4 px-4 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
      </div>
    </div>
  );
}
