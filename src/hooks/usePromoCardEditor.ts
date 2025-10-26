import { useEffect, useState, useCallback, useMemo } from 'react';
import type { PromoCardSettings, PromoCardUpdateInput } from '@/types';
import {
  fetchPromoCardSettings,
  savePromoCardDraft,
  applyPromoCardSettings
} from '@/lib/supabase/queries';
import type { PromoFormState } from '@/components/admin/PromoCardForm';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

const DEFAULT_BACKGROUND_GRADIENT: readonly [string, string] = ['#6366f1', '#22d3ee'];
const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const DEFAULT_FORM_STATE: PromoFormState = {
  isActive: true,
  headline: '셀바, 학교와 교육자원을 연결합니다',
  imageUrl: '/picture/section%20right%20ad2.png',
  insertPosition: 2,
  backgroundColor: '#ffffff',
  backgroundColorMode: 'single',
  backgroundGradientStart: null,
  backgroundGradientEnd: null,
  fontColor: '#1f2937',
  fontSize: 28,
  badgeColor: '#dbeafe',
  badgeColorMode: 'single',
  badgeGradientStart: null,
  badgeGradientEnd: null,
  imageScale: 1
};

const cloneForm = (form: PromoFormState): PromoFormState => ({ ...form });

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
  imageScale: typeof settings.imageScale === 'number' ? settings.imageScale : 1
});

const formatDate = (date: Date | null) => {
  if (!date) {
    return '저장 이력 없음';
  }
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
};

type PostgrestErrorLike = {
  code?: string | null;
};

const isTableMissingError = (error: unknown) => {
  if (error && typeof error === 'object' && 'code' in error) {
    const candidate = error as PostgrestErrorLike;
    return candidate.code === 'PGRST205';
  }
  return false;
};

interface UsePromoCardEditorOptions {
  userId: string | null;
}

export function usePromoCardEditor(options: UsePromoCardEditorOptions) {
  const { userId } = options;

  const [form, setForm] = useState<PromoFormState>(cloneForm(DEFAULT_FORM_STATE));
  const [baseline, setBaseline] = useState<PromoFormState>(cloneForm(DEFAULT_FORM_STATE));
  const [collectionId, setCollectionId] = useState<string | undefined>();
  const [cardId, setCardId] = useState<string | undefined>();
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [appliedAt, setAppliedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [applyState, setApplyState] = useState<SaveState>('idle');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const lastSavedLabel = useMemo(() => formatDate(draftSavedAt), [draftSavedAt]);
  const lastAppliedLabel = useMemo(() => formatDate(appliedAt), [appliedAt]);
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  const updateField = useCallback(
    <K extends keyof PromoFormState>(key: K, value: PromoFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }));
      setFeedback(null);
    },
    []
  );

  const parseDate = (value: string | null) => (value ? new Date(value) : null);

  const applySettingsToState = useCallback((settings: PromoCardSettings | null) => {
    if (settings) {
      const mapped = mapSettingsToForm(settings);
      const snapshot = cloneForm(mapped);
      setForm(snapshot);
      setBaseline(cloneForm(snapshot));
      setCollectionId(settings.id);
      setCardId(settings.cardId);
      setDraftSavedAt(parseDate(settings.lastDraftAt));
      setAppliedAt(parseDate(settings.lastAppliedAt));
    } else {
      const defaults = cloneForm(DEFAULT_FORM_STATE);
      setForm(defaults);
      setBaseline(cloneForm(defaults));
      setCollectionId(undefined);
      setCardId(undefined);
      setDraftSavedAt(null);
      setAppliedAt(null);
    }
  }, []);

  const resetToDefault = useCallback(() => {
    setForm(cloneForm(DEFAULT_FORM_STATE));
    setCollectionId(undefined);
    setCardId(undefined);
    setFeedback(null);
  }, []);

  // 초기 로드
  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const settings = await fetchPromoCardSettings();
        if (!active) return;

        applySettingsToState(settings ?? null);
        setFeedback(null);
        setSaveState('idle');
        setApplyState('idle');
      } catch (error) {
        console.error('프로모 카드 불러오기 실패:', error);
        if (active) {
          const message = isTableMissingError(error)
            ? '프로모 카드 테이블이 존재하지 않습니다. Supabase 마이그레이션을 적용해 주세요.'
            : '프로모 카드 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
          setLoadError(message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [applySettingsToState]);

  const buildPayload = useCallback((): PromoCardUpdateInput => {
    const headline = form.headline.trim();
    const imageValue = (form.imageUrl ?? '').trim();

    const pickGradientValue = (candidate: string | null | undefined, fallback: string): string => {
      return candidate ? candidate : fallback;
    };

    return {
      id: collectionId,
      cardId,
      isActive: form.isActive,
      headline,
      imageUrl: imageValue ? imageValue : null,
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
      imageScale: form.imageScale
    };
  }, [form, collectionId, cardId]);

  const syncFromSettings = useCallback(
    (settings: PromoCardSettings) => {
      applySettingsToState(settings);
    },
    [applySettingsToState]
  );

  const handleDraftSave = useCallback(async () => {
    if (loading || saveState === 'saving') {
      return;
    }
    setSaveState('saving');
    setFeedback(null);
    try {
      const saved = await savePromoCardDraft(buildPayload(), { userId });
      syncFromSettings(saved);
      setSaveState('saved');
      setFeedback({ type: 'success', message: '임시저장이 완료되었습니다.' });
    } catch (error) {
      console.error('프로모 카드 임시저장 실패:', error);
      setSaveState('error');
      const message = isTableMissingError(error)
        ? '프로모 카드 테이블이 존재하지 않아 저장할 수 없습니다. Supabase 마이그레이션을 적용해 주세요.'
        : '임시저장에 실패했습니다. 다시 시도해 주세요.';
      setFeedback({ type: 'error', message });
    }
  }, [loading, saveState, buildPayload, syncFromSettings, userId]);

  const handleApply = useCallback(async () => {
    if (loading || applyState === 'saving') {
      return;
    }
    setApplyState('saving');
    setFeedback(null);
    try {
      const applied = await applyPromoCardSettings(buildPayload(), { userId });
      syncFromSettings(applied);
      setApplyState('saved');
      setFeedback({ type: 'success', message: '적용이 완료되었습니다. 추천 섹션에 즉시 반영됩니다.' });
    } catch (error) {
      console.error('프로모 카드 적용 실패:', error);
      setApplyState('error');
      const message = isTableMissingError(error)
        ? '프로모 카드 테이블이 존재하지 않아 적용할 수 없습니다. Supabase 마이그레이션을 적용해 주세요.'
        : '적용에 실패했습니다. 네트워크 상태를 확인해 주세요.';
      setFeedback({ type: 'error', message });
    }
  }, [loading, applyState, buildPayload, syncFromSettings, userId]);

  return {
    // 상태
    form,
    baseline,
    collectionId,
    cardId,
    draftSavedAt,
    appliedAt,
    saveState,
    applyState,
    feedback,
    loading,
    loadError,
    lastSavedLabel,
    lastAppliedLabel,
    isDirty,
    // 액션
    updateField,
    resetToDefault,
    handleDraftSave,
    handleApply
  };
}
