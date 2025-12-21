// IdeaList - 아이디어 목록 컴포넌트
import { AlertCircle, Loader2, Lightbulb } from 'lucide-react';
import IdeaCard from './IdeaCard';
import type { DevIdea } from '@/types/developer';

interface IdeaListProps {
  ideas: DevIdea[];
  loading: boolean;
  error: Error | null;
}

export default function IdeaList({
  ideas,
  loading,
  error,
}: IdeaListProps) {
  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        <span className="ml-2 text-sm text-gray-600">로딩 중...</span>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-red-900 mb-1">
            아이디어를 불러올 수 없습니다
          </p>
          <p className="text-xs text-red-700">{error.message}</p>
        </div>
      </div>
    );
  }

  // 빈 상태
  if (ideas.length === 0) {
    return (
      <div className="text-center py-12">
        <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-600 mb-1">
          아직 등록된 아이디어가 없습니다
        </p>
        <p className="text-xs text-gray-500">
          우측 하단 + 버튼을 눌러 첫 아이디어를 공유해보세요!
        </p>
      </div>
    );
  }

  // 아이디어 목록 표시
  return (
    <div className="space-y-3">
      {ideas.map((idea) => (
        <IdeaCard
          key={idea.id}
          idea={idea}
        />
      ))}
    </div>
  );
}
