import { useState, useCallback, useMemo, useEffect } from 'react';
import { IconX } from '@tabler/icons-react';
import PromoCardForm, { type PromoFormState } from './PromoCardForm';
import PromoCardPreview from './PromoCardPreview';
import { updatePromoCard, createPromoCard, uploadPromoImage } from '@/lib/supabase/queries';
import type { PromoCardSettings, PromoCardUpdateInput } from '@/types';

interface PromoCardEditModalProps {
  card: PromoCardSettings | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  userId: string | null;
  collectionId: string | null;
}

const DEFAULT_BACKGROUND_GRADIENT: readonly [string, string] = ['#6366f1', '#22d3ee'];
const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const mapSettingsToForm = (settings: PromoCardSettings): PromoFormState => ({
  isActive: settings.isActive,
  headline: settings.headline,
  imageUrl: settings.imageUrl ?? null,
  insertPosition: settings.insertPosition,
  backgroundColor: settings.backgroundColor ?? '#ffffff',
  backgroundColorMode: settings.backgroundColorMode ?? 'single',
  backgroundGradientStart: settings.backgroundGradientStart ?? null,
  backgroundGradientEnd: settings.backgroundGradientEnd ?? null,
  fontColor: settings.fontColor ?? '#1f2937',
  fontSize: settings.fontSize ?? 28,
  badgeColor: settings.badgeColor ?? '#dbeafe',
  badgeColorMode: settings.badgeColorMode ?? 'single',
  badgeGradientStart: settings.badgeGradientStart ?? null,
  badgeGradientEnd: settings.badgeGradientEnd ?? null,
  imageScale: typeof settings.imageScale === 'number' ? settings.imageScale : 1,
  autoPlay: settings.autoPlay,
  duration: settings.duration
});

export default function PromoCardEditModal({
  card,
  isOpen,
  onClose,
  onSave,
  userId,
  collectionId
}: PromoCardEditModalProps) {
  const [form, setForm] = useState<PromoFormState>(() =>
    card ? mapSettingsToForm(card) : {
      isActive: true,
      headline: '새 프로모 카드',
      imageUrl: null,
      insertPosition: 2,
      backgroundColor: '#ffffff',
      backgroundColorMode: 'single',
      backgroundGradientStart: null,
      backgroundGradientEnd: null,
      fontColor: '#1f2937',
      fontSize: 24,
      badgeColor: '#dbeafe',
      badgeColorMode: 'single',
      badgeGradientStart: null,
      badgeGradientEnd: null,
      imageScale: 1,
      autoPlay: true,
      duration: 5000
    }
  );

  const [saving, setSaving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // card prop이 변경되거나 모달이 열릴 때 form 초기화
  useEffect(() => {
    if (isOpen) {
      if (card) {
        setForm(mapSettingsToForm(card));
      } else {
        setForm({
          isActive: true,
          headline: '새 프로모 카드',
          imageUrl: null,
          insertPosition: 2,
          backgroundColor: '#ffffff',
          backgroundColorMode: 'single',
          backgroundGradientStart: null,
          backgroundGradientEnd: null,
          fontColor: '#1f2937',
          fontSize: 24,
          badgeColor: '#dbeafe',
          badgeColorMode: 'single',
          badgeGradientStart: null,
          badgeGradientEnd: null,
          imageScale: 1,
          autoPlay: true,
          duration: 5000
        });
      }
      setError(null);
    }
  }, [card, isOpen]);

  const updateField = useCallback(
    <K extends keyof PromoFormState>(key: K, value: PromoFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setError(null);
    },
    []
  );

  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const imageUrl = await uploadPromoImage(file);
      updateField('imageUrl', imageUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : '이미지 업로드에 실패했습니다.';
      setError(message);
      console.error('이미지 업로드 실패:', err);
    } finally {
      setUploading(false);
    }
  }, [updateField]);

  const buildPayload = useCallback((): PromoCardUpdateInput => {
    const pickGradientValue = (candidate: string | null | undefined, fallback: string): string => {
      return candidate ? candidate : fallback;
    };

    return {
      id: card?.id,
      cardId: card?.cardId,
      isActive: form.isActive,
      headline: form.headline.trim(),
      imageUrl: form.imageUrl?.trim() || null,
      insertPosition: form.insertPosition,
      backgroundColor: form.backgroundColor,
      backgroundColorMode: form.backgroundColorMode,
      backgroundGradientStart:
        form.backgroundColorMode === 'gradient'
          ? pickGradientValue(form.backgroundGradientStart, DEFAULT_BACKGROUND_GRADIENT[0])
          : null,
      backgroundGradientEnd:
        form.backgroundColorMode === 'gradient'
          ? pickGradientValue(form.backgroundGradientEnd, DEFAULT_BACKGROUND_GRADIENT[1])
          : null,
      fontColor: form.fontColor,
      fontSize: form.fontSize,
      badgeColor: form.badgeColor,
      badgeColorMode: form.badgeColorMode,
      badgeGradientStart:
        form.badgeColorMode === 'gradient'
          ? pickGradientValue(form.badgeGradientStart, DEFAULT_BADGE_GRADIENT[0])
          : null,
      badgeGradientEnd:
        form.badgeColorMode === 'gradient'
          ? pickGradientValue(form.badgeGradientEnd, DEFAULT_BADGE_GRADIENT[1])
          : null,
      imageScale: form.imageScale,
      autoPlay: form.autoPlay,
      duration: form.duration
    };
  }, [form, card]);

  const handleDraftSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const payload = buildPayload();
      console.log('[PromoCard] 임시저장 시작:', { cardId: card?.cardId, headline: payload.headline });

      if (card?.cardId) {
        // 기존 카드 업데이트
        await updatePromoCard(card.cardId, payload, { userId });
        console.log('[PromoCard] 기존 카드 업데이트 완료:', card.cardId);
      } else {
        // 새 카드 생성
        if (!collectionId) {
          throw new Error('컬렉션 ID가 없습니다.');
        }
        await createPromoCard(collectionId, payload, { userId });
        console.log('[PromoCard] 새 카드 생성 완료');
      }
      onSave();
    } catch (err) {
      const message = err instanceof Error ? err.message : '저장에 실패했습니다.';
      setError(message);
      console.error('[PromoCard] 임시저장 실패:', {
        error: err,
        message,
        cardId: card?.cardId,
        userId
      });
    } finally {
      setSaving(false);
    }
  }, [buildPayload, card?.cardId, collectionId, userId, onSave]);

  const handleApply = useCallback(async () => {
    setApplying(true);
    setError(null);
    try {
      const payload = buildPayload();
      console.log('[PromoCard] 적용 시작:', { cardId: card?.cardId, headline: payload.headline });

      if (card?.cardId) {
        // 기존 카드 업데이트
        await updatePromoCard(card.cardId, payload, { userId });
        console.log('[PromoCard] 기존 카드 적용 완료:', card.cardId);
      } else {
        // 새 카드 생성
        if (!collectionId) {
          throw new Error('컬렉션 ID가 없습니다.');
        }
        await createPromoCard(collectionId, payload, { userId });
        console.log('[PromoCard] 새 카드 적용 완료');
      }
      onSave();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : '적용에 실패했습니다.';
      setError(message);
      console.error('[PromoCard] 적용 실패:', {
        error: err,
        message,
        cardId: card?.cardId,
        userId
      });
    } finally {
      setApplying(false);
    }
  }, [buildPayload, card?.cardId, collectionId, userId, onSave, onClose]);

  const handleReset = useCallback(() => {
    if (card) {
      setForm(mapSettingsToForm(card));
    }
    setError(null);
  }, [card]);

  const lastSavedLabel = useMemo(() => {
    if (!card?.lastDraftAt) return '저장 이력 없음';
    const date = new Date(card.lastDraftAt);
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, [card?.lastDraftAt]);

  const lastAppliedLabel = useMemo(() => {
    if (!card?.lastAppliedAt) return '저장 이력 없음';
    const date = new Date(card.lastAppliedAt);
    return new Intl.DateTimeFormat('ko-KR', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }, [card?.lastAppliedAt]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-6xl max-h-[90vh] bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h2 className="text-xl font-semibold text-slate-800">
            {card ? '프로모 카드 편집' : '새 프로모 카드'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition-colors"
          >
            <IconX size={20} />
          </button>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* 본문 (2열 레이아웃) */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* 좌측: 폼 */}
            <div>
              <PromoCardForm
                form={form}
                onFieldChange={updateField}
                onReset={handleReset}
                onDraftSave={handleDraftSave}
                onApply={handleApply}
                isDirty={false}
                isLoading={false}
                isSaving={saving}
                isApplying={applying}
                lastSavedLabel={lastSavedLabel}
                lastAppliedLabel={lastAppliedLabel}
                onImageUpload={handleImageUpload}
                isUploading={uploading}
              />
            </div>

            {/* 우측: 미리보기 */}
            <div>
              <PromoCardPreview data={form} />
            </div>
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
          <button
            onClick={onClose}
            disabled={saving || applying}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50"
          >
            취소
          </button>
          <button
            onClick={handleDraftSave}
            disabled={saving || applying}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg disabled:opacity-50"
          >
            {saving ? '저장 중...' : '임시저장'}
          </button>
          <button
            onClick={handleApply}
            disabled={saving || applying}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50"
          >
            {applying ? '적용 중...' : '적용하기'}
          </button>
        </div>
      </div>
    </div>
  );
}
