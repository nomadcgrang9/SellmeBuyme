import HeroBannerManager from './HeroBannerManager';
import PopupBannerManager from './PopupBannerManager';
import NativeBannerManager from './NativeBannerManager';

export default function PromoTabManager() {
  return (
    <div className="space-y-4">
      {/* 히어로배너 관리 */}
      <HeroBannerManager />

      {/* 접속배너 관리 */}
      <PopupBannerManager />

      {/* 카드배너 관리 */}
      <NativeBannerManager />
    </div>
  );
}
