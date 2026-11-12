import {atWall,sessionStage,dockSlots,dockBody,isOutbound} from './docks.js';
import { STAGE, createAssignments, EQUIPMENT, suppliedEquipment } from './config.js';
import { validateLayout, inboundPickupCells, cellKey, footprint, inBounds } from './layout.js';
export function createSession(stage = STAGE) { return { version: 5, stageId: stage.id, ...(stage.playerPlacesInbound ? { inbound: null } : {}), layout: [], assignments: createAssignments([], stage) }; }
function validFacilities(state, stage) {
  const fixtures = stage.fixtures, inlet = fixtures.find(f=>f.id==='inbound');
  const outlet = fixtures.find(f=>f.id==='outbound');
  if (outlet.width===2 && outlet.height===2 && !atWall(outlet,stage)) return false;
  if (state.inbound && (!Number.isInteger(inlet.x) || !Number.isInteger(inlet.y))) return false;
  const used = new Set([...stage.holes,...(stage.pillars??[]),...Object.values(state.waitingWorkers??{})].map(cellKey));
  for (const dock of fixtures) for (const cell of dockBody(dock)) {
    if (!inBounds(cell,stage) || used.has(cellKey(cell))) return false;
    used.add(cellKey(cell));
  }
  for (const item of state.layout) {
    for (const c of footprint(item).body) used.add(cellKey(c));
  }
  if (inlet && !inboundPickupCells(stage,used).length) return false;
  for (const item of state.layout) for (const c of footprint(item).work) used.add(cellKey(c));
  return Object.values(state.assignments).filter(isOutbound).every(id=>{
    const slot=dockSlots(stage).find(s=>s.id===id);
    return slot && !used.has(cellKey(slot.cell));
  });
}
export function validSession(state, stage = STAGE) {
  try { stage=sessionStage(stage,state); return state?.version === 5 && state.stageId === stage.id && validateLayout(state.layout, { stage, allowOutside: true }).valid && Object.keys(state.assignments).length === stage.workers.length && stage.workers.every(worker => Object.hasOwn(state.assignments, worker.key) && (state.assignments[worker.key] === null || isOutbound(state.assignments[worker.key]) || state.layout.some(item => item.id === state.assignments[worker.key] && !EQUIPMENT[item.type].belt))) && validFacilities(state,stage) && validWaitingWorkers(state, stage) && new Set(Object.values(state.assignments).filter(Boolean)).size === Object.values(state.assignments).filter(Boolean).length; } catch { return false; }
}
function validWaitingWorkers(state, stage) {
  const occupied = new Set(state.layout.flatMap(item => {
    const { body, work } = footprint(item);
    return [...body, ...work].map(cellKey);
  }));
  for (const [key, cell] of Object.entries(state.waitingWorkers ?? {})) {
    if (state.assignments[key] !== null || !Number.isSafeInteger(cell?.x) || !Number.isSafeInteger(cell?.y) ||
        inBounds(cell, stage) || occupied.has(cellKey(cell))) return false;
    occupied.add(cellKey(cell));
  }
  return true;
}
export function transact(state, action, stage = STAGE) {
  if (!validSession(state, stage)) return { ok: false, error: '저장 상태를 확인해 주세요.' };
  const next = structuredClone(state);
  if (action.type === 'moveInbound') {
    if (!Number.isInteger(action.x) || !Number.isInteger(action.y)) return {ok:false,error:'입고장 위치를 선택해 주세요.'};
    next.inbound={x:action.x,y:action.y};
    if (validSession(next,stage)) return {ok:true,state:next};
    return {ok:false,error:'빈 바닥 2×2칸과 재료를 수거할 인접 칸이 필요합니다.'};
  } else if (action.type === 'place') {
    const given = suppliedEquipment(action.id, stage); if (!given) return { ok: false, error: '지급된 설비가 아닙니다.' };
    const index = next.layout.findIndex(item => item.id === action.id);
    const variant = action.variant ?? next.layout[index]?.variant ?? given.variant ?? EQUIPMENT[given.type].defaultVariant;
    const item = { ...given, ...(variant ? {variant} : {}), id: action.id, x: action.x, y: action.y, rotation: action.rotation };
    if (index < 0) next.layout.push(item); else next.layout[index] = item;
  } else if (action.type === 'remove') {
    if (!next.layout.some(item => item.id === action.id)) return { ok: false, error: '배치된 설비를 선택해 주세요.' };
    next.layout = next.layout.filter(item => item.id !== action.id); for (const key of Object.keys(next.assignments)) if (next.assignments[key] === action.id) next.assignments[key] = null;
  } else if (action.type === 'waitOutside') {
    if (!Object.hasOwn(next.assignments, action.workerId)) return { ok: false, error: '작업자를 선택해 주세요.' };
    next.assignments[action.workerId] = null;
    (next.waitingWorkers ??= {})[action.workerId] = { x: action.x, y: action.y };
  } else if (action.type === 'assign') {
    if (next.waitingWorkers) delete next.waitingWorkers[action.workerId];
    if (!stage.workers.some(worker => worker.key === action.workerId) || (action.machineId !== null && !isOutbound(action.machineId) && !next.layout.some(item => item.id === action.machineId && !EQUIPMENT[item.type].belt))) return { ok: false, error: '작업자와 작업대 자리를 선택해 주세요.' };
    const previous = next.assignments[action.workerId], other = stage.workers.find(worker => worker.key !== action.workerId && next.assignments[worker.key] === action.machineId);
    if (action.machineId && other) next.assignments[other.key] = previous; next.assignments[action.workerId] = action.machineId;
  } else return { ok: false, error: '지원하지 않는 조작입니다.' };
  stage=sessionStage(stage,next);
  if (!validFacilities(next, stage)) return {ok:false,error:'입출고장과 배정된 작업자 자리를 비워 주세요.'};
  if (!validWaitingWorkers(next, stage)) return { ok: false, error: '공장 밖의 빈 자리를 선택해 주세요.' };
  const result = validateLayout(next.layout, { stage, allowOutside: true }); return result.valid ? { ok: true, state: next } : { ok: false, error: result.errors[0] };
}
export function validateStaffing(state, stage = STAGE) {
  const errors = state.layout.filter(item => !stage.unlimitedEquipment && !EQUIPMENT[item.type].belt && !Object.values(state.assignments).includes(item.id)).map(item => `${EQUIPMENT[item.type].name}에 작업자를 배치해 주세요.`);
  if (!Object.values(state.assignments).some(isOutbound)) errors.push('창고 직원을 배치해 주세요.'); return { valid: errors.length === 0, errors };
}
