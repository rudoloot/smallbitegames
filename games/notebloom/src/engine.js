import { terrainProfile } from './terrain.js?v=d1310a12066c';
import { analyzeMood } from './mood.js?v=d1310a12066c';
export const STARTING_POWER = 100;
export const RULES = {
  normal: { miss: 4, mine: 48, heal: 4, mineEvery: 3 },
};
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function seededRandom(seed) {
  let x = seed >>> 0;
  return () => { x = (1664525 * x + 1013904223) >>> 0; return x / 4294967296; };
}

// Detect actual attacks across bass/mid/high bands. Keep their measured timestamps;
// the global tempo estimate below is only used for travel margins and UI.
export function detectBeatTimes(samples, sampleRate) {
  const stride = Math.max(1, Math.floor(sampleRate / 12000));
  const rate = sampleRate / stride, hop = Math.max(1, Math.round(rate * .005));
  const step = hop / rate, frames = Math.ceil(samples.length / stride / hop);
  const bands = Array.from({ length: 3 }, () => new Float32Array(frames));
  const lowAlpha = 1 - Math.exp(-2 * Math.PI * 180 / rate);
  const midAlpha = 1 - Math.exp(-2 * Math.PI * 2200 / rate);
  let low = 0, mid = 0, sampleIndex = 0;
  for (let f = 0; f < frames; f++) {
    for (let j = 0; j < hop && sampleIndex < samples.length; j++, sampleIndex += stride) {
      const value = samples[sampleIndex];
      low += lowAlpha * (value - low); mid += midAlpha * (value - mid);
      bands[0][f] += low * low; bands[1][f] += (mid - low) ** 2; bands[2][f] += (value - mid) ** 2;
    }
    for (const band of bands) band[f] = Math.sqrt(band[f] / hop);
  }
  const novelty = new Float32Array(frames), energy = new Float32Array(frames);
  for (const band of bands) {
    const peak = band.reduce((a, b) => Math.max(a, b), 0);
    if (peak < .0001) continue;
    for (let f = 1; f < frames; f++) {
      energy[f] += band[f];
      const previous = (band[f - 1] + (band[f - 2] || 0) + (band[f - 3] || 0)) / 3;
      novelty[f] += Math.max(0, band[f] - previous) / peak;
    }
  }
  const peakEnergy = energy.reduce((a, b) => Math.max(a, b), 0);
  const prefix = new Float64Array(frames + 1);
  for (let f = 0; f < frames; f++) prefix[f + 1] = prefix[f] + novelty[f];
  const radius = Math.round(.2 / step), candidates = [];
  for (let f = 4; f < frames - 4; f++) {
    const from = Math.max(0, f - radius), to = Math.min(frames, f + radius + 1);
    const average = (prefix[to] - prefix[from]) / (to - from);
    if (energy[f] < Math.max(.0005, peakEnergy * .015) || novelty[f] < Math.max(.025, average * 1.65)) continue;
    let peak = true;
    for (let j = f - 4; j <= f + 4; j++) if (novelty[j] > novelty[f] || (j < f && novelty[j] === novelty[f])) peak = false;
    if (!peak) continue;
    // Backtrack to the start of the transient instead of its loudest frame.
    let onset = f;
    while (onset > f - 4 && novelty[onset - 1] > novelty[f] * .2) onset--;
    candidates.push({ time: onset * step, strength: novelty[f] });
  }
  // Suppress flams and hi-hat subdivisions that would make the road unreadable.
  const selected = [];
  for (const candidate of candidates.sort((a, b) => b.strength - a.strength)) {
    if (!selected.some(other => Math.abs(other.time - candidate.time) < .24)) selected.push(candidate);
  }
  return selected.sort((a, b) => a.time - b.time).map(candidate => candidate.time);
}

export function analyzeSamples(samples, sampleRate) {
  const hop = Math.max(1, Math.round(sampleRate * .01)), frames = Math.floor(samples.length / hop);
  const energy = new Float32Array(frames), onset = new Float32Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let j = 0; j < hop; j += 4) { const v = samples[f * hop + j] || 0; sum += v * v; }
    energy[f] = Math.sqrt(sum / Math.ceil(hop / 4));
    if (f > 0) onset[f] = Math.max(0, energy[f] - energy[f - 1]);
  }
  let bestLag = 50, bestScore = 0;
  for (let lag = 35; lag <= 75; lag++) {
    let score = 0;
    for (let i = lag; i < frames; i++) score += onset[i] * onset[i - lag];
    if (score > bestScore) { bestScore = score; bestLag = lag; }
  }
  let phase = 0, phaseScore = -1;
  for (let p = 0; p < bestLag; p++) {
    let score = 0;
    for (let i = p; i < frames; i += bestLag) score += onset[i];
    if (score > phaseScore) { phaseScore = score; phase = p; }
  }
  const peaks = Array.from({ length: 60 }, (_, i) => {
    const begin = Math.floor(i * frames / 60), end = Math.max(begin + 1, Math.floor((i + 1) * frames / 60));
    let sum = 0; for (let j = begin; j < end; j++) sum += energy[j] || 0;
    return sum / (end - begin);
  });
  const max = Math.max(...peaks, .001);
  return { mood: analyzeMood(samples, sampleRate, 60 / (bestLag * hop / sampleRate)), terrain: terrainProfile(energy, hop / sampleRate), bpm: 60 / (bestLag * hop / sampleRate), beat: bestLag * hop / sampleRate, offset: phase * hop / sampleRate, peaks: peaks.map(p => p / max), beatTimes: detectBeatTimes(samples, sampleRate) };
}

export { makeChart, GameState, LANE_COUNT, laneX } from './combat.js?v=d1310a12066c';
