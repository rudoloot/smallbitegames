import { bossColliders } from './themes.js?v=c9a3057ee538';
import { FLIGHT_SPEED } from './flight.js?v=c9a3057ee538';
// Shared world-space geometry for simulation and rendering.
export function bossPose() {
  return { x: 0, y: 1.05, z: -52 };
}
export const projectileSpeed = weapon => weapon === 'missile' ? FLIGHT_SPEED : weapon === 'rail' ? 260 : weapon === 'rocket' ? 85 : 115;
export const projectileRadius = weapon => weapon === 'missile' || weapon === 'rocket' ? .18 : weapon === 'rail' ? .045 : .07;
export function projectilePoint(projectile, time) {
  if (projectile.weapon === 'missile') return { ...projectile.position };
  const distance = projectile.speed * (time - projectile.time), direction = projectile.direction ?? { x: 0, y: 0, z: -1 };
  return { x: projectile.x + direction.x * distance, y: projectile.y + direction.y * distance,
    z: projectile.z + direction.z * distance };
}
export function advanceMissile(projectile, time, target) {
  const age = time - projectile.time;
  const launchPoint = duration => {
    const distance = Math.max(0, duration) * FLIGHT_SPEED / Math.hypot(.08, .07, 1);
    return { x: projectile.x + projectile.side * .08 * distance, y: projectile.y + .07 * distance, z: projectile.z - distance };
  };
  if (age <= .32) {
    projectile.position = launchPoint(age);
    return;
  }
  if (projectile.checkedAt < projectile.time + .32) projectile.position = launchPoint(.32);
  const dt = time - Math.max(projectile.checkedAt, projectile.time + .32);
  const point = projectile.position;
  const dx = target.x - point.x, dy = target.y - point.y, dz = target.z - point.z;
  const distance = Math.hypot(dx, dy, dz), step = Math.min(distance, dt * FLIGHT_SPEED);
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
