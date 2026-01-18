import { motion } from 'framer-motion';

interface CardSkeletonProps {
  /** 스켈레톤 카드 개수 */
  count?: number;
  /** 카드 타입 (색상 결정) */
  type?: 'job' | 'talent' | 'experience';
}

/** 개별 스켈레톤 카드 */
function SkeletonCard({ type = 'job', index = 0 }: { type?: CardSkeletonProps['type']; index?: number }) {
  // 타입별 상단 바 색상
  const getBarColor = () => {
    switch (type) {
      case 'job':
        return 'from-[#9DD2FF] to-[#68B2FF]';
      case 'talent':
        return 'from-[#A8E6CF] to-[#7db8a3]';
      case 'experience':
        return 'from-[#FFE082] to-[#f4c96b]';
      default:
        return 'from-gray-200 to-gray-300';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.05 }}
      className="bg-white border border-gray-200 rounded-lg shadow-md overflow-hidden"
    >
      {/* 상단 컬러 바 */}
      <div className={`h-1 bg-gradient-to-r ${getBarColor()}`} />

      <div className="p-4 space-y-3">
        {/* 헤더 영역 */}
        <div className="flex items-center justify-between">
          <div className="h-4 w-12 bg-gray-200 rounded animate-pulse" />
          <div className="h-5 w-14 bg-gray-100 rounded-full animate-pulse" />
        </div>

        {/* 기관명 */}
        <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />

        {/* 제목 */}
        <div className="h-4 w-full bg-gray-100 rounded animate-pulse" />

        {/* 태그 */}
        <div className="flex gap-2">
          <div className="h-7 w-20 bg-gray-100 rounded-full animate-pulse" />
          <div className="h-7 w-16 bg-gray-100 rounded-full animate-pulse" />
        </div>

        {/* 정보 라인들 */}
        <div className="space-y-2 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-20 bg-gray-100 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-28 bg-gray-100 rounded animate-pulse" />
            <div className="ml-auto h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/** 카드 그리드 스켈레톤 */
export default function CardSkeleton({ count = 6, type = 'job' }: CardSkeletonProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} type={type} index={index} />
      ))}
    </div>
  );
}

/** 단일 카드 스켈레톤 (인라인 사용) */
export function SingleCardSkeleton({ type = 'job' }: { type?: CardSkeletonProps['type'] }) {
  return <SkeletonCard type={type} />;
}

/** 컴팩트 카드 스켈레톤 (AI 추천 등) */
export function CompactCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white border border-gray-200 rounded-lg p-3 flex gap-3"
        >
          {/* 아이콘 영역 */}
          <div className="w-10 h-10 bg-gray-100 rounded-lg animate-pulse flex-shrink-0" />

          {/* 컨텐츠 영역 */}
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* 우측 영역 */}
          <div className="h-6 w-14 bg-gray-100 rounded-full animate-pulse self-center" />
        </motion.div>
      ))}
    </div>
  );
}

/** 리스트 스켈레톤 (모바일용) */
export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white border border-gray-100 rounded-lg p-4"
        >
          <div className="flex items-start gap-3">
            {/* 좌측 정보 */}
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 bg-gray-200 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-gray-100 rounded animate-pulse" />
              <div className="flex gap-2 mt-2">
                <div className="h-5 w-16 bg-gray-100 rounded-full animate-pulse" />
                <div className="h-5 w-12 bg-gray-100 rounded-full animate-pulse" />
              </div>
            </div>

            {/* 우측 배지 */}
            <div className="h-6 w-10 bg-gray-100 rounded animate-pulse" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

/** 지도 스켈레톤 */
export function MapSkeleton() {
  return (
    <div className="relative w-full h-full min-h-[400px] bg-gray-100 rounded-lg overflow-hidden">
      {/* 지도 배경 패턴 */}
      <div className="absolute inset-0 opacity-30">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(90deg, #e5e7eb 1px, transparent 1px),
            linear-gradient(#e5e7eb 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px'
        }} />
      </div>

      {/* 로딩 인디케이터 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-3 border-gray-300 border-t-blue-500 rounded-full"
          />
          <span className="text-sm text-gray-500">지도 로딩 중...</span>
        </div>
      </div>

      {/* 가짜 마커들 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.5 }}
        className="absolute top-1/4 left-1/3 w-6 h-6 bg-blue-300 rounded-full"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.7 }}
        className="absolute top-1/2 right-1/4 w-6 h-6 bg-blue-300 rounded-full"
      />
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.3 }}
        transition={{ delay: 0.9 }}
        className="absolute bottom-1/3 left-1/2 w-6 h-6 bg-blue-300 rounded-full"
      />
    </div>
  );
}
