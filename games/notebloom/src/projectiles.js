// Shared world-space geometry for simulation and rendering. Bullets never home.
export function bossPose(time, motion = { from: -.61, to: -.61, start: 0, end: 0 }) {
  const t = motion.end > motion.start ? Math.max(0, Math.min(1, (time - motion.start) / (motion.end - motion.start))) : 1;
  const blend = t * t * (3 - 2 * t);
  return { x: motion.from + (motion.to - motion.from) * blend, y: 1.05, z: -52 };
}
export const projectileSpeed = weapon => weapon === 'rail' ? 260 : weapon === 'rocket' ? 85 : 115;
export const projectileRadius = weapon => weapon === 'rocket' ? .18 : weapon === 'rail' ? .045 : .07;
const parts = [
  { x: 0, y: 0, z: 0, rx: 1.05, ry: .82, rz: .74 },
  { x: -1.5, y: .05, z: 0, rx: .9, ry: .375, rz: .375 },
  { x: 1.5, y: .05, z: 0, rx: .9, ry: .375, rz: .375 },
];
export function projectilePoint(projectile, time) {
  return { x: projectile.x, y: projectile.y, z: projectile.z - projectile.speed * (time - projectile.time) };
}
// Swept ellipsoid intersection includes boss motion and avoids tunnelling at low FPS.
export function intersectBoss(projectile, fromTime, toTime, pose = bossPose) {
  const from = projectilePoint(projectile, fromTime), to = projectilePoint(projectile, toTime);
  const bossFrom = pose(fromTime), bossTo = pose(toTime), radius = projectileRadius(projectile.weapon);
  let first = Infinity;
  for (const part of parts) {
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
  return { x: from.x, y: from.y, z: from.z + (to.z - from.z) * first, time: fromTime + (toTime - fromTime) * first };
}
