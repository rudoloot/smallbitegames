import {MOBILE_MODEL_HASH} from '../models/beat-this/config.js?v=67d77c6fbbe3';
import {validateRhythm} from './rhythm.js?v=67d77c6fbbe3';
// Cache failures (private browsing or quota limits) must not disable analysis.
const DATABASE = 'notebloom.rhythm.mobile.v1';
export async function rhythmCache(action, key, value) {
  if (typeof indexedDB === 'undefined') return undefined;
  let db;
  try {
    db = await new Promise((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore('values');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('Cache blocked'));
    });
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('values', action === 'get' ? 'readonly' : 'readwrite');
      const store = transaction.objectStore('values');
      const request = action === 'get' ? store.get(key) : store.put(value, key);
      transaction.oncomplete = () => resolve(action === 'get' ? request.result : true);
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  } catch { return undefined; }
  finally { db?.close(); }
}

// Original bytes remain identical across decoder/output sample-rate changes.
// Include model and selection versions so incompatible charts are rebuilt.
export function fileRhythmKey(bytes) {
  const values = new Uint8Array(bytes);
  let first = 2166136261, second = 2246822519;
  for (const value of values) {
    first = Math.imul(first ^ value, 16777619);
    second = Math.imul(second ^ value, 3266489917);
  }
  return `analysis:file-small0-v2:${MOBILE_MODEL_HASH}:${values.length}:${first>>>0}:${second>>>0}`;
}

export async function reuseRhythm(key, duration, create, onProgress = () => {}, cache = rhythmCache) {
  onProgress('저장된 음표 정보를 확인하는 중');
  const saved = await cache('get', key);
  if (saved) {
    try {
      const rhythm = validateRhythm(saved, duration);
      onProgress('저장된 음표 정보를 불러왔어요');
      return rhythm;
    } catch { /* A corrupt or incompatible entry must not prevent playing. */ }
  }
  const rhythm = validateRhythm(await create(), duration);
  const stored = await cache('put', key, rhythm);
  onProgress(stored ? '음표 정보를 기기에 저장했어요'
    : '기기 저장 공간을 사용할 수 없어 다음 실행 때 다시 분석할 수 있어요');
  return rhythm;
}

// Deterministic PCM fingerprint for caching, not security/authentication.
// Also works on HTTP LAN addresses where Web Crypto is unavailable.
export function pcmCacheKey(samples, duration) {
  const bits = new Uint32Array(samples.buffer, samples.byteOffset, samples.length);
  let first = 2166136261, second = 2246822519;
  for (const bit of bits) {
    first = Math.imul(first ^ bit, 16777619);
    second = Math.imul(second ^ bit, 3266489917);
  }
  return `analysis:small0-v2:${MOBILE_MODEL_HASH}:${samples.length}:${duration.toFixed(6)}:${first>>>0}:${second>>>0}`;
}
