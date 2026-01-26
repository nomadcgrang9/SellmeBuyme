import HeroBannerManager from './HeroBannerManager';
import PromoCardEditSection from './PromoCardEditSection';
import StripeBannerManager from './StripeBannerManager';

export default function PromoTabManager() {
  return (
    <div className="space-y-4">
      {/* 히어로배너 관리 */}
      <HeroBannerManager />

      {/* 띠지배너 관리 */}
      <StripeBannerManager />

      {/* 프로모 카드 편집 - 추후 활성화 예정 */}
      {false && <PromoCardEditSection />}
    </div>
  );
}