import {validateRhythm} from './rhythm.js?v=67d77c6fbbe3';
import {fileRhythmKey, reuseRhythm} from './rhythm-cache.js?v=67d77c6fbbe3';

export async function loadRhythm(track, duration, onProgress = () => {}, buffer) {
  if (!track.localFile) {
    try {
      const response = await fetch(new URL(`../charts/${encodeURIComponent(track.id)}.json?v=67d77c6fbbe3`, import.meta.url));
      if (response.ok) {
        const rhythm = validateRhythm(await response.json(), duration);
        onProgress('준비된 음표 정보를 불러왔어요');
        return rhythm;
      }
    } catch { /* Missing/stale catalog charts can also be analysed on-device. */ }
  }
  const bytes = track.localFile ? await track.localFile.arrayBuffer() : null;
  async function analyse() {
    if (!buffer) {
      const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
      if (!Offline) throw new Error('음악을 분석할 수 없어요. 최신 브라우저로 다시 시도해 주세요.');
      const context = new Offline(1, 1, 22050);
      const audioBytes = bytes || await (await fetch(new URL(`../music/${encodeURIComponent(track.file)}`, import.meta.url))).arrayBuffer();
      buffer = await context.decodeAudioData(audioBytes.slice(0));
    }
    // Built-in precomputed charts never download the model/runtime.
    const {analyzeOnDevice} = await import('./mobile-rhythm.js?v=67d77c6fbbe3');
    return analyzeOnDevice(buffer, onProgress);
  }
  return bytes ? reuseRhythm(fileRhythmKey(bytes), duration, analyse, onProgress) : analyse();
}
