import PromoCardEditSection from './PromoCardEditSection';
import StripeBannerManager from './StripeBannerManager';

export default function PromoTabManager() {
  return (
    <div className="space-y-4">
      {/* 히어로배너 관리 - 준비 중 */}
      <div className="flex h-full flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
        <p className="font-medium text-slate-700">프로모 관리 기능 준비 중</p>
        <p className="mt-2 text-xs text-slate-400">프로모션 카드 및 배너 관리 기능이 곧 추가될 예정입니다.</p>
      </div>

      {/* 기존 컴포넌트 숨김 처리 - 추후 제거 예정 */}
      {false && <PromoCardEditSection />}
      {false && <StripeBannerManager />}
    </div>
  );
}