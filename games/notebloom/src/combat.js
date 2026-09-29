import { clamp, seededRandom, RULES } from './engine.js?v=375ab583a975';
import { weaponForId, DROP_WEAPONS } from './weapons.js?v=375ab583a975';
import { projectileSpeed, projectilePoint, intersectBoss } from './projectiles.js?v=375ab583a975';
export const LANE_COUNT = 4;
export const laneX = lane => (lane - 1.5) * 1.22;
export function makeChart(duration, analysis, difficulty = 'normal', seed = 42, upgrades = {}) {
  const random = seededRandom(seed), beat = analysis.beat || .5, events = [];
  const start = Math.ceil(3.5 / beat) * beat + (analysis.offset || 0);
  const times = Array.isArray(analysis.beatTimes) ? analysis.beatTimes.filter(t => t >= 3.5 && t <= duration - 1)
    : Array.from({ length: Math.max(0, Math.floor((duration - 1 - start) / beat) + 1) }, (_, i) => start + i * beat);
  let lane = 1;
  times.forEach((time, i) => {
    if (i % 16 >= 10) return;
    if (i % 2 === 0) lane = clamp(lane + (random() < .5 ? -1 : 1), 0, 3);
    events.push({ type: 'note', time, lane });
  });
  const supply = 30 - (upgrades.supply || 0) * 2;
  for (let time = supply; time < duration - 1; time += supply) {
    const nearby = events.filter(e => Math.abs(e.time - time) < .24);
    events.push({ type: 'weapon', time, lane: nearby[0]?.lane ?? Math.floor(random() * 4), weapon: DROP_WEAPONS[Math.floor(random() * DROP_WEAPONS.length)] });
  }
  const rewards = [...events].sort((a, b) => a.time - b.time);
  const patterns = [[0, 1, 2], [1, 2, 3], [0], [1], [2], [3], [0, 3], [1, 2], [0, 2], [1, 3]];
  for (let i = 0; i < times.length; i++) {
    const time = times[i], note = rewards.find(e => e.type === 'note' && e.time === time);
    if (note && i % RULES[difficulty].mineEvery !== 0) continue;
    const blocked = new Set(), before = rewards.findLast(e => e.time <= time), after = rewards.find(e => e.time >= time);
    for (const reward of rewards) if (Math.abs(reward.time - time) < .32) blocked.add(reward.lane);
    if (before && after && after.time - before.time < 1.2) {
      for (let l = Math.min(before.lane, after.lane); l <= Math.max(before.lane, after.lane); l++) blocked.add(l);
    }
    const pattern = patterns[(Math.floor(i / 4) + seed) % patterns.length];
    for (const l of pattern.filter(l => !blocked.has(l)).slice(0, 3)) events.push({ type: 'mine', time, lane: l, pattern: Math.floor(i / 4) % patterns.length });
  }
  events.sort((a, b) => a.time - b.time || (a.type === 'note' ? -1 : 1));
  events.forEach((event, id) => { event.id = id; });
  const chart = { duration, events, beat, bpm: analysis.bpm, sections: [], noteCount: events.filter(e => e.type === 'note').length, bossMax: 1e12, perfectDefeatTime: duration * .9 };
  // Calibrate with baseline weapons; permanent attack bonuses can beat the boss earlier.
  const simulation = new GameState(chart, difficulty);
  const stops = [...new Set([...events.map(e => e.time), duration])].sort((a, b) => a - b);
  let total = 0, lastBefore = null, firstAfter = null;
  for (const time of stops) {
    const reward = events.find(e => e.time === time && (e.type === 'note' || e.type === 'weapon'));
    const safe = reward?.lane ?? [0, 1, 2, 3].find(l => !events.some(e => e.time === time && e.lane === l && e.type === 'mine')) ?? 1;
    for (const effect of simulation.advance(time, safe)) if (effect.type === 'hit') {
      if (effect.time < duration * .9) { total += effect.damage; lastBefore = effect.time; }
      else firstAfter ??= effect.time;
    }
  }
  chart.bossMax = Math.max(1, total + (firstAfter === null ? 0 : 1));
  chart.perfectDefeatTime = firstAfter ?? lastBefore ?? duration;
  return chart;
}

export class GameState {
  constructor(chart, difficulty = 'normal', upgrades = {}) {
    this.chart = chart; this.rules = RULES[difficulty]; this.upgrades = { ...upgrades };
    this.maxHealth = 100 + 15 * (upgrades.health || 0); this.health = this.maxHealth;
    this.time = 0; this.boss = chart.bossMax; this.saved = 0; this.missed = 0; this.hits = 0;
    this.xp = 0; this.shields = upgrades.shield || 0; this.weaponId = 'pistol'; this.ammo = Infinity;
    this.combo = 0; this.maxCombo = 0; this.index = 0; this.lastShot = 0;
    this.nextShot = this.interval; this.stunnedUntil = 0; this.invincibleUntil = 0;
    this.defeatedAt = null; this.status = 'playing';
    this.projectiles = []; this.projectileSerial = 0; this.physicsStep = 1;
  }
  get weapon() { return weaponForId(this.weaponId); }
  get power() { return Math.round(this.weapon.damage * (1 + .08 * (this.upgrades.damage || 0))); }
  get interval() { return this.weapon.interval / (1 + .05 * (this.upgrades.rate || 0)); }
  get attackWindow() { return false; }
  hurt(amount) { this.health = clamp(this.health - amount, 0, this.maxHealth); this.combo = 0; }
  advance(time, lane) {
    if (this.status !== 'playing') return [];
    time = clamp(time, this.time, this.chart.duration); lane = clamp(lane, 0, 3);
    const effects = [];
    while (true) {
      const event = this.chart.events[this.index], eventTime = event?.time ?? Infinity;
      const physicsTime = this.physicsStep / 120;
      const tick = Math.min(eventTime, this.nextShot, physicsTime);
      if (tick > time) break;
      if (eventTime <= this.nextShot && eventTime <= physicsTime) {
        this.index++;
        if (event.type === 'note') {
          if (event.lane === lane && tick >= this.stunnedUntil) {
            this.saved++; this.xp = Math.floor(this.saved * (1 + .1 * (this.upgrades.xp || 0)));
            this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.health = clamp(this.health + this.rules.heal + (this.upgrades.heal || 0), 0, this.maxHealth);
            effects.push({ type: 'save', lane, time: tick });
          } else { this.missed++; this.hurt(Math.max(1, Math.round(this.rules.miss * (1 - .1 * (this.upgrades.focus || 0)) * 10) / 10)); }
        } else if (event.type === 'weapon' && event.lane === lane) {
          if (this.weaponId === 'pistol') {
            this.weaponId = event.weapon; this.ammo = Math.ceil(this.weapon.ammo * (1 + .15 * (this.upgrades.ammo || 0)));
            this.nextShot = Math.min(this.nextShot, tick + this.interval);
            effects.push({ type: 'weapon', weapon: this.weaponId, ammo: this.ammo, time: tick });
          }
        } else if (event.type === 'mine' && this.boss > 0 && event.lane === lane && tick >= this.invincibleUntil) {
          this.invincibleUntil = tick + 1;
          if (this.shields > 0) { this.shields--; effects.push({ type: 'shield', time: tick }); }
          else {
            const damage = Math.round(this.rules.mine * (1 - .08 * (this.upgrades.armor || 0)));
            this.hurt(damage); this.hits++; this.stunnedUntil = tick + .5;
            effects.push({ type: 'mine', lane, damage, time: tick });
          }
        }
      } else if (this.nextShot <= physicsTime) {
        this.lastShot = tick;
        if (tick >= this.stunnedUntil) {
          const weapon = this.weapon, pellets = Math.min(weapon.pellets, this.ammo);
          const projectiles = Array.from({ length: pellets }, (_, i) => ({
            id: this.projectileSerial++, weapon: this.weaponId, time: tick, damage: this.power,
            x: laneX(lane) + (pellets > 1 ? (i ? -.26 : .26) : .22), y: .8, z: 2.65,
            speed: projectileSpeed(this.weaponId), checkedAt: tick,
          }));
          this.projectiles.push(...projectiles);
          effects.push({ type: 'shot', weapon: this.weaponId, lane, time: tick, pellets, projectiles });
          this.ammo -= pellets;
          if (this.ammo <= 0) { this.weaponId = 'pistol'; this.ammo = Infinity; effects.push({ type: 'weapon', weapon: 'pistol', ammo: Infinity, time: tick }); }
        }
        this.nextShot = tick + this.interval;
      } else {
        this.physicsStep++;
        this.projectiles = this.projectiles.filter(projectile => {
          const point = this.boss > 0 ? intersectBoss(projectile, projectile.checkedAt, tick) : null;
          projectile.checkedAt = tick;
          if (point) {
            const damage = Math.min(this.boss, projectile.damage); this.boss -= damage; this.lastHit = tick;
            effects.push({ type: 'hit', id: projectile.id, weapon: projectile.weapon, damage, point, time: tick });
            if (this.boss === 0) { this.defeatedAt = tick; effects.push({ type: 'victory', time: tick }); }
            return false;
          }
          return projectilePoint(projectile, tick).z > -40;
        });
      }
      if (this.health <= 0) { this.status = 'lost-health'; break; }
    }
    this.time = time;
    if (this.status === 'playing' && time >= this.chart.duration) this.status = this.boss <= 0 ? 'won' : 'lost-boss';
    return effects;
  }
}
