// FloatingActionButton - 플로팅 액션 버튼
import { Plus, X } from 'lucide-react';
import { useState } from 'react';
import ActionMenu from './ActionMenu';

interface FloatingActionButtonProps {
  onIdeaClick: () => void;
  onBoardClick: () => void;
  onProjectClick: () => void;
}

export default function FloatingActionButton({
  onIdeaClick,
  onBoardClick,
  onProjectClick,
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all z-40 ${
          isOpen
            ? 'bg-gray-900 hover:bg-gray-800'
            : 'bg-[#a8c5e0] hover:bg-[#7aa3cc]'
        }`}
        aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <Plus className="w-6 h-6 text-gray-900" />
        )}
      </button>

      {/* 액션 메뉴 */}
      {isOpen && (
        <ActionMenu
          onClose={() => setIsOpen(false)}
          onIdeaClick={onIdeaClick}
          onBoardClick={onBoardClick}
          onProjectClick={onProjectClick}
        />
      )}
    </>
  );
}
