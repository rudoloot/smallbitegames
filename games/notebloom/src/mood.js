// A whole-song acoustic impression, not a lyrical/emotional classifier.
// Compare high-frequency energy, loudness, dynamics and tempo to a color wheel.
export function analyzeMood(samples, sampleRate, bpm) {
  let power = 0, highPower = 0, low = 0;
  const alpha = 1 - Math.exp(-2 * Math.PI * 900 / sampleRate);
  const block = Math.max(1, Math.round(sampleRate)), levels = [];
  let blockPower = 0, count = 0;
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i];
    low += alpha * (value - low);
    power += value * value; highPower += (value - low) ** 2;
    blockPower += value * value; count++;
    if (count === block || i === samples.length - 1) {
      levels.push(Math.sqrt(blockPower / count)); blockPower = 0; count = 0;
    }
  }
  if (power < 1e-8) return { hue: .58, saturation: .35, energy: 0, brightness: 0 };
  const brightness = Math.min(1, highPower / power);
  const rms = Math.sqrt(power / samples.length);
  const mean = levels.reduce((sum, v) => sum + v, 0) / levels.length;
  const dynamics = Math.min(1, Math.sqrt(levels.reduce((sum, v) => sum + (v - mean) ** 2, 0) / levels.length) / Math.max(mean, .001));
  const energy = Math.min(1, rms * 3);
  const pace = Math.max(0, Math.min(1, ((bpm || 100) - 70) / 110));
  // Calm/dark sounds: blue/teal; brighter, stronger music: violet/rose/amber.
  const hue = (.48 + brightness * .28 + energy * .18 + pace * .09 + dynamics * .06) % 1;
  return { hue, saturation: .42 + energy * .28, energy, brightness };
}
