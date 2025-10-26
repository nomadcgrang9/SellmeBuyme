import PromoCardListManager from './PromoCardListManager';
import { useAuthStore } from '@/stores/authStore';

export default function PromoCardContent() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  return (
    <div className="space-y-4">
      <PromoCardListManager userId={userId} />
    </div>
  );
}