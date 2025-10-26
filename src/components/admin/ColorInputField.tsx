import { useEffect, useMemo, useState } from 'react';
import { normalizeHex } from '@/lib/colorUtils';

interface ColorInputFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  helperText?: string;
}

const DEFAULT_HEX = '#ffffff';

export default function ColorInputField({ label, value, onChange, helperText }: ColorInputFieldProps) {
  const normalizedInitial = useMemo(() => normalizeHex(value) ?? DEFAULT_HEX, [value]);
  const [draft, setDraft] = useState(normalizedInitial);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setDraft(normalizedInitial);
    setHasError(false);
  }, [normalizedInitial]);

  const handleColorChange = (next: string) => {
    const normalized = normalizeHex(next) ?? DEFAULT_HEX;
    setDraft(normalized);
    setHasError(false);
    if (normalized !== value) {
      onChange(normalized);
    }
  };

  const handleTextBlur = () => {
    const normalized = normalizeHex(draft);
    if (!normalized) {
      setHasError(true);
      setDraft(normalizedInitial);
      return;
    }

    setHasError(false);
    if (normalized !== value) {
      onChange(normalized);
    }
    setDraft(normalized);
  };

  return (
    <label className="flex flex-col text-sm text-slate-600">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="color"
          value={normalizeHex(draft) ?? DEFAULT_HEX}
          onChange={(event) => handleColorChange(event.target.value)}
          className="h-12 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white"
        />
        <input
          type="text"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value);
            setHasError(false);
          }}
          onBlur={handleTextBlur}
          placeholder="#FFFFFF"
          className={`w-full rounded-lg border px-3 py-2 text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${
            hasError ? 'border-red-400 focus:border-red-400' : 'border-slate-200 focus:border-primary'
          }`}
        />
      </div>
      <span className={`mt-1 text-xs ${hasError ? 'text-red-500' : 'text-slate-400'}`}>
        {hasError ? '유효한 HEX 색상 값이 아니에요. 예) #1F2937' : helperText ?? 'HEX 형식(#RRGGBB)으로 직접 입력할 수 있어요.'}
      </span>
    </label>
  );
}
