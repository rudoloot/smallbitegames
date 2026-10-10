import { bossColliders } from './themes.js?v=5eac88f2d33d';
// Shared world-space geometry for simulation and rendering.
export function bossPose(time, motion = { from: -.61, to: -.61, start: 0, end: 0 }) {
  const t = motion.end > motion.start ? Math.max(0, Math.min(1, (time - motion.start) / (motion.end - motion.start))) : 1;
  const blend = t * t * (3 - 2 * t);
  return { x: motion.from + (motion.to - motion.from) * blend, y: 1.05, z: -52 };
}
export const projectileSpeed = weapon => weapon === 'rail' ? 260 : weapon === 'rocket' ? 85 : 115;
export const projectileRadius = weapon => weapon === 'missile' || weapon === 'rocket' ? .18 : weapon === 'rail' ? .045 : .07;
// Three parallel rows cover 1.5 lanes, including the outer bullets' radii.
export const BULLET_ROW_SPACING = (1.22 * 1.5 - 2 * projectileRadius('pistol')) / 2;
export const bulletRowOffsets = rows => Array.from({ length: rows }, (_, i) => (i - (rows - 1) / 2) * BULLET_ROW_SPACING);
export function projectilePoint(projectile, time) {
  if (projectile.weapon === 'missile') return { ...projectile.position };
  return { x: projectile.x, y: projectile.y, z: projectile.z - projectile.speed * (time - projectile.time) };
}
export function advanceMissile(projectile, time, target) {
  const age = time - projectile.time;
  if (age <= .32) {
    const drift = age / .32;
    projectile.position = { x: projectile.x + projectile.side * .8 * Math.sin(drift * Math.PI / 2),
      y: projectile.y + .6 * drift, z: projectile.z - .9 * drift };
    return;
  }
  const dt = time - Math.max(projectile.checkedAt, projectile.time + .32);
  const point = projectile.position;
  const dx = target.x - point.x, dy = target.y - point.y, dz = target.z - point.z;
  const distance = Math.hypot(dx, dy, dz), step = Math.min(distance, dt * 145);
  if (distance > 0) projectile.position = { x: point.x + dx / distance * step, y: point.y + dy / distance * step, z: point.z + dz / distance * step };
}
// Swept ellipsoid intersection includes boss motion and avoids tunnelling at low FPS.
export function intersectBoss(projectile, fromTime, toTime, pose = bossPose, fromPoint, kind = 'bird') {
  const from = fromPoint ?? projectilePoint(projectile, fromTime), to = projectilePoint(projectile, toTime);
  const bossFrom = pose(fromTime), bossTo = pose(toTime), radius = projectileRadius(projectile.weapon);
  let first = Infinity;
  for (const part of bossColliders(kind)) {
    const p = ['x', 'y', 'z'].map(axis => (from[axis] - bossFrom[axis] - part[axis]) / (part['r' + axis] + radius));
    const q = ['x', 'y', 'z'].map(axis => (to[axis] - bossTo[axis] - part[axis]) / (part['r' + axis] + radius));
    const delta = q.map((value, i) => value - p[i]);
    const a = delta.reduce((sum, value) => sum + value * value, 0);
    const b = 2 * p.reduce((sum, value, i) => sum + value * delta[i], 0);
    const c = p.reduce((sum, value) => sum + value * value, 0) - 1;
    const discriminant = b * b - 4 * a * c;
    if (c <= 0) first = 0;
    else if (a > 0 && discriminant >= 0) {
      const fraction = (-b - Math.sqrt(discriminant)) / (2 * a);
      if (fraction >= 0 && fraction <= 1) first = Math.min(first, fraction);
    }
  }
  if (!Number.isFinite(first)) return null;
  return { x: from.x + (to.x - from.x) * first, y: from.y + (to.y - from.y) * first,
    z: from.z + (to.z - from.z) * first, time: fromTime + (toTime - fromTime) * first };
}
