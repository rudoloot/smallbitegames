import { bossColliders } from './themes.js?v=b8cbb4f66a3f';
import { FLIGHT_SPEED } from './flight.js?v=b8cbb4f66a3f';
import { bossLocalPoint, BOSS_SHIELD_RADIUS } from './boss-rotation.js?v=b8cbb4f66a3f';
// Shared world-space geometry for simulation and rendering.
export function bossPose() {
  return { x: 0, y: 1.05, z: -52 };
}
export const projectileSpeed = weapon => weapon === 'missile' ? FLIGHT_SPEED : weapon === 'rail' ? 260 : weapon === 'rocket' ? 85 : 115;
export const projectileRadius = weapon => weapon === 'missile' || weapon === 'rocket' ? .18 : weapon === 'rail' ? .045 : .07;
export function projectilePoint(projectile, time) {
  if (projectile.celebration) {
    const t = Math.max(0,Math.min(1,(time-projectile.time)/projectile.flightTime)), target = projectile.target;
    return {x:projectile.x+(target.x-projectile.x)*t,y:projectile.y+(target.y-projectile.y)*t+Math.sin(t*Math.PI)*.8,z:projectile.z+(target.z-projectile.z)*t};
  }
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
// Stop at the shield's outer surface, with a normal for the spreading ripple.
export function intersectShield(projectile, fromTime, toTime, pose = bossPose, fromPoint) {
  const from = fromPoint ?? projectilePoint(projectile, fromTime), to = projectilePoint(projectile, toTime);
  const center = pose(fromTime), endCenter = pose(toTime);
  const axes = ['x', 'y', 'z'];
  const p = axes.map(axis => from[axis] - center[axis]);
  const delta = axes.map((axis, i) => to[axis] - endCenter[axis] - p[i]);
  const radius = BOSS_SHIELD_RADIUS + projectileRadius(projectile.weapon);
  const a = delta.reduce((sum, value) => sum + value * value, 0);
  const b = 2 * p.reduce((sum, value, i) => sum + value * delta[i], 0);
  const c = p.reduce((sum, value) => sum + value * value, 0) - radius * radius;
  const discriminant = b * b - 4 * a * c;
  let fraction = c <= 0 ? 0 : a > 0 && discriminant >= 0 ? (-b - Math.sqrt(discriminant)) / (2 * a) : Infinity;
  if (fraction < 0 || fraction > 1) return null;
  const time = fromTime + (toTime - fromTime) * fraction, contactCenter = pose(time);
  const relative = p.map((value, i) => value + delta[i] * fraction);
  const length = Math.hypot(...relative) || 1;
  const normal = Object.fromEntries(axes.map((axis, i) => [axis, relative[i] / length]));
  return { ...Object.fromEntries(axes.map(axis => [axis, contactCenter[axis] + normal[axis] * BOSS_SHIELD_RADIUS])), time, normal };
}

// Swept ellipsoid intersection includes boss motion and avoids tunnelling at low FPS.
export function intersectBoss(projectile, fromTime, toTime, pose = bossPose, fromPoint, kind = 'bird') {
  const from = fromPoint ?? projectilePoint(projectile, fromTime), to = projectilePoint(projectile, toTime);
  const bossFrom = pose(fromTime), bossTo = pose(toTime), radius = projectileRadius(projectile.weapon);
  const localFrom = bossLocalPoint(from, bossFrom, fromTime), localTo = bossLocalPoint(to, bossTo, toTime);
  let first = Infinity;
  for (const part of bossColliders(kind)) {
    const p = ['x', 'y', 'z'].map(axis => (localFrom[axis] - part[axis]) / (part['r' + axis] + radius));
    const q = ['x', 'y', 'z'].map(axis => (localTo[axis] - part[axis]) / (part['r' + axis] + radius));
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
