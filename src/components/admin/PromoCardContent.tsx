import PromoCardForm from './PromoCardForm';
import PromoCardPreview from './PromoCardPreview';
import { usePromoCardEditor } from '@/hooks/usePromoCardEditor';
import { useAuthStore } from '@/stores/authStore';

export default function PromoCardContent() {
  const userId = useAuthStore((state) => state.user?.id ?? null);

  const {
    form,
    feedback,
    loading,
    loadError,
    lastSavedLabel,
    lastAppliedLabel,
    isDirty,
    saveState,
    applyState,
    updateField,
    resetToDefault,
    handleDraftSave,
    handleApply
  } = usePromoCardEditor({ userId });

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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
        <PromoCardForm
          form={form}
          onFieldChange={updateField}
          onReset={resetToDefault}
          onDraftSave={handleDraftSave}
          onApply={handleApply}
          isDirty={isDirty}
          isLoading={loading}
          isSaving={saveState === 'saving'}
          isApplying={applyState === 'saving'}
          lastSavedLabel={lastSavedLabel}
          lastAppliedLabel={lastAppliedLabel}
        />

        <PromoCardPreview data={form} />
      </div>
    </div>
  );
}