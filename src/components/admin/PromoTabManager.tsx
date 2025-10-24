import PromoCardEditSection from './PromoCardEditSection';
import BannerEditSection from './BannerEditSection';

export default function PromoTabManager() {
  return (
    <div className="space-y-6">
      {/* 페이지 헤더 */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-6">
        <h2 className="text-xl font-bold text-slate-900">홍보카드 관리</h2>
        <p className="mt-2 text-sm text-slate-600">
          추천 섹션의 프로모 카드와 띠지 배너를 관리합니다.
        </p>
      </div>

      {/* 토글 섹션들 */}
      <div className="space-y-4">
        <PromoCardEditSection />
        <BannerEditSection />
      </div>
    </div>
  );
}