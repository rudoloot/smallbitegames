export const MAX_TERRAIN_SLOPE = 20 * Math.PI / 180;
export const MAX_TERRAIN_RATE = 2.25 * Math.PI / 180;

// Measure bass and treble throughout the decoded song, independently of volume.
export function analyzeTerrain(samples, sampleRate) {
  const hop = Math.max(1, Math.round(sampleRate * .1)), frames = Math.ceil(samples.length / hop);
  const balance = new Float64Array(frames), weights = new Float64Array(frames);
  const bassAlpha = 1 - Math.exp(-2 * Math.PI * 300 / sampleRate);
  const trebleAlpha = 1 - Math.exp(-2 * Math.PI * 900 / sampleRate);
  let bass = 0, low = 0;
  for (let frame = 0; frame < frames; frame++) {
    const begin = frame * hop, end = Math.min(samples.length, begin + hop);
    let bassPower = 0, treblePower = 0, power = 0;
    for (let i = begin; i < end; i++) {
      const value = samples[i];
      bass += bassAlpha * (value - bass); low += trebleAlpha * (value - low);
      bassPower += bass * bass; treblePower += (value - low) ** 2; power += value * value;
    }
    balance[frame] = bassPower + treblePower > 1e-12 ? treblePower / (bassPower + treblePower) : .5;
    weights[frame] = power / Math.max(1, end - begin);
  }
  return terrainProfile(balance, hop / sampleRate, weights);
}

// A six-second musical envelope compared to the whole-song spectral distribution.
// Treble-rich passages descend; bass-rich passages climb. Silence stays level.
export function terrainProfile(balance, step, weights = new Float64Array(balance.length).fill(1)) {
  if (!balance.length) return { step, slopes: [0] };
  const peakWeight = weights.reduce((a, b) => Math.max(a, b), 0), gate = peakWeight * .002;
  const prefix = new Float64Array(balance.length + 1), weightPrefix = new Float64Array(balance.length + 1);
  for (let i = 0; i < balance.length; i++) {
    const weight = weights[i] > gate ? weights[i] : 0;
    prefix[i + 1] = prefix[i] + balance[i] * weight;
    weightPrefix[i + 1] = weightPrefix[i] + weight;
  }
  const totalWeight = weightPrefix[balance.length];
  if (totalWeight === 0) return { step, slopes: Array(balance.length).fill(0) };
  const average = prefix[balance.length] / totalWeight, radius = Math.round(3 / step);
  const smooth = Array.from(balance, (_, i) => {
    const from = Math.max(0, i - radius), to = Math.min(balance.length, i + radius + 1);
    const weight = weightPrefix[to] - weightPrefix[from];
    return weight > 0 ? (prefix[to] - prefix[from]) / weight : average;
  });
  const active = smooth.filter((_, i) => weights[i] > gate).sort((a, b) => a - b);
  // Separate ranges let both ends of an asymmetric song produce visible hills.
  // A minimum range prevents tiny filter transients from becoming steep terrain.
  const lowRange = Math.max(.02, average - active[Math.floor((active.length - 1) * .1)]);
  const highRange = Math.max(.02, active[Math.floor((active.length - 1) * .9)] - average);
  const targets = smooth.map((value, i) => weights[i] > gate
    ? -Math.max(-1, Math.min(1, (value - average) / (value >= average ? highRange : lowRange))) * MAX_TERRAIN_SLOPE : 0);
  const slopes = []; let current = targets[0] || 0;
  for (const target of targets) {
    const delta = (target - current) * (1 - Math.exp(-step / 2.5));
    current += Math.max(-MAX_TERRAIN_RATE * step, Math.min(MAX_TERRAIN_RATE * step, delta));
    slopes.push(current);
  }
  return { step, slopes };
}

export function terrainSlope(profile, time) {
  if (!profile?.slopes?.length) return 0;
  const index = Math.max(0, time / profile.step), left = Math.min(Math.floor(index), profile.slopes.length - 1);
  const right = Math.min(left + 1, profile.slopes.length - 1), blend = index - Math.floor(index);
  return profile.slopes[left] * (1 - blend) + profile.slopes[right] * blend;
}
