// PaginationDots - 점 버튼 페이지네이션
interface PaginationDotsProps {
  hasMore: boolean;
  onLoadMore: () => void;
  isLoading?: boolean;
}

export default function PaginationDots({
  hasMore,
  onLoadMore,
  isLoading = false,
}: PaginationDotsProps) {
  if (!hasMore) return null;

  return (
    <div className="flex justify-center py-4">
      <button
        onClick={onLoadMore}
        disabled={isLoading}
        className="inline-flex items-center gap-1 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="더 보기"
      >
        <span className="text-xl">•</span>
        <span className="text-xl">•</span>
        <span className="text-xl">•</span>
      </button>
    </div>
  );
}
