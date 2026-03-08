import HeroBannerManager from './HeroBannerManager';
import PopupBannerManager from './PopupBannerManager';
import NativeBannerManager from './NativeBannerManager';
import QrPromoManager from './QrPromoManager';

export default function PromoTabManager() {
  return (
    <div className="space-y-4">
      {/* 히어로배너 관리 */}
      <HeroBannerManager />

      {/* 접속배너 관리 */}
      <PopupBannerManager />

      {/* QR 홍보페이지 관리 */}
      <QrPromoManager />

      {/* 카드배너 관리 */}
      <NativeBannerManager />
    </div>
  );
}
