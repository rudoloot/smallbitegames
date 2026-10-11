import {MOBILE_MODEL_HASH} from '../models/beat-this/config.js?v=7fcc13f571c6';
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
      transaction.oncomplete = () => resolve(request.result);
      transaction.onerror = transaction.onabort = () => reject(transaction.error);
    });
  } catch { return undefined; }
  finally { db?.close(); }
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
