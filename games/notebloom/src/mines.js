import { FLIGHT_SPEED } from './flight.js?v=e13089ee01a6';
export const MINE_TRAVEL = 59.25 / FLIGHT_SPEED;
export const MINE_LAUNCH_HEIGHT = 3.5;
export const MINE_PASS_HEIGHT = .4;
const MINE_ARC_HEIGHT = 1;
// Choose a continuous fan in world space, independently of lanes and notes.
export function mineFanTargets(count, random) {
  const center = (random() - .5) * 1.1, spread = 1.35 + random() * .55;
  return Array.from({ length: count }, (_, i) => center + (count === 1 ? 0 : 2 * i / (count - 1) - 1) * spread);
}
// Sample the curved fan once, then travel along it by distance rather than time
// fraction. Spreading and the vertical arc cannot accidentally increase speed.
function minePath(mine) {
  if (mine.flightPath) return mine.flightPath;
  const points = [], distances = [0];
  for (let i = 0; i <= 64; i++) {
    const progress = i / 64;
    const point = { x: mine.originX + (mine.targetX - mine.originX) * progress,
      y: MINE_LAUNCH_HEIGHT * (1 - progress) + MINE_PASS_HEIGHT * progress + Math.sin(progress * Math.PI) * MINE_ARC_HEIGHT,
      z: -56 + 59.25 * progress };
    if (i) { const previous = points[i - 1]; distances.push(distances[i - 1] + Math.hypot(point.x - previous.x, point.y - previous.y, point.z - previous.z)); }
    points.push(point);
  }
  points[64].y = MINE_PASS_HEIGHT;
  return mine.flightPath = { points, distances, length: distances[64] };
}
export const mineArrival = mine => mine.time + minePath(mine).length / FLIGHT_SPEED;
// A fan launched behind the boss. The x separation grows throughout the flight.
export function minePoint(mine, time) {
  const path = minePath(mine), distance = Math.max(0, time - mine.time) * FLIGHT_SPEED;
  if (distance >= path.length) {
    const extra = distance - path.length, dx = mine.targetX - mine.originX, length = Math.hypot(dx, 59.25);
    return { x: mine.targetX + extra * dx / length, y: MINE_PASS_HEIGHT, z: 3.25 + extra * 59.25 / length };
  }
  let left = 0, right = 64;
  while (right - left > 1) { const middle = (left + right) >> 1; if (path.distances[middle] <= distance) left = middle; else right = middle; }
  const blend = (distance - path.distances[left]) / (path.distances[right] - path.distances[left]);
  const from = path.points[left], to = path.points[right];
  return { x: from.x + (to.x - from.x) * blend, y: from.y + (to.y - from.y) * blend, z: from.z + (to.z - from.z) * blend };
}
