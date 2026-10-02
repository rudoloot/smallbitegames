import { localTrackFromFile } from './music.js?v=6881de7cd7ab';

export function libraryTrack(file) {
  // Stable identity prevents duplicate rows when the same file is selected again.
  return localTrackFromFile(file, encodeURIComponent(JSON.stringify([file.name, file.size, file.lastModified || 0])));
}

function openLibrary(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('tracks', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error('음원 보관함을 열 수 없습니다.'));
  });
}

async function transaction(mode, operation, name) {
  const db = await openLibrary(name);
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('tracks', mode), request = operation(tx.objectStore('tracks'));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error || new Error('음원 저장이 취소되었습니다.'));
    });
  } finally { db.close(); }
}

export const saveLibraryTrack = (track, name = 'notebloom.music.v1') => transaction('readwrite', store => store.put(track), name);
export const loadLibraryTracks = (name = 'notebloom.music.v1') => transaction('readonly', store => store.getAll(), name);
