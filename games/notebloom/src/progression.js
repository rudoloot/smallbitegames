export const UPGRADES = [
  { id: 'damage', name: '강화 탄두', detail: '모든 무기 피해 +8%', max: 5 },
  { id: 'rate', name: '고속 노리쇠', detail: '연사 속도 +5%', max: 5 },
  { id: 'health', name: '확장 배터리', detail: '최대 체력 +15', max: 5 },
  { id: 'heal', name: '음표 수리', detail: '음표 회복량 +1', max: 5 },
  { id: 'armor', name: '방폭 장갑', detail: '지뢰 피해 −8%', max: 5 },
  { id: 'focus', name: '리듬 기억', detail: '음표 놓침 피해 −10%', max: 5 },
  { id: 'ammo', name: '대용량 탄창', detail: '획득 무기 탄약 +15%', max: 5 },
  { id: 'supply', name: '보급 신호', detail: '무기 등장 간격 −2초', max: 5 },
  { id: 'xp', name: '학습 프로세서', detail: '경험치 획득 +10%', max: 5 },
  { id: 'shield', name: '긴급 보호막', detail: '매 게임 지뢰 피해 1회 무효화', max: 3 },
];
export const freshProfile = () => ({ xp: 0, levels: {}, runs: [] });
export const upgradeCost = (profile, id) => 50 + (profile.levels[id] || 0) * 35;
export function buyUpgrade(profile, id) {
  const upgrade = UPGRADES.find(item => item.id === id), cost = upgradeCost(profile, id);
  if (!upgrade || (profile.levels[id] || 0) >= upgrade.max || profile.xp < cost) return false;
  profile.xp -= cost; profile.levels[id] = (profile.levels[id] || 0) + 1; return true;
}
export function creditRun(profile, id, xp) {
  if (profile.runs.includes(id)) return false;
  profile.xp += Math.max(0, Math.floor(xp)); profile.runs.push(id); profile.runs = profile.runs.slice(-100); return true;
}
export function loadProfile(storage) {
  try {
    const raw = JSON.parse(storage.getItem('notebloom.progress.v1'));
    const profile = freshProfile();
    if (Number.isSafeInteger(raw?.xp) && raw.xp >= 0) profile.xp = raw.xp;
    for (const item of UPGRADES) profile.levels[item.id] = Math.max(0, Math.min(item.max, Math.floor(Number(raw?.levels?.[item.id]) || 0)));
    profile.runs = Array.isArray(raw?.runs) ? raw.runs.filter(id => typeof id === 'string').slice(-100) : [];
    return profile;
  } catch { return freshProfile(); }
}
