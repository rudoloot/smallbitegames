const STORAGE_KEY = 'notebloom.movementSensitivity.v1';

export function normalizeSensitivity(value) {
  if (value == null || (typeof value !== 'number' && typeof value !== 'string') || String(value).trim() === '') return 1;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(Math.max(.5, Math.min(2, number)) * 20) / 20 : 1;
}

export function readSensitivity(storage) {
  try { return normalizeSensitivity((storage ?? globalThis.localStorage)?.getItem(STORAGE_KEY)); }
  catch { return 1; }
}

export function saveSensitivity(value, storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    if (!target) return false;
    target.setItem(STORAGE_KEY, String(normalizeSensitivity(value)));
    return true;
  } catch { return false; }
}

// One logical lane at 100% matches the original drag distance on every viewport.
export function draggedPlayerX(start, deltaPixels, viewWidth, sensitivity = 1) {
  return Math.max(-1.5, Math.min(1.5, start + deltaPixels / (viewWidth * .135) * normalizeSensitivity(sensitivity)));
}
