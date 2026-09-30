// Whole-song loudness reference, with a three-second musical envelope.
// Positive pitch raises the road ahead; loud passages tilt it downhill.
export function terrainProfile(energy, step) {
  if (!energy.length) return { step, slopes: [0] };
  const prefix = new Float64Array(energy.length + 1);
  for (let i = 0; i < energy.length; i++) prefix[i + 1] = prefix[i] + energy[i];
  const radius = Math.round(1.5 / step);
  const smooth = Array.from(energy, (_, i) => {
    const from = Math.max(0, i - radius), to = Math.min(energy.length, i + radius + 1);
    return (prefix[to] - prefix[from]) / (to - from);
  });
  const average = prefix[energy.length] / energy.length;
  const peak = smooth.reduce((a, b) => Math.max(a, b), 0);
  const range = Math.max(peak - average, average * .45, .0001);
  return { step, slopes: smooth.map(value => average < .00001 ? 0 :
    Math.max(-.12, Math.min(.12, (average - value) / range * .12))) };
}

export function terrainSlope(profile, time) {
  if (!profile?.slopes?.length) return 0;
  const index = Math.max(0, time / profile.step), left = Math.min(Math.floor(index), profile.slopes.length - 1);
  const right = Math.min(left + 1, profile.slopes.length - 1), blend = index - Math.floor(index);
  return profile.slopes[left] * (1 - blend) + profile.slopes[right] * blend;
}
