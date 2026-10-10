export const MINE_TRAVEL = 1.5;
// Choose a continuous fan in world space, independently of lanes and notes.
export function mineFanTargets(count, random) {
  const center = (random() - .5) * 1.1, spread = 1.35 + random() * .55;
  return Array.from({ length: count }, (_, i) => center + (2 * i / (count - 1) - 1) * spread);
}
// A fan launched behind the boss. The x separation grows throughout the flight.
export function minePoint(mine, time) {
  const progress = Math.max(0, (time - mine.time) / MINE_TRAVEL);
  return {
    x: mine.originX + (mine.targetX - mine.originX) * progress,
    y: progress < 1 ? 4.5 * (1 - progress) + .65 * progress + Math.sin(progress * Math.PI) * 1.4 : .65,
    z: -56 + 59.25 * progress,
  };
}
