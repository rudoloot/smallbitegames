import {MOBILE_RATE} from './mobile-audio-features.js?v=b8cbb4f66a3f';
import {pcmCacheKey, rhythmCache} from './rhythm-cache.js?v=b8cbb4f66a3f';
import {validateRhythm} from './rhythm.js?v=b8cbb4f66a3f';

export async function resampleForMobile(buffer) {
  const Offline = globalThis.OfflineAudioContext || globalThis.webkitOfflineAudioContext;
  if (!Offline) throw new Error('이 브라우저에서는 음악 분석을 지원하지 않아요. 최신 브라우저로 다시 시도해 주세요.');
  const context = new Offline(1, Math.ceil(buffer.duration * MOBILE_RATE), MOBILE_RATE);
  const source = context.createBufferSource(); source.buffer = buffer;
  source.connect(context.destination); source.start();
  const rendered = await context.startRendering();
  return rendered.getChannelData(0).slice();
}

export async function analyzeOnDevice(buffer, onProgress = () => {}) {
  onProgress('기기 안에서 음악 분석을 준비하는 중');
  const samples = await resampleForMobile(buffer), key = pcmCacheKey(samples, buffer.duration);
  const cached = await rhythmCache('get', key);
  if (cached) {
    try {
      const rhythm = validateRhythm(cached, buffer.duration);
      onProgress('저장된 음표 정보를 불러왔어요');
      return rhythm;
    }
    catch { /* Ignore stale/corrupt results and reanalyse locally. */ }
  }
  if (typeof Worker === 'undefined') throw new Error('이 브라우저에서는 음악 분석을 지원하지 않아요. 최신 브라우저로 다시 시도해 주세요.');
  const rhythm = await new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./mobile-rhythm-worker.js?v=b8cbb4f66a3f', import.meta.url), {type:'module'});
    const timeout = setTimeout(()=>finish(new Error('음악 분석 시간이 너무 길어졌어요. 더 짧은 곡으로 다시 시도해 주세요.')), 15 * 60 * 1000);
    function finish(error, result) { clearTimeout(timeout); worker.terminate(); error ? reject(error) : resolve(result); }
    worker.onerror = () => finish(new Error('음악 분석 모델을 실행하지 못했어요. 페이지를 새로고침하거나 최신 브라우저로 다시 시도해 주세요.'));
    worker.onmessage = ({data}) => {
      if (data.type === 'progress') onProgress(data.text);
      else if (data.type === 'result') {
        try { finish(null, validateRhythm(data.rhythm, buffer.duration)); } catch (error) { finish(error); }
      } else if (data.type === 'error') finish(new Error(data.message));
    };
    worker.postMessage({samples,duration:buffer.duration}, [samples.buffer]);
  });
  const stored = await rhythmCache('put', key, rhythm);
  onProgress(stored ? '음표 정보를 기기에 저장했어요'
    : '기기 저장 공간을 사용할 수 없어 다음 실행 때 다시 분석할 수 있어요');
  return rhythm;
}
