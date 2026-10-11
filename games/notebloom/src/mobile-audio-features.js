// Beat This! preprocessing: mono 22050 Hz, centered periodic Hann 1024,
// hop 441, magnitude / sqrt(1024), Slaney-spaced (unnormalized) 128 mel
// triangles over 30..11000 Hz, log1p(1000 * mel). See upstream LogMelSpect.
export const MOBILE_RATE = 22050;
export const MOBILE_HOP = 441;
export const MOBILE_MELS = 128;
const FFT = 1024;
const hzToMel = hz => hz < 1000 ? hz / (200 / 3) : 15 + Math.log(hz / 1000) / (Math.log(6.4) / 27);
const melToHz = mel => mel < 15 ? mel * (200 / 3) : 1000 * Math.exp((mel - 15) * Math.log(6.4) / 27);
const window = Float64Array.from({length:FFT}, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / FFT));
const reversed = Uint16Array.from({length:FFT}, (_, i) => {
  let result = 0; for (let bit = 0; bit < 10; bit++) { result = result * 2 + (i & 1); i >>= 1; } return result;
});
const cos = Float64Array.from({length:FFT / 2}, (_, i) => Math.cos(-2 * Math.PI * i / FFT));
const sin = Float64Array.from({length:FFT / 2}, (_, i) => Math.sin(-2 * Math.PI * i / FFT));
const melEdges = Float64Array.from({length:MOBILE_MELS + 2}, (_, i) => melToHz(hzToMel(30) + (hzToMel(11000) - hzToMel(30)) * i / (MOBILE_MELS + 1)));
const filters = Array.from({length:MOBILE_MELS}, (_, mel) => {
  const bins = [];
  for (let bin = 0; bin <= FFT / 2; bin++) {
    const hz = bin * MOBILE_RATE / FFT;
    const weight = Math.max(0, Math.min((hz - melEdges[mel]) / (melEdges[mel + 1] - melEdges[mel]),
      (melEdges[mel + 2] - hz) / (melEdges[mel + 2] - melEdges[mel + 1])));
    if (weight) bins.push([bin, weight]);
  }
  return bins;
});

function reflect(index, length) {
  if (length < 2) return 0;
  const period = 2 * (length - 1), folded = ((index % period) + period) % period;
  return folded < length ? folded : period - folded;
}

export function extractMobileFeatures(samples) {
  if (!(samples instanceof Float32Array) || !samples.length) throw new Error('분석할 음악이 없어요.');
  const frames = 1 + Math.floor(samples.length / MOBILE_HOP);
  const spect = new Float32Array(frames * MOBILE_MELS), flux = new Float32Array(frames);
  const bass = new Float32Array(frames), high = new Float32Array(frames), loudness = new Float32Array(frames);
  const flatness = new Float32Array(frames), brightness = new Float32Array(frames);
  const real = new Float64Array(FFT), imag = new Float64Array(FFT), magnitude = new Float64Array(FFT / 2 + 1);
  const previous = new Float64Array(FFT / 2 + 1);
  for (let frame = 0; frame < frames; frame++) {
    imag.fill(0); let power = 0;
    for (let i = 0; i < FFT; i++) {
      const value = samples[reflect(frame * MOBILE_HOP + i - FFT / 2, samples.length)];
      real[reversed[i]] = value * window[i]; power += value * value;
    }
    loudness[frame] = Math.sqrt(power / FFT);
    for (let size = 2; size <= FFT; size *= 2) {
      const half = size / 2, stride = FFT / size;
      for (let start = 0; start < FFT; start += size) for (let i = 0; i < half; i++) {
        const left = start + i, right = left + half, angle = i * stride;
        const r = real[right] * cos[angle] - imag[right] * sin[angle];
        const im = real[right] * sin[angle] + imag[right] * cos[angle];
        real[right] = real[left] - r; imag[right] = imag[left] - im;
        real[left] += r; imag[left] += im;
      }
    }
    let fullPower = 0, highPower = 0, logPower = 0, highBins = 0;
    for (let bin = 0; bin <= FFT / 2; bin++) {
      magnitude[bin] = Math.hypot(real[bin], imag[bin]) / 32;
      const value = Math.log1p(1000 * magnitude[bin]), rise = Math.max(0, value - previous[bin]);
      const hz = bin * MOBILE_RATE / FFT;
      const binPower = magnitude[bin] ** 2;
      fullPower += binPower;
      if (hz > 2000 && hz < 10000) { highPower += binPower; logPower += Math.log(Math.max(1e-18,binPower)); highBins++; }
      flux[frame] += rise * (hz < 180 ? 1.8 : hz < 4000 ? 1 : .2);
      if (hz < 180) bass[frame] += rise;
      if (hz > 4000) high[frame] += rise;
      previous[bin] = value;
    }
    brightness[frame] = highPower / Math.max(1e-18,fullPower);
    flatness[frame] = Math.exp(logPower / highBins) / Math.max(1e-18,highPower / highBins);
    for (let mel = 0; mel < MOBILE_MELS; mel++) {
      let value = 0; for (const [bin, weight] of filters[mel]) value += magnitude[bin] * weight;
      spect[frame * MOBILE_MELS + mel] = Math.log1p(1000 * value);
    }
  }
  flux[0] = bass[0] = high[0] = 0;
  return {spect, flux, bass, high, loudness, flatness, brightness, frames};
}

// Locate a measured rising attack, rather than moving a note onto a beat grid.
export function refineMobileAttack(samples, time) {
  const hop = 110, first = Math.max(1, Math.floor((time - .045) * MOBILE_RATE / hop));
  const last = Math.min(Math.floor(samples.length / hop) - 2, Math.ceil((time + .025) * MOBILE_RATE / hop));
  const rms = index => {
    let power = 0; for (let i = index * hop; i < (index + 1) * hop; i++) power += samples[i] ** 2;
    return Math.sqrt(power / hop);
  };
  let previous = rms(first - 1), maximum = 0, picked = Math.round(time * MOBILE_RATE / hop), rises = [];
  for (let index = first; index <= last; index++) {
    const value = rms(index), rise = Math.max(0, value - previous); rises.push([index, rise]);
    if (rise > maximum) { maximum = rise; picked = index; } previous = value;
  }
  for (let i = rises.findIndex(([index]) => index === picked) - 1; i >= 0 && rises[i][1] >= maximum * .2; i--) picked = rises[i][0];
  return Math.max(0, Math.min(samples.length / MOBILE_RATE, picked * hop / MOBILE_RATE));
}

export function measuredMobileAttacks(samples, features) {
  const {flux, bass, high, loudness} = features, attacks = [];
  const peakVolume = loudness.reduce((a, b) => Math.max(a, b), 0);
  if (peakVolume < .00001) return attacks;
  for (let frame = 1; frame < flux.length - 1; frame++) {
    if (flux[frame] <= flux[frame - 1] || flux[frame] < flux[frame + 1] || loudness[frame] < Math.max(.00001, peakVolume * .008)) continue;
    let average = 0; const begin = Math.max(0, frame - 12), end = Math.min(flux.length, frame + 13);
    for (let i = begin; i < end; i++) average += flux[i]; average /= end - begin;
    if (flux[frame] < Math.max(1, average * 1.4)) continue;
    const local = [...flux.subarray(Math.max(0, frame - 200), Math.min(flux.length, frame + 201))].sort((a,b)=>a-b);
    const strength = Math.min(1.5, flux[frame] / Math.max(1, local[Math.floor(local.length * .97)]));
    const time = refineMobileAttack(samples, frame * MOBILE_HOP / MOBILE_RATE);
    const low = bass[frame] / Math.max(1, flux[frame]), top = high[frame] / Math.max(1, flux[frame]);
    const rms = (offset, span) => {
      const first = Math.floor((time + offset) * MOBILE_RATE), last = Math.min(samples.length, first + Math.floor(span * MOBILE_RATE));
      let power = 0; for (let i = first; i < last; i++) power += samples[i] ** 2;
      return Math.sqrt(power / Math.max(1, last - first));
    };
    const early = Math.max(rms(.01,.04),rms(.05,.04));
    const decay = rms(.15,.08) / Math.max(.00001, early);
    // A bass piano/guitar note can be just as on-beat as a kick. A sustained
    // low tone alone is insufficient evidence of percussion in a full mix.
    const after = Math.min(features.frames - 1,frame + 2);
    const noisy = features.flatness[after] > .15 && features.brightness[after] > .1;
    attacks.push({time, frame, strength, low, top, decay, noisy});
  }
  // Closely spaced spectral peaks of the same physical attack form one onset.
  return attacks.sort((a,b)=>b.strength-a.strength).filter((attack, index, all) =>
    !all.slice(0, index).some(other=>Math.abs(other.time-attack.time)<.065)).sort((a,b)=>a.time-b.time);
}

export function modelWindows(frames, maxFrames = 750, border = 6) {
  const stride = maxFrames - 2 * border, starts = [];
  for (let start = -border; start < frames - border; start += stride) starts.push(start);
  if (frames > stride) starts[starts.length - 1] = frames - (maxFrames - border);
  return starts.map(start => ({start, from:Math.max(0,start), to:Math.min(frames,start+maxFrames),
    left:Math.max(0,-start), right:Math.max(0,Math.min(border,start+maxFrames-frames))}));
}
