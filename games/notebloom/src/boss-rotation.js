export const BOSS_ROTATION_PERIOD = 24;
export const WEAK_POINT_ARC = Math.PI / 3;
export const bossRotation = time => ((time % BOSS_ROTATION_PERIOD + BOSS_ROTATION_PERIOD) % BOSS_ROTATION_PERIOD) / BOSS_ROTATION_PERIOD * Math.PI * 2;
export const bossWeakPointAt = time => Math.abs(bossRotation(time) - Math.PI) <= WEAK_POINT_ARC / 2 + 1e-9;

// The model faces +Z. Rotate points into its local armor coordinates for hits.
export function bossLocalPoint(point, center, time) {
  const angle = bossRotation(time), c = Math.cos(angle), s = Math.sin(angle);
  const x = point.x - center.x, z = point.z - center.z;
  return { x: c * x - s * z, y: point.y - center.y, z: s * x + c * z };
}
