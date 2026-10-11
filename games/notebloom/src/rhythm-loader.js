import {validateRhythm} from './rhythm.js?v=7fcc13f571c6';

export async function loadRhythm(track, duration, onProgress = () => {}, buffer) {
  if (!track.localFile) {
    try {
      const response = await fetch(new URL(`../charts/${encodeURIComponent(track.id)}.json?v=7fcc13f571c6`, import.meta.url));
      if (response.ok) return validateRhythm(await response.json(), duration);
    } catch { /* Missing/stale catalog charts can also be analysed on-device. */ }
  }
  if (!buffer) {
    const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
    if (!Offline) throw new Error('음악을 분석할 수 없어요. 최신 브라우저로 다시 시도해 주세요.');
    const context = new Offline(1, 1, 22050);
    const bytes = track.localFile ? await track.localFile.arrayBuffer()
      : await (await fetch(new URL(`../music/${encodeURIComponent(track.file)}`, import.meta.url))).arrayBuffer();
    buffer = await context.decodeAudioData(bytes);
  }
  // Built-in precomputed charts never download the model/runtime.
  const {analyzeOnDevice} = await import('./mobile-rhythm.js?v=7fcc13f571c6');
  return analyzeOnDevice(buffer, onProgress);
}
