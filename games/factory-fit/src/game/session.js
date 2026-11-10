import { STAGE, createAssignments, EQUIPMENT, suppliedEquipment } from './config.js';
import { validateLayout } from './layout.js';
export function createSession(stage = STAGE) { return { version: 5, stageId: stage.id, layout: [], assignments: createAssignments([], stage) }; }
export function validSession(state, stage = STAGE) {
  try { return state?.version === 5 && state.stageId === stage.id && validateLayout(state.layout, { stage }).valid && Object.keys(state.assignments).length === stage.workers.length && stage.workers.every(worker => Object.hasOwn(state.assignments, worker.key) && (state.assignments[worker.key] === null || state.assignments[worker.key] === 'outbound' || state.layout.some(item => item.id === state.assignments[worker.key] && !EQUIPMENT[item.type].belt))) && new Set(Object.values(state.assignments).filter(Boolean)).size === Object.values(state.assignments).filter(Boolean).length; } catch { return false; }
}
export function transact(state, action, stage = STAGE) {
  if (!validSession(state, stage)) return { ok: false, error: '저장 상태를 확인해 주세요.' };
  const next = structuredClone(state);
  if (action.type === 'place') {
    const given = suppliedEquipment(action.id, stage); if (!given) return { ok: false, error: '지급된 설비가 아닙니다.' };
    const item = { ...given, id: action.id, x: action.x, y: action.y, rotation: action.rotation }, index = next.layout.findIndex(item => item.id === action.id); if (index < 0) next.layout.push(item); else next.layout[index] = item;
  } else if (action.type === 'remove') {
    if (!next.layout.some(item => item.id === action.id)) return { ok: false, error: '배치된 설비를 선택해 주세요.' };
    next.layout = next.layout.filter(item => item.id !== action.id); for (const key of Object.keys(next.assignments)) if (next.assignments[key] === action.id) next.assignments[key] = null;
  } else if (action.type === 'assign') {
    if (!stage.workers.some(worker => worker.key === action.workerId) || (action.machineId !== null && action.machineId !== 'outbound' && !next.layout.some(item => item.id === action.machineId && !EQUIPMENT[item.type].belt))) return { ok: false, error: '작업자와 작업대 자리를 선택해 주세요.' };
    const previous = next.assignments[action.workerId], other = stage.workers.find(worker => worker.key !== action.workerId && next.assignments[worker.key] === action.machineId);
    if (action.machineId && other) next.assignments[other.key] = previous; next.assignments[action.workerId] = action.machineId;
  } else return { ok: false, error: '지원하지 않는 조작입니다.' };
  const result = validateLayout(next.layout, { stage }); return result.valid ? { ok: true, state: next } : { ok: false, error: result.errors[0] };
}
export function validateStaffing(state, stage = STAGE) {
  const errors = state.layout.filter(item => !stage.unlimitedEquipment && !EQUIPMENT[item.type].belt && !Object.values(state.assignments).includes(item.id)).map(item => `${EQUIPMENT[item.type].name}에 작업자를 배치해 주세요.`);
  if (!Object.values(state.assignments).includes('outbound')) errors.push('창고 직원을 배치해 주세요.'); return { valid: errors.length === 0, errors };
}
