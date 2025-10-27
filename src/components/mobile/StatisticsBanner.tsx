'use client';

interface StatisticsBannerProps {
  newJobsCount?: number;
  urgentJobsCount?: number;
  newTalentsCount?: number;
  popularKeywords?: string[];
}

export default function StatisticsBanner({
  newJobsCount = 0,
  urgentJobsCount = 0,
  newTalentsCount = 0,
  popularKeywords = []
}: StatisticsBannerProps) {
  return (
    <section className="md:hidden bg-blue-50 py-4 border-y border-blue-100">
      <div className="max-w-container mx-auto px-6">
        <div className="space-y-2 text-sm text-gray-700">
          <p className="flex items-center gap-2">
            <span>📋</span>
            <span>오늘 신규 공고</span>
            <strong className="text-primary font-bold">{newJobsCount}건</strong>
          </p>

          <p className="flex items-center gap-2">
            <span>⏰</span>
            <span>마감 임박</span>
            <strong className="text-red-500 font-bold">{urgentJobsCount}건</strong>
          </p>

          <p className="flex items-center gap-2">
            <span>👥</span>
            <span>신규 인력</span>
            <strong className="text-talent font-bold">{newTalentsCount}건</strong>
            <span>등록</span>
          </p>

          {popularKeywords.length > 0 && (
            <p className="flex items-center gap-2 flex-wrap">
              <span>🔥</span>
              <span>인기:</span>
              {popularKeywords.map((keyword) => (
                <span key={keyword} className="text-primary font-medium">
                  #{keyword}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
