import { EQUIPMENT, STAGE, suppliedEquipment } from './config.js';
export const cellKey = ({ x, y }) => `${x},${y}`;
export const inBounds = ({ x, y }, stage = STAGE) => Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < stage.width && y < stage.height && (!stage.cells || stage.cells.includes(`${x},${y}`));
export const isHole = (cell, stage = STAGE) => stage.holes.some(hole => cellKey(hole) === cellKey(cell));
export const neighbors = (cell, stage = STAGE) => [[0, -1], [1, 0], [0, 1], [-1, 0]].map(([dx, dy]) => ({ x: cell.x + dx, y: cell.y + dy })).filter(c => inBounds(c, stage));
export function fixedCells(stage = STAGE) { return stage.fixtures.flatMap(item => Array.from({ length: item.width * item.height }, (_, i) => ({ x: item.x + i % item.width, y: item.y + Math.floor(i / item.width) }))); }
export function footprint(item) {
  const spec = EQUIPMENT[item.type]; if (!spec) throw Error('알 수 없는 설비');
  function transform(x, y) { for (let turn = 0; turn < item.rotation; turn++) [x, y] = [(turn % 2 ? spec.width : spec.height) - 1 - y, x]; return { x: x + item.x, y: y + item.y }; }
  const cells = spec.mask ? spec.mask.flatMap((row, y) => [...row].flatMap((c, x) => c === '.' ? [] : [[x, y]])) : Array.from({ length: spec.width * spec.height }, (_, i) => [i % spec.width, Math.floor(i / spec.width)]);
  const outputY = spec.mask?.findIndex(row => row.includes('O'));
  const output = outputY >= 0 ? transform(spec.mask[outputY].indexOf('O'), outputY) : null;
  return { body: cells.map(([x,y]) => transform(x,y)), work: spec.belt ? [] : [transform(...(spec.workCell ?? [Math.floor((spec.width - 1) / 2), spec.height]))], output, outlet: transform(spec.width, spec.height - 1) };
}
export function blockedCells(layout, stage = STAGE) { return new Set([...fixedCells(stage), ...stage.holes, ...(stage.pillars ?? []), ...layout.flatMap(item => footprint(item).body)].map(cellKey)); }
export function findPath(start, goals, blocked, stage = STAGE) {
  const targets = new Set(goals.filter(cell => inBounds(cell, stage) && !blocked.has(cellKey(cell))).map(cellKey));
  if (targets.has(cellKey(start))) return [];
  const queue = [start], seen = new Map([[cellKey(start), null]]); let end;
  for (let i = 0; i < queue.length && !end; i++) for (const next of neighbors(queue[i], stage)) {
    const key = cellKey(next); if (blocked.has(key) || seen.has(key)) continue;
    seen.set(key, queue[i]); queue.push(next); if (targets.has(key)) { end = next; break; }
  }
  if (!end) return null;
  const path = []; for (let cell = end; cellKey(cell) !== cellKey(start); cell = seen.get(cellKey(cell))) path.unshift(cell); return path;
}
export function validateLayout(layout, { stage = STAGE, requireAll = false, checkPaths = false } = {}) {
  if (!Array.isArray(layout) || (!stage.unlimitedEquipment && layout.length > stage.inventory.length)) return { valid: false, errors: ['지급된 설비만 배치할 수 있습니다.'] };
  const errors = new Set(), ids = new Set(), occupied = new Set([...fixedCells(stage), ...(stage.pillars ?? [])].map(cellKey)), access = new Set(stage.fixtures.map(item => cellKey(item.access)));
  for (const item of layout) {
    const supply = suppliedEquipment(item.id, stage);
    if (!supply || supply.type !== item.type || !Number.isInteger(item.x) || !Number.isInteger(item.y) || !Number.isInteger(item.rotation) || item.rotation < 0 || item.rotation > 3 || ids.has(item.id)) return { valid: false, errors: ['지급 설비와 위치·방향을 확인해 주세요.'] };
    ids.add(item.id); const { body } = footprint(item), name = EQUIPMENT[item.type].name;
    for (const cell of body) { if (!inBounds(cell, stage)) errors.add(`${name}: 부지 밖에는 놓을 수 없습니다.`); if (occupied.has(cellKey(cell)) || access.has(cellKey(cell))) errors.add(`${name}: 설비·입고장·창고·출입 칸과 겹칩니다.`); occupied.add(cellKey(cell)); }
    const supported = body.filter(cell => !isHole(cell, stage)).length;
    if (!supported || (body.length === 1 && isHole(body[0], stage))) errors.add(`${name}: 구멍 위에 한 칸 설비는 놓을 수 없습니다.`);
  }
  const blocked = blockedCells(layout, stage), slots = new Set();
  for (const item of layout) for (const cell of footprint(item).work) {
    const key = cellKey(cell); if (!inBounds(cell, stage) || blocked.has(key) || access.has(key) || slots.has(key)) errors.add(`${EQUIPMENT[item.type].name}: 작업자 자리 한 칸을 비워 주세요.`); slots.add(key);
    if (checkPaths && findPath(stage.fixtures[0].access, [cell], blocked, stage) === null) errors.add(`${EQUIPMENT[item.type].name}: 작업자 통로가 끊겼습니다.`);
  }
  if (requireAll && !stage.unlimitedEquipment && ids.size !== stage.inventory.length) errors.add('지급된 작업대를 모두 배치해 주세요.');
  if (checkPaths) for (const fixture of stage.fixtures) if (findPath(stage.fixtures[0].access, [fixture.access], blocked, stage) === null) errors.add(`${fixture.label}까지 통로가 필요합니다.`);
  return { valid: errors.size === 0, errors: [...errors] };
}
