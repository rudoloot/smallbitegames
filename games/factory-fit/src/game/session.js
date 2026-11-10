import { STAGE, EQUIPMENT, WORKERS, TYPES, WAREHOUSE, createDefaultLayout, createAssignments } from './config.js';
import { validateLayout } from './layout.js';
export const TOTAL_CAPITAL = STAGE.budget + createDefaultLayout().reduce((sum, item) => sum + item.paid, 0);
export function createSession() { const layout = createDefaultLayout(); return { version: 4, stageId: STAGE.id, budget: STAGE.budget, nextId: 5, layout, assignments: createAssignments(layout) }; }
export function validAssignments(assignments, layout) {
  return assignments && typeof assignments === 'object' && !Array.isArray(assignments) &&
    Object.keys(assignments).length === WORKERS.length && WORKERS.every(worker => Object.hasOwn(assignments, worker.key) && (assignments[worker.key] === null || assignments[worker.key] === WAREHOUSE.id || layout.some(item => item.id === assignments[worker.key]))) &&
    new Set(Object.values(assignments).filter(Boolean)).size === Object.values(assignments).filter(Boolean).length;
}
export function validateStaffing(state) {
  const errors = TYPES.filter(type => !state.layout.some(machine => machine.type === type && Object.values(state.assignments).includes(machine.id))).map(type => `${EQUIPMENT[type].name}의 한 칸 자리에 작업자를 배치해 주세요.`);
  if (!Object.values(state.assignments).includes(WAREHOUSE.id)) errors.push('완제품을 가져와 보관할 창고 직원을 한 칸 자리에 배치해 주세요.');
  return { valid: !errors.length, errors };
}
export function validSession(state) {
  try {
    return state?.version === 4 && state.stageId === STAGE.id && Number.isSafeInteger(state.budget) && state.budget >= 0 &&
      Number.isSafeInteger(state.nextId) && state.nextId >= 5 && state.nextId < 1000000 &&
      validateLayout(state.layout, { requireAll: false }).valid &&
      state.layout.every(item => /^m\d+$/.test(item.id) && Number(item.id.slice(1)) < state.nextId && item.paid === EQUIPMENT[item.type].price) &&
      new Set(state.layout.map(item => item.id)).size === state.layout.length && validAssignments(state.assignments, state.layout) &&
      state.budget + state.layout.reduce((sum, item) => sum + item.paid, 0) === TOTAL_CAPITAL;
  } catch { return false; }
}
export function transact(state, action) {
  if (!validSession(state)) return { ok: false, error: '저장 상태가 올바르지 않습니다.' };
  const next = structuredClone(state);
  if (action.type === 'assign') {
    if (!WORKERS.some(worker => worker.key === action.workerId) || (action.machineId !== null && action.machineId !== WAREHOUSE.id && !state.layout.some(item => item.id === action.machineId))) return { ok: false, error: '작업자와 작업대·창고를 확인해 주세요.' };
    const previous = next.assignments[action.workerId];
    const occupant = action.machineId === null ? null : WORKERS.find(worker => worker.key !== action.workerId && next.assignments[worker.key] === action.machineId);
    if (occupant) next.assignments[occupant.key] = previous;
    next.assignments[action.workerId] = action.machineId;
  } else if (action.type === 'buy') {
    const spec = EQUIPMENT[action.equipment];
    if (!Object.hasOwn(EQUIPMENT, action.equipment)) return { ok: false, error: '구매할 설비를 선택해 주세요.' };
    if (state.budget < spec.price) return { ok: false, error: '예산이 부족합니다. 기존 설비를 판매하면 100% 환급됩니다.' };
    if (state.nextId >= 999999) return { ok: false, error: '이 의뢰의 거래 횟수 한도에 도달했습니다.' };
    next.layout.push({ id: `m${next.nextId++}`, type: action.equipment, x: action.x, y: action.y, rotation: action.rotation, paid: spec.price });
    next.budget -= spec.price;
  } else {
    const index = next.layout.findIndex(item => item.id === action.id);
    if (index < 0) return { ok: false, error: '해당 설비를 찾을 수 없습니다. 고정 시설은 이동·판매할 수 없습니다.' };
    if (action.type === 'sell') {
      next.budget += next.layout[index].paid;
      next.layout.splice(index, 1);
      for (const worker of WORKERS) if (next.assignments[worker.key] === action.id) next.assignments[worker.key] = null;
    } else if (action.type === 'move') {
      next.layout[index] = { ...next.layout[index], x: action.x, y: action.y, rotation: action.rotation };
    } else return { ok: false, error: '지원하지 않는 조작입니다.' };
  }
  const result = validateLayout(next.layout, { requireAll: false });
  if (!result.valid) return { ok: false, error: result.errors[0] };
  return { ok: true, state: next };
}
