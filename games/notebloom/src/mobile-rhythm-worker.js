import * as ort from '../vendor/onnxruntime-web/dist/ort.wasm.min.mjs?v=b8cbb4f66a3f';
import {extractMobileFeatures, measuredMobileAttacks, modelWindows, MOBILE_MELS} from './mobile-audio-features.js?v=b8cbb4f66a3f';
import {buildMobileRhythm} from './mobile-rhythm-select.js?v=b8cbb4f66a3f';
import {rhythmCache} from './rhythm-cache.js?v=b8cbb4f66a3f';
import {MOBILE_MODEL_HASH as MODEL_HASH, MOBILE_MODEL_BYTES} from '../models/beat-this/config.js?v=b8cbb4f66a3f';

const progress = text => postMessage({type:'progress',text});

async function modelBytes() {
  const key = `model:${MODEL_HASH}`, cached = await rhythmCache('get', key);
  if (cached instanceof ArrayBuffer && cached.byteLength === MOBILE_MODEL_BYTES) return cached;
  progress('기기 분석 모델을 준비하는 중 · 처음에는 약 23MB를 내려받아요');
  const response = await fetch(new URL(`../models/beat-this/small0.onnx?v=${MODEL_HASH}`, import.meta.url));
  if (!response.ok) throw new Error('음악 분석 모델을 불러오지 못했어요. 인터넷 연결을 확인해 주세요.');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength !== MOBILE_MODEL_BYTES) throw new Error('음악 분석 모델 파일이 불완전해요. 다시 시도해 주세요.');
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const actual = [...new Uint8Array(digest)].map(value=>value.toString(16).padStart(2,'0')).join('');
    if (actual !== MODEL_HASH) throw new Error('음악 분석 모델을 확인하지 못했어요. 다시 시도해 주세요.');
  }
  await rhythmCache('put', key, bytes);
  return bytes;
}

self.onmessage = async ({data:{samples,duration}}) => {
  let session;
  try {
    progress('기기 안에서 음악의 타격음을 찾는 중');
    const features = extractMobileFeatures(samples);
    const attacks = measuredMobileAttacks(samples, features);
    const beats = new Float32Array(features.frames).fill(-1000), downbeats = beats.slice();
    if (attacks.length) {
      // One CPU thread in our own worker: no WebGPU, SharedArrayBuffer,
      // COOP/COEP headers or native Python server is required.
      ort.env.wasm.numThreads = 1;
      ort.env.logLevel = 'error';
      ort.env.wasm.proxy = false;
      ort.env.wasm.wasmPaths = new URL('../vendor/onnxruntime-web/dist/', import.meta.url).href;
      const bytes = await modelBytes();
      session = await ort.InferenceSession.create(bytes, {executionProviders:['wasm'],
        graphOptimizationLevel:'all', enableCpuMemArena:false, enableMemPattern:false});
      const windows = modelWindows(features.frames);
      for (const [index, window] of windows.entries()) {
        progress(`기기 안에서 박자와 강세를 분석하는 중 · ${Math.round(index / windows.length * 100)}%`);
        const frames = window.to - window.from + window.left + window.right;
        const spect = new Float32Array(frames * MOBILE_MELS);
        spect.set(features.spect.subarray(window.from * MOBILE_MELS, window.to * MOBILE_MELS), window.left * MOBILE_MELS);
        const input = new ort.Tensor('float32', spect, [1,frames,MOBILE_MELS]);
        const output = await session.run({spect:input});
        // Earlier windows own overlaps, matching upstream keep_first.
        for (let frame = 6; frame < frames - 6; frame++) {
          const target = window.start + frame;
          if (target >= 0 && target < features.frames && beats[target] === -1000) {
            beats[target] = output.beat.data[frame]; downbeats[target] = output.downbeat.data[frame];
          }
        }
        input.dispose(); output.beat.dispose(); output.downbeat.dispose();
      }
    }
    const rhythm = buildMobileRhythm(duration, attacks, beats, downbeats);
    postMessage({type:'result',rhythm});
  } catch (error) {
    postMessage({type:'error',message:error.message || '기기에서 음악을 분석하지 못했어요. 다른 음원으로 다시 시도해 주세요.'});
  } finally { if (session) await session.release().catch(()=>{}); }
};
