import { clamp, seededRandom, RULES } from './engine.js?v=c9a3057ee538';
import { weaponForId, attackForEnergy } from './weapons.js?v=c9a3057ee538';
import { projectileSpeed, projectilePoint, intersectBoss, bossPose, advanceMissile } from './projectiles.js?v=c9a3057ee538';
import { themeForChart } from './themes.js?v=c9a3057ee538';
import { estimateBossHealth } from './balance.js?v=c9a3057ee538';

export const LANE_COUNT = 4;
export const laneX = lane => (lane - 1.5) * 1.22;
export function makeChart(duration, analysis, difficulty = 'normal', seed = 42) {
  const random = seededRandom(seed), beat = analysis.beat || .5, events = [];
  const start = Math.ceil(3.5 / beat) * beat + (analysis.offset || 0);
  const times = Array.isArray(analysis.beatTimes) ? analysis.beatTimes.filter(t => t >= 3.5 && t <= duration - 1)
    : Array.from({ length: Math.max(0, Math.floor((duration - 1 - start) / beat) + 1) }, (_, i) => start + i * beat);
  let lane = 1;
  times.forEach((time, i) => {
    if (i % 16 >= 10) return;
    if (i % 2 === 0) lane = clamp(lane + (random() < .5 ? -1 : 1), 0, 3);
    events.push({ type: 'note', time, lane });
    // Each row has one note and three mines. Following the notes is always safe.
    for (let other = 0; other < LANE_COUNT; other++) {
      if (other !== lane) events.push({ type: 'mine', time, lane: other });
    }
  });
  events.sort((a, b) => a.time - b.time || (a.type === 'note' ? 0 : 1) - (b.type === 'note' ? 0 : 1) || a.lane - b.lane);
  events.forEach((event, id) => { event.id = id; });
  const chart = { duration, events, beat, seed, mood: analysis.mood, terrain: analysis.terrain, bpm: analysis.bpm,
    themeId: themeForChart({ mood: analysis.mood }).id,
    sections: [], noteCount: events.filter(event => event.type === 'note').length };
  chart.balance = estimateBossHealth(chart);
  chart.bossMax = chart.balance.bossMax;
  return chart;
}

export class GameState {
  constructor(chart, difficulty = 'normal', { physicsHz = 120 } = {}) {
    this.chart = chart; this.rules = RULES[difficulty]; this.theme = themeForChart(chart);
    this.maxHealth = 100; this.health = this.maxHealth;
    this.time = 0; this.boss = chart.bossMax; this.saved = 0; this.missed = 0; this.hits = 0;
    this.energy = 0; this.maxEnergy = 0; this.attacks = 0; this.maxAttackDamage = 0;
    this.combo = 0; this.maxCombo = 0; this.index = 0;
    this.lastShot = -Infinity; this.lastWeaponId = 'pistol';
    this.stunnedUntil = 0; this.invincibleUntil = 0;
    this.defeatedAt = this.boss === 0 ? 0 : null; this.status = 'playing';
    this.projectiles = []; this.projectileSerial = 0; this.pendingShots = [];
    this.physicsStep = 1; this.physicsHz = physicsHz;
  }
  get chargedAttack() { return attackForEnergy(this.energy); }
  get weaponId() { return this.chargedAttack?.weapon ?? this.lastWeaponId; }
  get weapon() { return weaponForId(this.weaponId); }
  get power() { return this.chargedAttack?.totalDamage ?? 0; }
  get attackWindow() { return this.energy >= 30; }
  hurt(amount) {
    this.health = clamp(this.health - amount, 0, this.maxHealth);
    this.combo = 0; this.energy = 0;
  }
  launchShot(shot) {
    const target = bossPose(), weapon = shot.weapon;
    const x = shot.x + (weapon === 'dual' ? shot.number % 2 ? -.22 : .22 : .22), y = .8, z = 2.65;
    const length = Math.hypot(target.x - x, target.y - y, target.z - z);
    const projectile = { id: this.projectileSerial++, weapon, time: shot.time, damage: shot.damage,
      checkedAt: shot.time, x, y, z, speed: projectileSpeed(weapon),
      direction: { x: (target.x - x) / length, y: (target.y - y) / length, z: (target.z - z) / length } };
    if (weapon === 'missile') Object.assign(projectile, { side: 1, position: { x, y, z } });
    this.lastShot = shot.time; this.lastWeaponId = weapon; this.projectiles.push(projectile);
    return { type: weapon === 'missile' ? 'missile' : 'shot', weapon, lane: shot.lane,
      time: shot.time, pellets: 1, projectiles: [projectile] };
  }
  releaseAttack(time, lane, playerWorldX = laneX(lane)) {
    if (this.status !== 'playing') return [];
    const effects = this.advance(time, lane, playerWorldX);
    const attack = this.chargedAttack;
    if (this.status !== 'playing' || !attack || this.boss <= 0 || this.time < this.stunnedUntil) return effects;
    const consumed = this.energy; this.energy = 0; this.attacks++;
    this.maxAttackDamage = Math.max(this.maxAttackDamage, attack.totalDamage);
    const x = clamp(playerWorldX, laneX(0), laneX(3));
    effects.push({ type: 'attack', weapon: attack.weapon, energy: consumed, damage: attack.totalDamage, time: this.time });
    for (let number = 0; number < attack.shots; number++) {
      const shot = { weapon: attack.weapon, damage: attack.damage, lane: clamp(lane, 0, 3), x,
        time: this.time + number * attack.interval, number };
      if (number === 0) effects.push(this.launchShot(shot));
      else this.pendingShots.push(shot);
    }
    this.pendingShots.sort((a, b) => a.time - b.time);
    return effects;
  }
  advance(time, lane, playerWorldX = laneX(lane)) {
    if (this.status !== 'playing') return [];
    time = clamp(time, this.time, this.chart.duration); lane = clamp(lane, 0, 3);
    const effects = [];
    while (true) {
      const event = this.chart.events[this.index], eventTime = event?.time ?? Infinity;
      const shotTime = this.pendingShots[0]?.time ?? Infinity;
      const physicsTime = this.physicsStep / this.physicsHz;
      const tick = Math.min(eventTime, shotTime, physicsTime);
      if (tick > time) break;
      if (eventTime === tick) {
        this.index++;
        if (event.type === 'note') {
          if (event.lane === lane && tick >= this.stunnedUntil) {
            this.saved++; this.energy++; this.maxEnergy = Math.max(this.maxEnergy, this.energy);
            this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.health = clamp(this.health + this.rules.heal, 0, this.maxHealth);
            effects.push({ type: 'save', lane, time: tick });
          } else { this.missed++; this.hurt(this.rules.miss); effects.push({ type: 'miss', time: tick }); }
        } else if (event.type === 'mine' && this.boss > 0 && event.lane === lane && tick >= this.invincibleUntil) {
          this.invincibleUntil = tick + 1; this.hurt(this.rules.mine); this.hits++; this.stunnedUntil = tick + .5;
          effects.push({ type: 'mine', lane, point: { x: laneX(lane), y: .4, z: 3.25 }, damage: this.rules.mine, time: tick });
        }
      } else if (shotTime === tick) {
        const shot = this.pendingShots.shift();
        if (this.boss > 0) effects.push(this.launchShot(shot));
      } else {
        this.physicsStep++;
        this.projectiles = this.projectiles.filter(projectile => {
          const from = projectilePoint(projectile, projectile.checkedAt);
          if (projectile.weapon === 'missile') advanceMissile(projectile, tick, bossPose());
          const point = this.boss > 0 ? intersectBoss(projectile, projectile.checkedAt, tick, bossPose, from, this.theme.boss) : null;
          projectile.checkedAt = tick;
          if (point) {
            const damage = Math.min(this.boss, projectile.damage); this.boss -= damage; this.lastHit = tick;
            effects.push({ type: 'hit', id: projectile.id, weapon: projectile.weapon, damage, point, time: tick });
            if (this.boss === 0) { this.defeatedAt = tick; this.pendingShots = []; effects.push({ type: 'victory', time: tick }); }
            return false;
          }
          return projectilePoint(projectile, tick).z > -70 && tick - projectile.time < 4;
        });
      }
      if (this.health <= 0) { this.status = 'lost-health'; break; }
    }
    this.time = time;
    if (this.status === 'playing' && time >= this.chart.duration) this.status = this.boss <= 0 ? 'won' : 'lost-boss';
    return effects;
  }
}
