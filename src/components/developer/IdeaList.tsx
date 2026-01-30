// IdeaList - 아이디어 목록 컴포넌트 (검색/필터 포함)
import { useState, useMemo } from 'react';
import { AlertCircle, Loader2, Lightbulb, Search, ChevronDown } from 'lucide-react';
import IdeaCard from './IdeaCard';
import type { DevIdea, IdeaCategory } from '@/types/developer';

type SortOption = 'newest' | 'oldest';

interface IdeaListProps {
  ideas: DevIdea[];
  loading: boolean;
  error: Error | null;
  filter: IdeaCategory | 'all';
  onFilterChange: (filter: IdeaCategory | 'all') => void;
  onEdit?: (idea: DevIdea) => void;
  onDelete?: (id: string) => void;
  onToggleTodo?: (ideaId: string, todoId: string) => void;
}

const CATEGORY_TABS: { value: IdeaCategory | 'all'; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'feature', label: '새 기능' },
  { value: 'bug', label: '버그' },
  { value: 'design', label: '디자인' },
  { value: 'other', label: '기타' },
];

export default function IdeaList({
  ideas,
  loading,
  error,
  filter,
  onFilterChange,
  onEdit,
  onDelete,
  onToggleTodo,
}: IdeaListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // 검색 + 정렬 적용
  const filteredAndSortedIdeas = useMemo(() => {
    let result = [...ideas];

    // 검색 필터링
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(
        (idea) =>
          idea.title?.toLowerCase().includes(query) ||
          idea.authorName.toLowerCase().includes(query) ||
          idea.content.toLowerCase().includes(query)
      );
    }

    // 정렬
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortBy === 'newest' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [ideas, searchQuery, sortBy]);

  return (
    <div className="space-y-4">
      {/* 검색창 + 정렬 */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="제목, 작성자, 내용 검색..."
            className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#a8c5e0] focus:border-transparent"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
          >
            {sortBy === 'newest' ? '최신순' : '오래된순'}
            <ChevronDown className="w-4 h-4" />
          </button>
          {showSortDropdown && (
            <div className="absolute right-0 top-full mt-1 w-28 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              <button
                onClick={() => {
                  setSortBy('newest');
                  setShowSortDropdown(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  sortBy === 'newest' ? 'text-[#3B82F6] font-medium' : 'text-gray-700'
                }`}
              >
                최신순
              </button>
              <button
                onClick={() => {
                  setSortBy('oldest');
                  setShowSortDropdown(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 ${
                  sortBy === 'oldest' ? 'text-[#3B82F6] font-medium' : 'text-gray-700'
                }`}
              >
                오래된순
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 카테고리 필터 탭 */}
      <div className="flex items-center gap-1 border-b border-gray-200">
        {CATEGORY_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onFilterChange(tab.value)}
            className={`px-3 py-2 text-sm transition-colors ${
              filter === tab.value
                ? 'text-[#3B82F6] font-semibold border-b-2 border-[#3B82F6]'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 로딩 상태 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
          <span className="ml-2 text-sm text-gray-600">로딩 중...</span>
        </div>
      )}

      {/* 에러 상태 */}
      {error && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-900 mb-1">
              아이디어를 불러올 수 없습니다
            </p>
            <p className="text-xs text-red-700">{error.message}</p>
          </div>
        </div>
      )}

      {/* 빈 상태 */}
      {!loading && !error && filteredAndSortedIdeas.length === 0 && (
        <div className="text-center py-12">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          {searchQuery ? (
            <>
              <p className="text-sm text-gray-600 mb-1">
                검색 결과가 없습니다
              </p>
              <p className="text-xs text-gray-500">
                다른 검색어로 시도해보세요
              </p>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-1">
                아직 등록된 아이디어가 없습니다
              </p>
              <p className="text-xs text-gray-500">
                우측 하단 + 버튼을 눌러 첫 아이디어를 공유해보세요!
              </p>
            </>
          )}
        </div>
      )}

      {/* 아이디어 목록 */}
      {!loading && !error && filteredAndSortedIdeas.length > 0 && (
        <div className="space-y-3">
          {filteredAndSortedIdeas.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onEdit={() => onEdit?.(idea)}
              onDelete={() => onDelete?.(idea.id)}
              onToggleTodo={(todoId) => onToggleTodo?.(idea.id, todoId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
