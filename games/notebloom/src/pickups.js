export const UPGRADE_COLORS = ['red', 'blue', 'purple'];
export const UPGRADES = {
  red: { color: 0xff4d57, name: '총알·미사일 +20' },
  blue: { color: 0x428dff, name: '총알 +1줄' },
  purple: { color: 0xba60ff, name: '유도 미사일 +1발/초' },
};
export function pickupColor(pickup, time) {
  return UPGRADE_COLORS[Math.floor(Math.max(0, time - pickup.time) / 2) % 3];
}
export function pickupPoint(pickup, time) {
  const age = Math.max(0, time - pickup.time);
  const phase = age + (pickup.id ?? 0) * 1.7;
  return { x: pickup.x + Math.sin(phase * .9) * .15,
    y: 1.9 + Math.sin(phase * 2) * .22, z: -2.5 + Math.cos(phase * .8) * .35 };
}
