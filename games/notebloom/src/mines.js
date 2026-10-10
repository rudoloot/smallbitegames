export const MINE_TRAVEL = 1.5;
export const MINE_LAUNCH_HEIGHT = 3.5;
export const MINE_PASS_HEIGHT = .4;
const MINE_ARC_HEIGHT = 1;
// Choose a continuous fan in world space, independently of lanes and notes.
export function mineFanTargets(count, random) {
  const center = (random() - .5) * 1.1, spread = 1.35 + random() * .55;
  return Array.from({ length: count }, (_, i) => center + (count === 1 ? 0 : 2 * i / (count - 1) - 1) * spread);
}
// A fan launched behind the boss. The x separation grows throughout the flight.
export function minePoint(mine, time) {
  const progress = Math.max(0, (time - mine.time) / MINE_TRAVEL);
  return {
    x: mine.originX + (mine.targetX - mine.originX) * progress,
    y: progress < 1 ? MINE_LAUNCH_HEIGHT * (1 - progress) + MINE_PASS_HEIGHT * progress + Math.sin(progress * Math.PI) * MINE_ARC_HEIGHT : MINE_PASS_HEIGHT,
    z: -56 + 59.25 * progress,
  };
}
