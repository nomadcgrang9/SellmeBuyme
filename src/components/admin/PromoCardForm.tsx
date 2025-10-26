import { useMemo } from 'react';
import { IconRotate, IconDeviceFloppy, IconCheck } from '@tabler/icons-react';
import { normalizeHex } from '@/lib/colorUtils';
import ColorInputField from './ColorInputField';
import type { ColorMode } from '@/types';

export type PromoFormState = {
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

interface PromoCardFormProps {
  form: PromoFormState;
  onFieldChange: <K extends keyof PromoFormState>(key: K, value: PromoFormState[K]) => void;
  onReset: () => void;
  onDraftSave: () => void;
  onApply: () => void;
  isDirty: boolean;
  isLoading: boolean;
  isSaving: boolean;
  isApplying: boolean;
  lastSavedLabel: string;
  lastAppliedLabel: string;
}

export default function PromoCardForm({
  form,
  onFieldChange,
  onReset,
  onDraftSave,
  onApply,
  isDirty,
  isLoading,
  isSaving,
  isApplying,
  lastSavedLabel,
  lastAppliedLabel
}: PromoCardFormProps) {
  const handleBackgroundModeChange = (mode: ColorMode) => {
    onFieldChange('backgroundColorMode', mode);
    onFieldChange(
      'backgroundGradientStart',
      mode === 'gradient'
        ? pickGradientValue(form.backgroundGradientStart, DEFAULT_BACKGROUND_GRADIENT[0])
        : form.backgroundGradientStart
    );
    onFieldChange(
      'backgroundGradientEnd',
      mode === 'gradient'
        ? pickGradientValue(form.backgroundGradientEnd, DEFAULT_BACKGROUND_GRADIENT[1])
        : form.backgroundGradientEnd
    );
  };

  const handleBadgeModeChange = (mode: ColorMode) => {
    onFieldChange('badgeColorMode', mode);
    onFieldChange(
      'badgeGradientStart',
      mode === 'gradient'
        ? pickGradientValue(form.badgeGradientStart, DEFAULT_BADGE_GRADIENT[0])
        : form.badgeGradientStart
    );
    onFieldChange(
      'badgeGradientEnd',
      mode === 'gradient'
        ? pickGradientValue(form.badgeGradientEnd, DEFAULT_BADGE_GRADIENT[1])
        : form.badgeGradientEnd
    );
  };

  const statusBadges = useMemo(
    () => (
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
    ),
    [lastSavedLabel, lastAppliedLabel, isDirty]
  );

  const actionButtons = useMemo(
    () => (
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50"
          disabled={isSaving || isApplying}
        >
          <IconRotate size={16} stroke={1.8} />
          기본값 불러오기
        </button>
        <button
          type="button"
          onClick={onDraftSave}
          className="inline-flex items-center gap-2 rounded-lg border border-primary/60 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading || isSaving || isApplying}
        >
          <IconDeviceFloppy size={16} stroke={1.8} />
          {isSaving ? '저장 중...' : '임시저장'}
        </button>
        <button
          type="button"
          onClick={onApply}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isLoading || isApplying}
        >
          <IconCheck size={16} stroke={1.8} />
          {isApplying ? '적용 중...' : '적용하기'}
        </button>
      </div>
    ),
    [onReset, onDraftSave, onApply, isLoading, isSaving, isApplying]
  );

  return (
    <div className="space-y-5">
      {statusBadges}
      {actionButtons}

      <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-5 py-4">
        <h4 className="text-sm font-semibold text-slate-800">노출 및 삽입 위치</h4>
        <div className="mt-3 flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm text-slate-600">
          <span>프로모 카드 노출</span>
          <label className="flex items-center gap-2 font-medium">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => onFieldChange('isActive', event.target.checked)}
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
              onChange={(event) => onFieldChange('insertPosition', Number(event.target.value))}
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
              onChange={(event) => onFieldChange('fontSize', Number(event.target.value))}
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
              onChange={(event) => onFieldChange('headline', event.target.value)}
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
                    onChange={(next) => onFieldChange('backgroundGradientStart', next)}
                  />
                  <ColorInputField
                    label="끝 색상"
                    value={form.backgroundGradientEnd ?? DEFAULT_BACKGROUND_GRADIENT[1]}
                    onChange={(next) => onFieldChange('backgroundGradientEnd', next)}
                  />
                </>
              ) : (
                <ColorInputField
                  label="배경 색상"
                  value={form.backgroundColor}
                  onChange={(next) => onFieldChange('backgroundColor', next)}
                />
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <ColorInputField
              label="폰트 색상"
              value={form.fontColor}
              onChange={(next) => onFieldChange('fontColor', next)}
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
                    onChange={(next) => onFieldChange('badgeGradientStart', next)}
                    helperText="HEX 형식(#RRGGBB)으로 입력해 주세요."
                  />
                  <ColorInputField
                    label="끝 색상"
                    value={form.badgeGradientEnd ?? DEFAULT_BADGE_GRADIENT[1]}
                    onChange={(next) => onFieldChange('badgeGradientEnd', next)}
                    helperText="HEX 형식(#RRGGBB)으로 입력해 주세요."
                  />
                </>
              ) : (
                <ColorInputField
                  label="띠지 색상"
                  value={form.badgeColor}
                  onChange={(next) => onFieldChange('badgeColor', next)}
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
                onChange={(event) => onFieldChange('imageScale', Number(event.target.value) / 100)}
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
                    onFieldChange('imageScale', Math.min(Math.max(value, 50), 150) / 100);
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
              onChange={(event) => onFieldChange('imageUrl', event.target.value)}
              placeholder="https://"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
            <span className="mt-1 text-xs text-slate-400">정사각형 또는 가로형 이미지를 추천합니다.</span>
          </label>
        </div>
      </section>
    </div>
  );
}
