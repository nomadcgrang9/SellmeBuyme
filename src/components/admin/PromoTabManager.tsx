import PromoCardEditSection from './PromoCardEditSection';
import StripeBannerManager from './StripeBannerManager';
import HeroBannerManagement from './HeroBannerManagement';

export default function PromoTabManager() {
  return (
    <div className="space-y-4">
      {/* 히어로배너 관리 (새 UI) */}
      <HeroBannerManagement />

      {/* 기존 컴포넌트 숨김 처리 - 추후 제거 예정 */}
      {false && <PromoCardEditSection />}
      {false && <StripeBannerManager />}
    </div>
  );
}