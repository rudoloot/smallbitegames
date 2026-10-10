import { clamp, seededRandom, RULES } from './engine.js?v=d4fb67fc046d';
import { weaponForId } from './weapons.js?v=d4fb67fc046d';
import { projectileSpeed, projectilePoint, intersectBoss, bossPose, advanceMissile, bulletRowOffsets } from './projectiles.js?v=d4fb67fc046d';
import { pickupColor } from './pickups.js?v=d4fb67fc046d';
import { minePoint, mineFanTargets, MINE_TRAVEL } from './mines.js?v=d4fb67fc046d';
import { themeForChart } from './themes.js?v=d4fb67fc046d';
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
  });
  const notes = [...events];
  const mineRandom = seededRandom(seed ^ 0x6d696e65);
  let wave = 0;
  times.forEach((arrival, i) => {
    if (i % RULES[difficulty].mineEvery !== 0) return;
    const count = wave++ % 2 ? 3 : 2;
    const targets = mineFanTargets(count, mineRandom);
    events.push({ type: 'mine-wave', time: arrival - MINE_TRAVEL, targets, count });
  });
  events.sort((a, b) => a.time - b.time || (a.type === 'note' ? -1 : 1));
  events.forEach((event, id) => { event.id = id; });
  // Baseline damage is diagnostic; boss health depends only on song duration.
  const pistol = weaponForId('pistol'), travel = (2.65 + 52) / projectileSpeed('pistol');
  const maximumDamage = Math.max(0, Math.floor((duration - travel) / pistol.interval)) * pistol.damage;
  return { duration, events, beat, seed, mood: analysis.mood, terrain: analysis.terrain, bpm: analysis.bpm,
    themeId: themeForChart({ mood: analysis.mood }).id,
    sections: [], noteCount: notes.length, maximumDamage, bossMax: duration * 100 };
}

export class GameState {
  constructor(chart, difficulty = 'normal') {
    this.chart = chart; this.rules = RULES[difficulty];
    this.theme = themeForChart(chart);
    this.maxHealth = 100; this.health = this.maxHealth;
    this.time = 0; this.boss = chart.bossMax; this.saved = 0; this.missed = 0; this.hits = 0;
    this.weaponId = 'pistol'; this.ammo = Infinity;
    this.damageBonus = 0; this.bulletRows = 1; this.missileCount = 0; this.nextMissile = Infinity;
    this.pickups = []; this.pickupSerial = 0; this.mines = []; this.mineSerial = 0;
    this.pickupRandom = seededRandom((chart.seed ?? 42) ^ 0xc0be);
    this.combo = 0; this.maxCombo = 0; this.index = 0; this.lastShot = 0;
    this.nextShot = this.interval; this.stunnedUntil = 0; this.invincibleUntil = 0;
    this.defeatedAt = null; this.status = 'playing';
    this.bossLane = 1; this.bossMoveAt = Infinity;
    this.bossRandom = seededRandom(Math.imul(chart.seed ?? 42, 0x9e3779b1) ^ 0x7b05);
    this.bossMotion = { from: laneX(this.bossLane), to: laneX(this.bossLane), start: 0, end: 0 };
    this.projectiles = []; this.projectileSerial = 0; this.physicsStep = 1;
  }
  get weapon() { return weaponForId(this.weaponId); }
  get power() { return this.weapon.damage + this.damageBonus; }
  get interval() { return this.weapon.interval; }
  get attackWindow() { return false; }
  hurt(amount) { this.health = clamp(this.health - amount, 0, this.maxHealth); this.combo = 0; }
  choosePickup(id) {
    if (this.status !== 'playing') return [];
    const index = this.pickups.findIndex(pickup => pickup.id === id);
    if (index < 0) return [];
    const [pickup] = this.pickups.splice(index, 1), effects = [];
    this.collectPickup(pickup, this.time, effects);
    return effects;
  }
  collectPickup(pickup, tick, effects) {
    const color = pickupColor(pickup, tick);
    if (color === 'red') this.damageBonus += 20;
    if (color === 'blue') this.bulletRows++;
    if (color === 'purple') {
      this.missileCount++;
      if (this.nextMissile === Infinity) this.nextMissile = tick + 1;
    }
    effects.push({ type: 'upgrade', color, id: pickup.id, time: tick });
  }
  advance(time, lane, playerWorldX = laneX(lane)) {
    if (this.status !== 'playing') return [];
    time = clamp(time, this.time, this.chart.duration); lane = clamp(lane, 0, 3);
    playerWorldX = clamp(playerWorldX, laneX(0), laneX(3));
    const effects = [];
    while (true) {
      const event = this.chart.events[this.index], eventTime = event?.time ?? Infinity;
      const physicsTime = this.physicsStep / 120;
      const tick = Math.min(eventTime, this.nextShot, this.nextMissile, physicsTime);
      if (tick > time) break;
      if (eventTime === tick) {
        this.index++;
        if (event.type === 'note') {
          if (event.lane === lane && tick >= this.stunnedUntil) {
            this.saved++;
            if (this.saved % 50 === 0) {
              const choices = [0, 1, 2, 3].filter(l => l !== lane);
              const pickup = { id: this.pickupSerial++, time: tick, x: laneX(choices[Math.floor(this.pickupRandom() * choices.length)]) };
              this.pickups.push(pickup);
              effects.push({ type: 'cube-spawn', id: pickup.id, time: tick });
            }
            this.combo++; this.maxCombo = Math.max(this.maxCombo, this.combo);
            this.health = clamp(this.health + this.rules.heal, 0, this.maxHealth);
            effects.push({ type: 'save', lane, time: tick });
          } else { this.missed++; this.hurt(this.rules.miss); }
        } else if (event.type === 'mine-wave' && this.boss > 0) {
          const originX = bossPose(tick, this.bossMotion).x;
          for (const targetX of event.targets) this.mines.push({ id: this.mineSerial++, time: tick, originX, targetX });
        }
      } else if (this.nextShot === tick) {
        this.lastShot = tick;
        if (tick >= this.stunnedUntil) {
          const projectiles = bulletRowOffsets(this.bulletRows).map(offset => {
            const x = playerWorldX + .22 + offset;
            // Every row keeps its own world-space path and hit test.
            return { id: this.projectileSerial++, lane: Math.round(x / 1.22 + 1.5), weapon: 'pistol',
              time: tick, damage: this.power, x, y: .8, z: 2.65, speed: projectileSpeed('pistol'), checkedAt: tick };
          });
          this.projectiles.push(...projectiles);
          effects.push({ type: 'shot', weapon: 'pistol', lane, time: tick, pellets: projectiles.length, projectiles });
        }
        this.nextShot = tick + this.interval;
      } else if (this.nextMissile === tick) {
        if (tick >= this.stunnedUntil && this.boss > 0) {
          const projectiles = Array.from({ length: this.missileCount }, (_, i) => ({
            id: this.projectileSerial++, weapon: 'missile', time: tick, damage: 100 + this.damageBonus, checkedAt: tick,
            x: playerWorldX, y: .85, z: 3.05, side: i % 2 ? -1 : 1,
            position: { x: playerWorldX, y: .85, z: 3.05 },
          }));
          this.projectiles.push(...projectiles);
          effects.push({ type: 'missile', projectiles, time: tick });
        }
        this.nextMissile = tick + 1;
      } else {
        this.physicsStep++;
        this.mines = this.mines.filter(mine => {
          if (this.boss <= 0) return false;
          const point = minePoint(mine, tick);
          if (Math.hypot(point.x - playerWorldX, point.z - 3.25) < .48 && Math.abs(point.y - .8) < .65 && tick >= this.invincibleUntil) {
            this.invincibleUntil = tick + 1; this.hurt(this.rules.mine); this.hits++; this.stunnedUntil = tick + .5;
            effects.push({ type: 'mine', lane, point, damage: this.rules.mine, time: tick }); return false;
          }
          return point.z < 8;
        });
        if (this.boss > 0 && tick >= this.bossMoveAt) {
          const from = bossPose(tick, this.bossMotion).x;
          const choices = [0, 1, 2, 3].filter(l => l !== this.bossLane);
          this.bossLane = choices[Math.floor(this.bossRandom() * choices.length)];
          const x = laneX(this.bossLane), travel = .55 + Math.abs(x - from) / 1.22 * .15;
          this.bossMotion = { from, to: x, start: tick, end: tick + travel };
          this.bossMoveAt = Infinity;
          effects.push({ type: 'boss-move', lane: this.bossLane, time: tick });
        }
        this.projectiles = this.projectiles.filter(projectile => {
          const from = projectilePoint(projectile, projectile.checkedAt);
          if (projectile.weapon === 'missile') advanceMissile(projectile, tick, bossPose(tick, this.bossMotion));
          let point = this.boss > 0 ? intersectBoss(projectile, projectile.checkedAt, tick, t => bossPose(t, this.bossMotion), from, this.theme.boss) : null;
          projectile.checkedAt = tick;
          if (point) {
            const damage = Math.min(this.boss, projectile.damage); this.boss -= damage; this.lastHit = tick;
            effects.push({ type: 'hit', id: projectile.id, weapon: projectile.weapon, damage, point, time: tick });
            if (this.boss > 0 && this.bossMoveAt === Infinity) this.bossMoveAt = tick + 2;
            if (this.boss === 0) { this.defeatedAt = tick; this.mines = []; effects.push({ type: 'victory', time: tick }); }
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
