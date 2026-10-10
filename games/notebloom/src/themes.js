export const STAGE_THEMES = [
  { id: 'red', name: '빨강', hue: 0, saturation: .78, color: 0xff4452, boss: 'octopus', bossName: '문어형 비행 로봇' },
  { id: 'orange', name: '주황', hue: .075, saturation: .82, color: 0xff953f, boss: 'bird', bossName: '새형 비행 로봇' },
  { id: 'yellow', name: '노랑', hue: .145, saturation: .78, color: 0xf5d64a, boss: 'ufo', bossName: 'UFO 로봇' },
  { id: 'green', name: '초록', hue: .36, saturation: .66, color: 0x44d47e, boss: 'crab', bossName: '꽃게형 비행 로봇' },
  { id: 'blue', name: '파랑', hue: .59, saturation: .78, color: 0x438cff, boss: 'snake', bossName: '뱀형 비행 로봇' },
  { id: 'indigo', name: '남색', hue: .68, saturation: .58, color: 0x514bbd, boss: 'shark', bossName: '상어형 비행 로봇' },
  { id: 'purple', name: '보라', hue: .78, saturation: .72, color: 0xae65eb, boss: 'urchin', bossName: '성게형 비행 로봇' },
  { id: 'black', name: '검정', hue: 0, saturation: 0, color: 0x242833, boss: 'rose', bossName: '장미형 비행 로봇' },
];
export const themeForId = id => STAGE_THEMES.find(theme => theme.id === id) || STAGE_THEMES[4];

// Keep the whole-song acoustic impression, but choose one fixed named palette.
export function themeForMood(mood) {
  if (!mood) return themeForId('blue');
  if (mood.energy < .48 && mood.brightness < .15) return themeForId('black');
  const hue = ((mood.hue || 0) % 1 + 1) % 1;
  const distance = theme => Math.min(Math.abs(hue - theme.hue), 1 - Math.abs(hue - theme.hue));
  return STAGE_THEMES.slice(0, 7).reduce((best, theme) => distance(theme) < distance(best) ? theme : best);
}
export const themeForChart = chart => chart?.themeId ? themeForId(chart.themeId) : themeForMood(chart?.mood);

// These bounds size the faceted armor and its collision volumes.
const hull = { x: 0, y: 0, z: 0, rx: 1.05, ry: .82, rz: .74 };
const sideHull = x => ({ x, y: .05, z: 0, rx: .9, ry: .375, rz: .375 });
export const BOSS_COLLIDERS = {
  octopus: [hull, ...[-1, 1].flatMap(side => [sideHull(side * 1.4), { x: side * 1.1, y: -.6, z: .12, rx: .55, ry: .28, rz: .35 }])],
  bird: [hull, sideHull(-1.5), sideHull(1.5)],
  ufo: [hull, { x: 0, y: -.12, z: 0, rx: 2.25, ry: .24, rz: .95 }],
  crab: [hull, ...[-1, 1].map(side => ({ x: side * 1.7, y: .12, z: .05, rx: .65, ry: .55, rz: .4 }))],
  snake: [hull, ...[-1, 1].flatMap(side => [1.15,1.55,1.95].map((x,i) => ({ x: side*x, y: Math.sin(i*1.1)*.15, z: -.2, rx: .32, ry: .29, rz: .32 })))],
  shark: [hull, sideHull(-1.5), sideHull(1.5)],
  urchin: [hull, ...[-1, 1].map(side => ({ x: side * 1.55, y: 0, z: 0, rx: .75, ry: .26, rz: .3 }))],
  rose: [hull, ...[-1, 1].map(side => ({ x: side * 1.35, y: .12, z: .1, rx: .75, ry: .55, rz: .35 }))],
};
export const bossColliders = kind => BOSS_COLLIDERS[kind] || BOSS_COLLIDERS.bird;
