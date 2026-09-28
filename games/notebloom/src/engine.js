export const STARTING_POWER = 100;
export const BOSS_HEALTH_MULTIPLIER = 2.5;
export const RULES = {
  easy: { miss: 1, mine: 16, heal: 5, mineEvery: 8, bossScale: .43 },
  normal: { miss: 2, mine: 24, heal: 4, mineEvery: 6, bossScale: .55 },
};
export const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
export function seededRandom(seed) {
  let x = seed >>> 0;
  return () => { x = (1664525 * x + 1013904223) >>> 0; return x / 4294967296; };
}

// Low-cost energy-onset analysis. This estimates a beat grid, not a transcription.
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
  return { bpm: 60 / (bestLag * hop / sampleRate), beat: bestLag * hop / sampleRate, offset: phase * hop / sampleRate, peaks: peaks.map(p => p / max) };
}

export function makeChart(duration, analysis, difficulty = 'easy', seed = 42) {
  const random = seededRandom(seed), rules = RULES[difficulty], beat = analysis.beat || .5;
  const events = [], sections = [];
  const start = Math.ceil(3.5 / beat) * beat + (analysis.offset || 0);
  let lane = 2, noteCount = 0;
  // 16-beat phrases: 10 collection beats, travel, 4 attack beats, return.
  for (let cycle = 0; start + cycle * 16 * beat < duration - 1; cycle++) {
    const base = start + cycle * 16 * beat;
    sections.push({ start: base + 11 * beat, end: Math.min(base + 15 * beat, duration - .5), type: 'attack' });
    for (let b = 0; b < 10; b++) {
      const time = base + b * beat;
      if (time > duration - 1) break;
      if (b % 2 === 0) lane = clamp(lane + (random() < .5 ? -1 : 1), 1, 3);
      events.push({ time, lane, type: 'note', id: events.length }); noteCount++;
      if (noteCount % rules.mineEvery === 0) {
        const choices = [0, 1, 2, 3, 4].filter(l => l !== lane);
        events.push({ time, lane: choices[Math.floor(random() * choices.length)], type: 'mine', id: events.length });
      }
    }
  }
  events.sort((a, b) => a.time - b.time || a.id - b.id);
  let modelDamage = 0;
  for (const section of sections) {
    const count = events.filter(e => e.type === 'note' && e.time < section.start).length;
    modelDamage += Math.max(0, Math.floor((section.end - section.start) / .5)) * (1 + count * .8);
  }
  // Multiply the previous health baseline, independently of starting weapon damage.
  const bossMax = Math.max(40, Math.round(modelDamage * rules.bossScale)) * BOSS_HEALTH_MULTIPLIER;
  return { duration, events, sections, beat, bpm: analysis.bpm, noteCount, bossMax };
}

export class GameState {
  constructor(chart, difficulty = 'easy') {
    this.chart = chart; this.rules = RULES[difficulty]; this.time = 0; this.health = 100;
    this.boss = chart.bossMax; this.saved = 0; this.missed = 0; this.hits = 0; this.power = STARTING_POWER;
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
            this.saved++; this.power++; this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.health = clamp(this.health + this.rules.heal, 0, 100);
            effects.push({ type: 'save', lane, time: tick });
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
