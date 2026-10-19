import { clamp, seededRandom, RULES } from './engine.js?v=32bab304e58d';
import { weaponForId, attackForEnergy } from './weapons.js?v=32bab304e58d';
import { projectileSpeed, projectilePoint, intersectBoss, intersectShield, bossPose, advanceMissile } from './projectiles.js?v=32bab304e58d';
import { themeForChart } from './themes.js?v=32bab304e58d';
import { estimateBossHealth } from './balance.js?v=32bab304e58d';
import { bossWeakPointAt, bossShieldAt } from './boss-rotation.js?v=32bab304e58d';
import { fireworkLifetime } from './fireworks.js?v=32bab304e58d';
import { selectRhythmNotes } from './rhythm.js?v=32bab304e58d';

export const LANE_COUNT = 4;
export const laneX = lane => (lane - 1.5) * 1.22;
const MINE_PATTERNS = [
  { name: 'sweep-right', lanes: [0, 1, 2, 3, 2, 1] },
  { name: 'sweep-left', lanes: [3, 2, 1, 0, 1, 2] },
  { name: 'zigzag', lanes: [1, 2, 1, 0, 1, 2, 3, 2] },
  { name: 'stairs', lanes: [0, 0, 1, 1, 2, 2, 3, 3, 2, 2, 1, 1] },
];
function addInterludeMines(events, beat, duration, seed, rhythm) {
  const notes = events.filter(event => event.type === 'note');
  const random = seededRandom(seed ^ 0x6d696e65);
  notes.forEach((note, index) => {
    const next = notes[index + 1] ?? { time: duration - 1, lane: note.lane };
    const gap = next.time - note.time;
    const section = rhythm?.sections.find(section => note.time >= section.start && note.time < section.end);
    // Preserve melody rests. Long gaps no longer become a wall of obstacles.
    if (rhythm && (gap > 2 || (section?.mode === 'melody' && gap > 1.1))) return;
    // Avoid squeezing an extra dodge into tightly packed notes. Longer breaks
    // get a sequence of gates; every gate leaves one reachable safe lane.
    if (gap < .48) return;
    const count = rhythm ? 1 : Math.max(1, Math.floor(gap / Math.max(.3, Math.min(.5, beat))) - 1);
    const pattern = MINE_PATTERNS[Math.floor(random() * MINE_PATTERNS.length)];
    const phase = Math.floor(random() * pattern.lanes.length);
    let safeLane = note.lane;
    for (let row = 1; row <= count; row++) {
      const time = note.time + gap * row / (count + 1);
      const returnSteps = Math.floor((next.time - time + 1e-9) / .2);
      const low = Math.max(0, safeLane - 1, next.lane - returnSteps);
      const high = Math.min(3, safeLane + 1, next.lane + returnSteps);
      safeLane = clamp(pattern.lanes[(phase + row - 1) % pattern.lanes.length], low, high);
      for (let lane = 0; lane < LANE_COUNT; lane++) {
        if (lane !== safeLane) events.push({ type: 'mine', time, lane, pattern: pattern.name });
      }
    }
  });
}
function thinEasyMines(events, seed) {
  const random = seededRandom(seed ^ 0x65617379), rows = new Map(), removed = new Set();
  for (const event of events) {
    if (event.type !== 'mine') continue;
    if (!rows.has(event.time)) rows.set(event.time, []);
    rows.get(event.time).push(event);
  }
  for (const mines of rows.values()) {
    const count = random() < .75 ? 2 : 3;
    for (let i = mines.length - 1; i > 0; i--) {
      const other = Math.floor(random() * (i + 1));
      [mines[i], mines[other]] = [mines[other], mines[i]];
    }
    // Only remove mines: the note lane and the original safe route stay clear.
    for (const mine of mines.slice(count)) removed.add(mine);
  }
  for (let i = events.length - 1; i >= 0; i--) if (removed.has(events[i])) events.splice(i, 1);
}
export function makeChart(duration, analysis, difficulty = 'easy', seed = 42) {
  const random = seededRandom(seed), beat = analysis.beat || .5, events = [];
  const start = Math.ceil(3.5 / beat) * beat + (analysis.offset || 0);
  const measured = analysis.rhythm ? selectRhythmNotes(analysis.rhythm, difficulty) : analysis.beatTimes;
  const times = Array.isArray(measured) ? measured.filter(t => t >= 3.5 && t <= duration - 1)
    : Array.from({ length: Math.max(0, Math.floor((duration - 1 - start) / beat) + 1) }, (_, i) => start + i * beat);
  let lane = 1;
  times.forEach((time, i) => {
    if (i % 2 === 0) lane = clamp(lane + (random() < .5 ? -1 : 1), 0, 3);
    events.push({ type: 'note', time, lane });
    // Each row has one note and three mines. Following the notes is always safe.
    for (let other = 0; other < LANE_COUNT; other++) {
      if (other !== lane) events.push({ type: 'mine', time, lane: other });
    }
  });
  addInterludeMines(events, beat, duration, seed, analysis.rhythm);
  if (difficulty === 'easy') {
    // Keep three out of four gates, preserving each retained gate's safe lane.
    const rows = [...new Set(events.filter(event => event.pattern).map(event => event.time))].sort((a, b) => a - b);
    const removed = new Set(rows.filter((_, index) => index % 4 === 0));
    for (let i = events.length - 1; i >= 0; i--) {
      if (events[i].pattern && removed.has(events[i].time)) events.splice(i, 1);
    }
    thinEasyMines(events, seed);
  }
  events.sort((a, b) => a.time - b.time || (a.type === 'note' ? 0 : 1) - (b.type === 'note' ? 0 : 1) || a.lane - b.lane);
  events.forEach((event, id) => { event.id = id; });
  const chart = { duration, events, beat, seed, difficulty, scrollSpeed: difficulty === 'easy' ? .875 : 1, mood: analysis.mood, terrain: analysis.terrain, bpm: analysis.bpm,
    themeId: themeForChart({ mood: analysis.mood }).id,
    sections: [], noteCount: events.filter(event => event.type === 'note').length };
  chart.balance = estimateBossHealth(chart);
  chart.bossMax = chart.balance.bossMax;
  return chart;
}

export class GameState {
  constructor(chart, difficulty = chart.difficulty ?? 'easy', { physicsHz = 120 } = {}) {
    this.chart = chart; this.rules = RULES[difficulty]; this.theme = themeForChart(chart);
    this.maxHealth = 100; this.health = this.maxHealth;
    this.time = 0; this.boss = chart.bossMax; this.saved = 0; this.score = 0; this.missed = 0; this.hits = 0;
    this.energy = 0; this.maxEnergy = 0; this.attacks = 0; this.maxAttackDamage = 0;
    this.combo = 0; this.maxCombo = 0; this.index = 0;
    this.lastShot = -Infinity; this.lastWeaponId = 'pistol';
    this.stunnedUntil = 0; this.invincibleUntil = 0;
    this.defeatedAt = this.boss === 0 ? 0 : null; this.status = 'playing';
    this.projectiles = []; this.projectileSerial = 0; this.pendingShots = [];
    this.physicsStep = 1; this.physicsHz = physicsHz;
    this.endEffectsUntil = 0;
  }
  get chargedAttack() { return attackForEnergy(this.energy); }
  get weaponId() { return this.chargedAttack?.weapon ?? null; }
  get weapon() { return weaponForId(this.weaponId); }
  get power() { return this.chargedAttack?.totalDamage ?? 0; }
  get attackWindow() { return this.energy >= 30; }
  hurt(amount) {
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    this.combo = 0;
  }
  launchShot(shot) {
    const weapon = shot.weapon, target = shot.celebration
      ? {x:weapon === 'missile' ? 0 : (shot.number % 5 - 2) * .7, y:weapon === 'missile' ? 10 : 8, z:-52 - shot.number % 3 * 2}
      : bossPose();
    const x = shot.x + (weapon === 'dual' ? shot.number % 2 ? -.22 : .22 : .22), y = .8, z = 2.65;
    const length = Math.hypot(target.x - x, target.y - y, target.z - z);
    const projectile = { id: this.projectileSerial++, weapon, time: shot.time, damage: shot.damage,
      checkedAt: shot.time, x, y, z, speed: projectileSpeed(weapon),
      direction: { x: (target.x - x) / length, y: (target.y - y) / length, z: (target.z - z) / length } };
    if (shot.celebration) Object.assign(projectile, {celebration:true,target,flightTime:weapon === 'missile' ? 2 : .7 + shot.number % 3 * .06});
    if (weapon === 'missile') Object.assign(projectile, { side: 1, position: { x, y, z } });
    this.lastShot = shot.time; this.lastWeaponId = weapon; this.projectiles.push(projectile);
    return { type: weapon === 'missile' ? 'missile' : 'shot', weapon, lane: shot.lane,
      time: shot.time, pellets: 1, projectiles: [projectile] };
  }
  releaseAttack(time, lane, playerWorldX = laneX(lane), presentation = {}) {
    if (this.status !== 'playing') return [];
    const effects = this.advance(time, lane, playerWorldX, presentation);
    if (this.time >= this.stunnedUntil) effects.push(...this.fireChargedAttack(this.time, lane, playerWorldX, 'release'));
    return effects;
  }
  fireChargedAttack(time, lane, playerWorldX, reason) {
    const attack = this.chargedAttack;
    if (this.status !== 'playing' || this.health <= 0 || !attack) return [];
    const celebration = this.boss <= 0;
    const effects = [];
    const consumed = this.energy; this.energy = 0; this.attacks++;
    if (!celebration) this.maxAttackDamage = Math.max(this.maxAttackDamage, attack.totalDamage);
    const x = clamp(playerWorldX, laneX(0), laneX(3));
    effects.push({ type: 'attack', weapon: attack.weapon, energy: consumed, damage: celebration ? 0 : attack.totalDamage, time, reason, celebration });
    for (let number = 0; number < attack.shots; number++) {
      const shot = { weapon: attack.weapon, damage: celebration ? 0 : attack.damage, celebration, lane: clamp(lane, 0, 3), x,
        time: time + number * attack.interval, number };
      if (number === 0) effects.push(this.launchShot(shot));
      else this.pendingShots.push(shot);
    }
    this.pendingShots.sort((a, b) => a.time - b.time);
    return effects;
  }
  advance(time, lane, playerWorldX = laneX(lane), { presentationPending = false } = {}) {
    if (this.status !== 'playing') return [];
    // The soundtrack may end while the last volley is still in flight.
    time = Math.max(time, this.time); lane = clamp(lane, 0, 3);
    const effects = [];
    while (true) {
      const event = this.chart.events[this.index], eventTime = event?.time ?? Infinity;
      const shotTime = this.pendingShots[0]?.time ?? Infinity;
      const physicsTime = this.physicsStep / this.physicsHz;
      const tick = Math.min(eventTime, shotTime, physicsTime);
      if (tick > time) break;
      if (eventTime === tick) {
        const row = [];
        while (this.chart.events[this.index]?.time === tick) row.push(this.chart.events[this.index++]);
        // Mine collisions clear charge regardless of the chart's ordering
        // within this timestamp; missed notes only break the combo.
        for (const mine of row.filter(item => item.type === 'mine')) {
          if (this.boss > 0 && mine.lane === lane && tick >= this.invincibleUntil) {
            const energyLoss = this.energy; this.energy = 0;
            this.invincibleUntil = tick + 1; this.hurt(this.rules.mine); this.hits++; this.stunnedUntil = tick + .5;
            effects.push({ type: 'mine', lane, point: { x: laneX(lane), y: .4, z: 3.25 }, damage: this.rules.mine, energyLoss, time: tick });
          }
        }
        for (const event of row.filter(item => item.type === 'note')) {
          if (event.lane === lane && tick >= this.stunnedUntil) {
            this.saved++; this.energy++; this.maxEnergy = Math.max(this.maxEnergy, this.energy);
            this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.score += 100 + Math.floor(this.combo / 10) * 10;
            this.health = clamp(this.health + this.rules.heal, 0, this.maxHealth);
            effects.push({ type: 'save', lane, time: tick });
          } else {
            this.missed++; this.hurt(this.rules.miss); effects.push({ type: 'miss', time: tick });
          }
        }
      } else if (shotTime === tick) {
        const shot = this.pendingShots.shift();
        if (this.boss > 0 || shot.celebration) effects.push(this.launchShot(shot));
      } else {
        this.physicsStep++;
        this.projectiles = this.projectiles.filter(projectile => {
          if (projectile.celebration) {
            projectile.checkedAt = tick;
            if (tick + 1e-9 >= projectile.time + projectile.flightTime) {
              effects.push({type:'firework',id:projectile.id,weapon:projectile.weapon,point:projectile.target,time:tick});
              this.endEffectsUntil = Math.max(this.endEffectsUntil, tick + fireworkLifetime(projectile.weapon));
              return false;
            }
            return true;
          }
          const from = projectilePoint(projectile, projectile.checkedAt);
          if (projectile.weapon === 'missile') advanceMissile(projectile, tick, bossPose());
          const shieldPoint = this.boss > 0 ? intersectShield(projectile, projectile.checkedAt, tick, bossPose, from) : null;
          const shielded = Boolean(shieldPoint && bossShieldAt(shieldPoint.time));
          const point = shielded ? shieldPoint : this.boss > 0 ? intersectBoss(projectile, projectile.checkedAt, tick, bossPose, from, this.theme.boss) : null;
          projectile.checkedAt = tick;
          if (point) {
            const weakPoint = bossWeakPointAt(point.time);
            const baseDamage = Math.min(this.boss, shielded ? Math.floor(projectile.damage / 3) : projectile.damage);
            const bonusDamage = weakPoint ? Math.min(this.boss - baseDamage, projectile.damage) : 0;
            const damage = baseDamage + bonusDamage; this.boss -= damage; this.lastHit = tick;
            effects.push({ type: 'hit', id: projectile.id, weapon: projectile.weapon, damage, baseDamage, bonusDamage, weakPoint, shielded, point, time: tick });
            this.endEffectsUntil = Math.max(this.endEffectsUntil, tick + .65);
            if (this.boss === 0) { this.defeatedAt = tick; this.pendingShots = []; effects.push({ type: 'victory', time: tick }); }
            return false;
          }
          return projectilePoint(projectile, tick).z > -70 && tick - projectile.time < 4;
        });
      }
      if (this.health <= 0) { this.status = 'lost-health'; break; }
    }
    this.time = time;
    const finalChargeGrace = this.energy > 0 && time < this.chart.duration + 1;
    if (this.status === 'playing' && time >= this.chart.duration && !finalChargeGrace &&
        !this.pendingShots.length && !this.projectiles.length && time >= this.endEffectsUntil && !presentationPending) {
      this.status = this.boss <= 0 ? 'won' : 'lost-boss';
    }
    return effects;
  }
}
