import { EQUIPMENT, MAP, FIXED, TYPES, STAGE } from './config.js';
export const cellKey = ({ x, y }) => `${x},${y}`;
export const inBounds = ({ x, y }) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < MAP.width && y < MAP.height;
export const neighbors = cell => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy })).filter(inBounds);
export function fixedCells() {
  return FIXED.flatMap(item => Array.from({ length: item.width * item.height }, (_, i) => ({ x: item.x + i % item.width, y: item.y + Math.floor(i / item.width) })));
}
export function footprint(item) {
  const spec = EQUIPMENT[item.type];
  if (!spec) throw new Error('알 수 없는 설비');
  function transform(x, y) {
    for (let turn = 0; turn < item.rotation; turn++) {
      const height = turn % 2 === 0 ? spec.height : spec.width;
      [x, y] = [height - 1 - y, x];
    }
    return { x: x + item.x, y: y + item.y };
  }
  const body = Array.from({ length: spec.width * spec.height }, (_, i) => transform(i % spec.width, Math.floor(i / spec.width)));
  return { body, work: [transform(Math.floor((spec.width - 1) / 2), spec.height)] };
}
export function blockedCells(layout) {
  return new Set([...fixedCells(), ...layout.flatMap(item => footprint(item).body)].map(cellKey));
}
export function findPath(start, goals, blocked) {
  const targets = new Set(goals.map(cellKey));
  const key = cellKey(start);
  if (targets.has(key)) return [];
  const queue = [start], seen = new Map([[key, null]]);
  let end;
  for (let i = 0; i < queue.length && !end; i++) {
    for (const next of neighbors(queue[i])) {
      const nextKey = cellKey(next);
      if (blocked.has(nextKey) || seen.has(nextKey)) continue;
      seen.set(nextKey, queue[i]);
      queue.push(next);
      if (targets.has(nextKey)) { end = next; break; }
    }
  }
  if (!end) return null;
  const path = [];
  for (let cell = end; cellKey(cell) !== key; cell = seen.get(cellKey(cell))) path.unshift(cell);
  return path;
}
export function validateLayout(layout, { requireAll = true } = {}) {
  if (!Array.isArray(layout) || layout.length > STAGE.maxMachines) return { valid: false, errors: ['설비는 최대 10대까지 배치할 수 있습니다.'] };
  const errors = new Set(), ids = new Set();
  const structurallyValid = layout.every(item => item && Object.hasOwn(EQUIPMENT, item.type) && Number.isInteger(item.x) && Number.isInteger(item.y) && Number.isInteger(item.rotation) && item.rotation >= 0 && item.rotation <= 3);
  if (!structurallyValid) return { valid: false, errors: ['올바르지 않은 설비 데이터입니다.'] };
  const occupied = new Map(fixedCells().map(cell => [cellKey(cell), '고정 시설']));
  const access = new Set(FIXED.map(item => cellKey(item.access)));
  for (const item of layout) {
    if (item.id && ids.has(item.id)) errors.add('설비 ID가 중복되었습니다.');
    ids.add(item.id);
    const name = EQUIPMENT[item.type].name;
    for (const cell of footprint(item).body) {
      const key = cellKey(cell);
      if (!inBounds(cell)) errors.add(`${name}: 공장 부지 밖에는 놓을 수 없습니다.`);
      if (occupied.has(key) || access.has(key)) errors.add(`${name}: 설비·고정 시설·출입구와 겹칩니다.`);
      occupied.set(key, name);
    }
  }
  if (requireAll) for (const type of TYPES) if (!layout.some(item => item.type === type)) errors.add(`${EQUIPMENT[type].name}가 필요합니다.`);
  const blocked = blockedCells(layout);
  const workPlaces = new Set();
  for (const item of layout) {
    const name = EQUIPMENT[item.type].name;
    const { work } = footprint(item);
    if (workPlaces.has(cellKey(work[0]))) errors.add(`${name}: 작업자 자리 한 칸은 다른 작업대와 공유할 수 없습니다.`);
    workPlaces.add(cellKey(work[0]));
    if (work.some(cell => !inBounds(cell) || blocked.has(cellKey(cell)) || access.has(cellKey(cell)))) errors.add(`${name}: 점선 작업 공간을 비워 주세요.`);
    else if (work.some(cell => findPath(FIXED[0].access, [cell], blocked) === null)) errors.add(`${name}: 작업 공간까지 길이 끊겼습니다.`);
  }
  for (const fixture of FIXED.slice(1)) if (findPath(FIXED[0].access, [fixture.access], blocked) === null) errors.add(`${fixture.label}까지 통로가 연결되어야 합니다.`);
  return { valid: errors.size === 0, errors: [...errors] };
}
