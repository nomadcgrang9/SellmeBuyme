import { useEffect, useMemo, useState } from 'react';
import { IconDeviceFloppy, IconCheck, IconRotate, IconSparkles, IconPhoto } from '@tabler/icons-react';
import { createBadgeGradient, normalizeHex } from '@/lib/colorUtils';
import ColorInputField from './ColorInputField';

import type { ColorMode, PromoCardSettings, PromoCardUpdateInput } from '@/types';
import {
  fetchPromoCardSettings,
  savePromoCardDraft,
  applyPromoCardSettings
} from '@/lib/supabase/queries';
import { useAuthStore } from '@/stores/authStore';

type PromoFormState = {
  isActive: boolean;
  headline: string;
  imageUrl: string | null;
  insertPosition: number;
  backgroundColor: string;
  backgroundColorMode: ColorMode;
  backgroundGradientStart: string | null;
  backgroundGradientEnd: string | null;
  fontColor: string;
  fontSize: number;
  badgeColor: string;
  badgeColorMode: ColorMode;
  badgeGradientStart: string | null;
  badgeGradientEnd: string | null;
  imageScale: number;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Feedback = {
  type: 'success' | 'error';
  message: string;
};

const DEFAULT_BACKGROUND_GRADIENT: readonly [string, string] = ['#6366f1', '#22d3ee'];
const DEFAULT_BADGE_GRADIENT: readonly [string, string] = ['#f97316', '#facc15'];

const pickGradientValue = (candidate: string | null | undefined, fallback: string): string =>
  normalizeHex(candidate) ?? fallback;

function ColorModeToggle({ value, onChange }: { value: ColorMode; onChange: (mode: ColorMode) => void }) {
  return (
    <div className="flex overflow-hidden rounded-lg border border-slate-200 text-xs font-semibold text-slate-500">
      {(['single', 'gradient'] as ColorMode[]).map((mode) => (
        <button
          key={mode}
          type="button"
          onClick={() => onChange(mode)}
          className={`px-3 py-1 transition-colors ${
            value === mode ? 'bg-primary text-white' : 'bg-white hover:bg-slate-50'
          }`}
        >
          {mode === 'single' ? '단일색' : '그라데이션'}
        </button>
      ))}
    </div>
  );
}

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

const cloneForm = (form: PromoFormState): PromoFormState => ({ ...form });

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

function PromoCardPreview({ data }: { data: PromoFormState }) {
  const headlineStyle = useMemo(
    () => ({
      color: data.fontColor,
      fontSize: `${data.fontSize}px`
    }),
    [data.fontColor, data.fontSize]
  );

  const backgroundStyle = useMemo(() => {
    if (data.backgroundColorMode === 'gradient') {
      const start = pickGradientValue(data.backgroundGradientStart, DEFAULT_BACKGROUND_GRADIENT[0]);
      const end = pickGradientValue(data.backgroundGradientEnd, DEFAULT_BACKGROUND_GRADIENT[1]);
      return { backgroundImage: `linear-gradient(135deg, ${start} 0%, ${end} 100%)` };
    }
    return { backgroundColor: data.backgroundColor };
  }, [data.backgroundColorMode, data.backgroundColor, data.backgroundGradientStart, data.backgroundGradientEnd]);

  const badgeBarStyle = useMemo(
    () => ({
      backgroundImage:
        data.badgeColorMode === 'gradient'
          ? `linear-gradient(90deg, ${pickGradientValue(
              data.badgeGradientStart,
              DEFAULT_BADGE_GRADIENT[0]
            )} 0%, ${pickGradientValue(data.badgeGradientEnd, DEFAULT_BADGE_GRADIENT[1])} 100%)`
          : createBadgeGradient(data.badgeColor)
    }),
    [data.badgeColor, data.badgeColorMode, data.badgeGradientStart, data.badgeGradientEnd]
  );

  const clampedImageScale = useMemo(
    () => Math.min(Math.max(data.imageScale ?? 1, 0.5), 1.5),
    [data.imageScale]
  );

  const imageWrapperStyle = useMemo(
    () => ({
      height: `${180 * clampedImageScale}px`
    }),
    [clampedImageScale]
  );

  const imageStyle = useMemo(
    () => ({
      maxHeight: `${170 * clampedImageScale}px`,
      maxWidth: `${260 * clampedImageScale}px`
    }),
    [clampedImageScale]
  );

  const placeholderStyle = useMemo(
    () => ({
      height: `${170 * clampedImageScale}px`,
      maxWidth: `${260 * clampedImageScale}px`
    }),
    [clampedImageScale]
  );

  return (
    <div className="sticky top-0 space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span className="font-semibold text-slate-600">미리보기</span>
        <span>{data.isActive ? '노출 중' : '비활성화'}</span>
      </div>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="w-full" style={{ ...badgeBarStyle, height: '2px' }} />
        <div className="flex items-center gap-2 bg-white px-4 py-3 text-xs font-semibold uppercase text-primary">
          <IconSparkles size={14} stroke={1.8} />
          <span>셀바 프로모 카드</span>
          <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            삽입 위치 {data.insertPosition}
          </span>
        </div>
        <div
          className="flex flex-col items-center gap-4 px-5 py-6 text-center transition-colors"
          style={backgroundStyle}
        >
          <h3 className="font-bold leading-tight whitespace-pre-line" style={headlineStyle}>
            {data.headline || '헤드라인을 입력해 주세요'}
          </h3>
          <div className="flex w-full items-center justify-center" style={imageWrapperStyle}>
            {data.imageUrl ? (
              <div className="flex h-full w-full items-center justify-center rounded-xl bg-white/70 p-3">
                <img
                  src={data.imageUrl}
                  alt={data.headline || '프로모 카드 이미지'}
                  className="w-auto object-contain drop-shadow"
                  style={imageStyle}
                  draggable={false}
                />
              </div>
            ) : (
              <div
                className="flex w-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 text-slate-400"
                style={placeholderStyle}
              >
                <IconPhoto size={28} stroke={1.8} />
                <p className="mt-2 text-xs">이미지 미선택</p>
              </div>
            )}
          </div>
        </div>
        {!data.isActive && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm">
            <div className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white">노출 비활성화 상태</div>
          </div>
        )}
      </div>
      <div className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-xs text-slate-500">
        <p className="font-medium text-slate-600">실제 반영 위치</p>
        <p className="mt-1 leading-relaxed">
          추천 섹션의 캐러셀 {data.insertPosition}번째 아이템에 삽입됩니다. 위치는 숫자를 조절해 변경할 수 있습니다.
        </p>
      </div>
    </div>
  );
}

export default function PromoCardContent() {
  const [form, setForm] = useState<PromoFormState>(cloneForm(DEFAULT_FORM_STATE));
  const [baseline, setBaseline] = useState<PromoFormState>(cloneForm(DEFAULT_FORM_STATE));
  const [recordId, setRecordId] = useState<string | undefined>();
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [appliedAt, setAppliedAt] = useState<Date | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [applyState, setApplyState] = useState<SaveState>('idle');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const userId = useAuthStore((state) => state.user?.id ?? null);

  const lastSavedLabel = useMemo(() => formatDate(draftSavedAt), [draftSavedAt]);
  const lastAppliedLabel = useMemo(() => formatDate(appliedAt), [appliedAt]);
  const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(baseline), [form, baseline]);

  const updateField = <K extends keyof PromoFormState>(key: K, value: PromoFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFeedback(null);
  };

  const handleBackgroundModeChange = (mode: ColorMode) => {
    setForm((prev) => ({
      ...prev,
      backgroundColorMode: mode,
      backgroundGradientStart:
        mode === 'gradient'
          ? pickGradientValue(prev.backgroundGradientStart, DEFAULT_BACKGROUND_GRADIENT[0])
          : prev.backgroundGradientStart,
      backgroundGradientEnd:
        mode === 'gradient'
          ? pickGradientValue(prev.backgroundGradientEnd, DEFAULT_BACKGROUND_GRADIENT[1])
          : prev.backgroundGradientEnd
    }));
    setFeedback(null);
  };

  const handleBadgeModeChange = (mode: ColorMode) => {
    setForm((prev) => ({
      ...prev,
      badgeColorMode: mode,
      badgeGradientStart:
        mode === 'gradient'
          ? pickGradientValue(prev.badgeGradientStart, DEFAULT_BADGE_GRADIENT[0])
          : prev.badgeGradientStart,
      badgeGradientEnd:
        mode === 'gradient'
          ? pickGradientValue(prev.badgeGradientEnd, DEFAULT_BADGE_GRADIENT[1])
          : prev.badgeGradientEnd
    }));
    setFeedback(null);
  };

  const parseDate = (value: string | null) => (value ? new Date(value) : null);

  const applySettingsToState = (settings: PromoCardSettings | null) => {
    if (settings) {
      const mapped = mapSettingsToForm(settings);
      const snapshot = cloneForm(mapped);
      setForm(snapshot);
      setBaseline(cloneForm(snapshot));
      setRecordId(settings.id);
      setDraftSavedAt(parseDate(settings.lastDraftAt));
      setAppliedAt(parseDate(settings.lastAppliedAt));
    } else {
      const defaults = cloneForm(DEFAULT_FORM_STATE);
      setForm(defaults);
      setBaseline(cloneForm(defaults));
      setRecordId(undefined);
      setDraftSavedAt(null);
      setAppliedAt(null);
    }
  };

  const resetToDefault = () => {
    setForm(cloneForm(DEFAULT_FORM_STATE));
    setFeedback(null);
  };

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
  }, []);

  const buildPayload = (): PromoCardUpdateInput => {
    const headline = form.headline.trim();
    const imageValue = (form.imageUrl ?? '').trim();

    return {
      id: recordId,
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
  };

  const syncFromSettings = (settings: PromoCardSettings) => {
    applySettingsToState(settings);
  };

  const handleDraftSave = async () => {
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
  };

  const handleApply = async () => {
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
  };

  return (
    <div className="space-y-4">
      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">불러오는 중...</div>
      )}
      {loadError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{loadError}</div>
      )}
      {feedback && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
        >
          {feedback.message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          임시저장 {lastSavedLabel}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
          최근 적용 {lastAppliedLabel}
        </span>
        {isDirty && (
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
            변경 사항 감지됨
          </span>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={resetToDefault}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          disabled={saveState === 'saving' || applyState === 'saving'}
        >
          <IconRotate size={16} stroke={1.8} />
          기본값 불러오기
        </button>
        <button
          type="button"
          onClick={handleDraftSave}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || saveState === 'saving' || applyState === 'saving'}
        >
          <IconDeviceFloppy size={16} stroke={1.8} />
          {saveState === 'saving' ? '저장 중...' : '임시저장'}
        </button>
        <button
          type="button"
          onClick={handleApply}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading || applyState === 'saving'}
        >
          <IconCheck size={16} stroke={1.8} />
          {applyState === 'saving' ? '적용 중...' : '적용하기'}
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <div className="space-y-5">
          <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
            <h4 className="text-sm font-semibold text-slate-800">노출 및 삽입 위치</h4>
            <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
              <span>프로모 카드 노출</span>
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(event) => updateField('isActive', event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                활성화
              </label>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">삽입 순서</span>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={form.insertPosition}
                  onChange={(event) => updateField('insertPosition', Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
              <label className="flex flex-col text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">폰트 크기</span>
                <input
                  type="number"
                  min={18}
                  max={48}
                  value={form.fontSize}
                  onChange={(event) => updateField('fontSize', Number(event.target.value))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
            <h4 className="text-sm font-semibold text-slate-800">콘텐츠</h4>
            <div className="mt-3 space-y-4">
              <label className="flex flex-col text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">헤드라인</span>
                <textarea
                  value={form.headline}
                  onChange={(event) => updateField('headline', event.target.value)}
                  maxLength={120}
                  rows={3}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="mt-1 text-xs text-slate-400">줄바꿈으로 두 줄까지 구성할 수 있습니다.</span>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
            <h4 className="text-sm font-semibold text-slate-800">시각 요소</h4>
            <div className="mt-3 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">배경 색상</span>
                  <ColorModeToggle value={form.backgroundColorMode} onChange={handleBackgroundModeChange} />
                </div>
                <div className={`mt-3 grid gap-3 ${form.backgroundColorMode === 'gradient' ? 'sm:grid-cols-2' : ''}`}>
                  {form.backgroundColorMode === 'gradient' ? (
                    <>
                      <ColorInputField
                        label="시작 색상"
                        value={form.backgroundGradientStart ?? DEFAULT_BACKGROUND_GRADIENT[0]}
                        onChange={(next) => updateField('backgroundGradientStart', next)}
                      />
                      <ColorInputField
                        label="끝 색상"
                        value={form.backgroundGradientEnd ?? DEFAULT_BACKGROUND_GRADIENT[1]}
                        onChange={(next) => updateField('backgroundGradientEnd', next)}
                      />
                    </>
                  ) : (
                    <ColorInputField
                      label="배경 색상"
                      value={form.backgroundColor}
                      onChange={(next) => updateField('backgroundColor', next)}
                    />
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <ColorInputField
                  label="폰트 색상"
                  value={form.fontColor}
                  onChange={(next) => updateField('fontColor', next)}
                />
              </div>

              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">띠지 색상</span>
                  <ColorModeToggle value={form.badgeColorMode} onChange={handleBadgeModeChange} />
                </div>
                <div className={`mt-3 grid gap-3 ${form.badgeColorMode === 'gradient' ? 'sm:grid-cols-2' : ''}`}>
                  {form.badgeColorMode === 'gradient' ? (
                    <>
                      <ColorInputField
                        label="시작 색상"
                        value={form.badgeGradientStart ?? DEFAULT_BADGE_GRADIENT[0]}
                        onChange={(next) => updateField('badgeGradientStart', next)}
                        helperText="HEX 형식(#RRGGBB)으로 입력해 주세요."
                      />
                      <ColorInputField
                        label="끝 색상"
                        value={form.badgeGradientEnd ?? DEFAULT_BADGE_GRADIENT[1]}
                        onChange={(next) => updateField('badgeGradientEnd', next)}
                        helperText="HEX 형식(#RRGGBB)으로 입력해 주세요."
                      />
                    </>
                  ) : (
                    <ColorInputField
                      label="띠지 색상"
                      value={form.badgeColor}
                      onChange={(next) => updateField('badgeColor', next)}
                      helperText="HEX로 입력하면 그라데이션이 더 정교해집니다."
                    />
                  )}
                </div>
              </div>

              <label className="flex flex-col text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">이미지 크기 (%)</span>
                <div className="mt-2 flex flex-col gap-2 rounded-lg border border-slate-200 bg-white px-3 py-3">
                  <input
                    type="range"
                    min={50}
                    max={150}
                    step={5}
                    value={Math.round(form.imageScale * 100)}
                    onChange={(event) => updateField('imageScale', Number(event.target.value) / 100)}
                    className="w-full"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>축소</span>
                    <span className="font-semibold text-slate-700">{Math.round(form.imageScale * 100)}%</span>
                    <span>확대</span>
                  </div>
                  <input
                    type="number"
                    min={50}
                    max={150}
                    value={Math.round(form.imageScale * 100)}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      if (!Number.isNaN(value)) {
                        updateField('imageScale', Math.min(Math.max(value, 50), 150) / 100);
                      }
                    }}
                    className="w-20 rounded border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                  <span className="text-[11px] text-slate-400">50%~150% 범위에서 이미지 표시 크기를 조절합니다.</span>
                </div>
              </label>
              <label className="flex flex-col text-sm text-slate-600">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">이미지 URL</span>
                <input
                  type="url"
                  value={form.imageUrl ?? ''}
                  onChange={(event) => updateField('imageUrl', event.target.value)}
                  placeholder="https://"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
                <span className="mt-1 text-xs text-slate-400">정사각형 또는 가로형 이미지를 추천합니다.</span>
              </label>
            </div>
          </section>
        </div>

        <PromoCardPreview data={form} />
      </div>
    </div>
  );
}