const HEX_REGEX = /^#?[0-9a-fA-F]{3,6}$/;

const componentToHex = (value: number) => {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, '0');
};

const normalizeHex = (input?: string | null): string | null => {
  if (!input) {
    return null;
  }

  const trimmed = input.trim();
  if (!HEX_REGEX.test(trimmed)) {
    return null;
  }

  let hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed;
  if (hex.length === 3) {
    hex = hex
      .split('')
      .map((char) => char + char)
      .join('');
  }

  if (hex.length !== 6) {
    return null;
  }

  return `#${hex.toLowerCase()}`;
};

const lightenHex = (hex: string, ratio: number): string => {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return '#ffffff';
  }

  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  const mix = (channel: number) => channel + (255 - channel) * ratio;

  return `#${componentToHex(mix(r))}${componentToHex(mix(g))}${componentToHex(mix(b))}`;
};

const darkenHex = (hex: string, ratio: number): string => {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return '#1f2937';
  }

  const value = normalized.slice(1);
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);

  const mix = (channel: number) => channel * (1 - ratio);

  return `#${componentToHex(mix(r))}${componentToHex(mix(g))}${componentToHex(mix(b))}`;
};

export const createBadgeGradient = (input?: string | null, fallback: string = '#dbeafe'): string => {
  const base = normalizeHex(input) ?? normalizeHex(fallback) ?? '#dbeafe';
  const darker = darkenHex(base, 0.35);
  const lighter = lightenHex(base, 0.4);
  return `linear-gradient(90deg, ${darker} 0%, ${base} 50%, ${lighter} 100%)`;
};
