export const STARTING_POWER = 100;
export const NOTES_PER_UPGRADE = 50;
export const UPGRADE_POWER = 50;
export const weaponLevelFor = saved => 1 + Math.floor(saved / NOTES_PER_UPGRADE);
export const powerForSaved = saved => STARTING_POWER + (weaponLevelFor(saved) - 1) * UPGRADE_POWER;
export const RULES = {
  easy: { miss: 1, mine: 16, heal: 5, mineEvery: 4 },
  normal: { miss: 2, mine: 24, heal: 4, mineEvery: 3 },
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
  return { bpm: 60 / (bestLag * hop / sampleRate), beat: bestLag * hop / sampleRate, offset: phase * hop / sampleRate, peaks: peaks.map(p => p / max), beatTimes: detectBeatTimes(samples, sampleRate) };
}

export function makeChart(duration, analysis, difficulty = 'easy', seed = 42) {
  const random = seededRandom(seed), rules = RULES[difficulty], beat = analysis.beat || .5;
  const events = [], sections = [];
  const start = Math.ceil(3.5 / beat) * beat + (analysis.offset || 0);
  const timings = Array.isArray(analysis.beatTimes)
    ? analysis.beatTimes.filter(time => time >= 3.5 && time <= duration - 1)
    : Array.from({ length: Math.max(0, Math.floor((duration - 1 - start) / beat) + 1) }, (_, i) => start + i * beat);
  let lane = 2, noteCount = 0;
  // 16-beat phrases: 10 collection beats, travel, 4 attack beats, return.
  for (let index = 0; index < timings.length; index += 16) {
    const measured = Array.isArray(analysis.beatTimes);
    const base = measured ? timings[index] : start + index * beat;
    sections.push({ start: measured ? timings[index + 11] ?? base + 11 * beat : base + 11 * beat, end: Math.min(measured ? timings[index + 15] ?? base + 15 * beat : base + 15 * beat, duration - .5), type: 'attack' });
    for (let b = 0; b < 10; b++) {
      const time = measured ? timings[index + b] : base + b * beat;
      if (time === undefined || time > duration - 1) break;
      if (b % 2 === 0) lane = clamp(lane + (random() < .5 ? -1 : 1), 1, 3);
      events.push({ time, lane, type: 'note', id: events.length }); noteCount++;
      if (noteCount % rules.mineEvery === 0) {
        const choices = [0, 1, 2, 3, 4].filter(l => l !== lane);
        events.push({ time, lane: choices[Math.floor(random() * choices.length)], type: 'mine', id: events.length });
      }
    }
  }
  // Ensure 90% has a real attack opportunity, with time to leave/return to center.
  const perfectDefeatTime = Math.min(Math.ceil(duration * .9 / .5) * .5, Math.floor(duration / .5) * .5);
  const finale = { start: Math.max(0, perfectDefeatTime - 2 * beat), end: Math.min(duration, perfectDefeatTime + .5), type: 'attack' };
  const finalEvents = events.filter(e => e.time < finale.start - 2 * beat || e.time > finale.end + 2 * beat);
  const finalSections = [...sections, finale].filter(s => s.end > s.start).sort((a, b) => a.start - b.start);
  const mergedSections = [];
  for (const section of finalSections) {
    const last = mergedSections.at(-1);
    if (last && section.start <= last.end) last.end = Math.max(last.end, section.end);
    else mergedSections.push({ ...section });
  }
  finalEvents.sort((a, b) => a.time - b.time || a.id - b.id);
  const notes = finalEvents.filter(e => e.type === 'note');
  // Add hazards only AFTER the existing notes/lanes/random sequence are finalized.
  // Alternate the open edge each attack window so neither attack road stays safe.
  for (let i = 0; i < mergedSections.length; i++) {
    const section = mergedSections[i];
    section.safeLane = i % 2 ? 4 : 0;
  }
  const mineRandom = seededRandom(seed ^ 0x6d2b79f5);
  let extraId = Math.max(-1, ...events.map(e => e.id)) + 1;
  for (const time of timings) {
    if (notes.some(note => Math.abs(note.time - time) < .00001)) continue;
    const protectedLanes = new Set([2]);
    const protectBetween = (a, b) => { for (let lane = Math.min(a, b); lane <= Math.max(a, b); lane++) protectedLanes.add(lane); };
    const previous = notes.findLast(note => note.time < time);
    const next = notes.find(note => note.time > time);
    // Keep a corridor to nearby rescue notes, including existing low-BPM patterns.
    if (previous && time - previous.time <= beat * 1.05) protectBetween(2, previous.lane);
    if (next && next.time - time <= beat * 1.05) protectBetween(2, next.lane);
    const activeSection = mergedSections.find(section => time >= section.start && time < section.end);
    for (const section of activeSection ? [activeSection] : mergedSections) {
      if (time >= section.start && time < section.end) protectedLanes.add(section.safeLane);
      // Preserve an approach/return corridor for two beats around each attack window.
      else if (time >= section.start - 2 * beat && time < section.start) {
        const lastNote = notes.findLast(note => note.time < section.start);
        protectBetween(lastNote?.lane ?? 2, section.safeLane);
      } else if (time >= section.end && time <= section.end + 2 * beat) {
        const nextNote = notes.find(note => note.time >= section.end);
        protectBetween(section.safeLane, nextNote?.lane ?? 2);
      }
    }
    const candidates = [0, 1, 2, 3, 4].filter(lane => !protectedLanes.has(lane));
    // Seeded shuffle independent of note generation; rows never close all five lanes.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(mineRandom() * (i + 1)); [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }
    // Always populate eligible attack roads before filling the inner roads.
    candidates.sort((a, b) => Number(b === 0 || b === 4) - Number(a === 0 || a === 4));
    for (const lane of candidates.slice(0, difficulty === 'easy' ? 2 : 3)) {
      finalEvents.push({ time, lane, type: 'mine', id: extraId++, gapMine: true });
    }
  }
  finalEvents.sort((a, b) => a.time - b.time || a.id - b.id);
  let bossMax = 0, collected = 0;
  // Same half-second shot clock and note-before-shot ordering as GameState.
  // Perfect = all notes, no mines, every shot during the marked attack windows.
  for (let t = .5; t <= perfectDefeatTime; t += .5) {
    while (collected < notes.length && notes[collected].time <= t) collected++;
    if (mergedSections.some(s => t >= s.start && t < s.end)) bossMax += powerForSaved(collected);
  }
  return { duration, events: finalEvents, sections: mergedSections, beat, bpm: analysis.bpm, noteCount: notes.length, bossMax: Math.max(1, bossMax), perfectDefeatTime };
}

export class GameState {
  constructor(chart, difficulty = 'easy') {
    this.chart = chart; this.rules = RULES[difficulty]; this.time = 0; this.health = 100;
    this.boss = chart.bossMax; this.saved = 0; this.missed = 0; this.hits = 0; this.power = STARTING_POWER;
    this.weaponLevel = 1;
    this.combo = 0; this.maxCombo = 0; this.index = 0; this.lastShot = 0;
    this.stunnedUntil = 0; this.invincibleUntil = 0; this.defeatedAt = null; this.status = 'playing';
  }
  get attackWindow() { return this.chart.sections.some(s => this.time >= s.start && this.time < s.end); }
  hurt(amount) { this.health = clamp(this.health - amount, 0, 100); this.combo = 0; }
  advance(time, lane) {
    if (this.status !== 'playing') return [];
    const effects = [];
    time = clamp(time, this.time, this.chart.duration);
    // Events and shots are consumed in time order, including low-frame-rate frames.
    let nextShot = this.lastShot + .5;
    while (true) {
      const event = this.chart.events[this.index];
      const eventTime = event?.time ?? Infinity;
      const tick = Math.min(eventTime, nextShot);
      if (tick > time) break;
      if (eventTime <= nextShot) {
        this.index++;
        if (event.type === 'note') {
          if (event.lane === lane && tick >= this.stunnedUntil) {
            this.saved++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.health = clamp(this.health + this.rules.heal, 0, 100);
            effects.push({ type: 'save', lane, time: tick });
            if (this.saved % NOTES_PER_UPGRADE === 0) {
              this.weaponLevel = weaponLevelFor(this.saved); this.power = powerForSaved(this.saved);
              effects.push({ type: 'upgrade', level: this.weaponLevel, power: this.power, time: tick });
            }
          } else {
            this.missed++; this.hurt(this.rules.miss); effects.push({ type: 'miss', lane: event.lane, time: tick });
          }
        } else if (this.boss > 0 && event.lane === lane && tick >= this.invincibleUntil) {
          this.hurt(this.rules.mine); this.hits++; this.stunnedUntil = tick + .5; this.invincibleUntil = tick + 1;
          effects.push({ type: 'mine', lane, time: tick });
        }
      } else {
        this.lastShot = nextShot;
        if ((lane === 0 || lane === 4) && this.boss > 0 && tick >= this.stunnedUntil) {
          const damage = Math.min(this.boss, this.power);
          this.boss -= damage; effects.push({ type: 'shot', lane, time: tick, damage });
          if (this.boss === 0) { this.defeatedAt = tick; effects.push({ type: 'victory', time: tick }); }
        }
        nextShot += .5;
      }
      if (this.health <= 0) { this.status = 'lost-health'; break; }
    }
    this.time = time;
    if (this.status === 'playing' && time >= this.chart.duration) this.status = this.boss <= 0 ? 'won' : 'lost-boss';
    return effects;
  }
}
