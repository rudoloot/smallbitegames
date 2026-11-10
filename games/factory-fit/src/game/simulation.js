import { STAGE, TYPES, EQUIPMENT, FIXED, MAP, WORKERS, WAREHOUSE, createAssignments } from './config.js';
import { footprint, blockedCells, findPath, cellKey, neighbors } from './layout.js';

export const DT = 0.2;
const BUFFER = 2;
const workplace = (machines, id) => id === WAREHOUSE.id ? { id, type: 'warehouse', work: [WAREHOUSE.access] } : machines.find(machine => machine.id === id);
export function createSimulation(layout, assignments = createAssignments(layout)) {
  const blocked = blockedCells(layout);
  const machines = layout.map(item => ({ ...item, input: 0, incoming: 0, output: 0, reserved: 0, processing: 0, progress: 0, work: footprint(item).work, metrics: { busy: 0, starved: 0, blocked: 0, unstaffed: 0 } }));
  const used = new Set(Object.values(assignments).filter(Boolean).map(id => cellKey(workplace(machines, id).work[0])));
  const workers = WORKERS.map((worker, id) => {
    const machine = workplace(machines, assignments[worker.key]);
    let spawn = machine?.work[0];
    if (!spawn) {
      outer: for (let y = 4; y < MAP.height; y++) for (let x = 2; x < MAP.width - 2; x++) {
        const cell = { x, y };
        if (!blocked.has(cellKey(cell)) && !used.has(cellKey(cell)) && findPath(FIXED[0].access, [cell], blocked) !== null) { spawn = cell; break outer; }
      }
    }
    if (!spawn) throw new Error('작업자를 둘 빈 공간이 부족합니다.');
    used.add(cellKey(spawn));
    return { ...worker, ...spawn, id, machineId: machine?.id ?? null, from: { ...spawn }, path: [], job: null, carrying: false, wait: 0, nextBreak: 20, breakLeft: 0, metrics: { moving: 0, collision: 0, idle: 0, break: 0, working: 0 }, status: machine ? '작업 준비' : '미배치' };
  });
  return { tick: 0, time: 0, supplied: 0, shipped: 0, warehouse: { stock: 0, incoming: 0 }, firstShipment: null, workers, machines, blocked, complete: false, heat: {} };
}
function routeBlocked(sim, worker, dynamic = false) {
  return new Set([...sim.blocked,
    ...sim.workers.filter(other => other.id !== worker.id && other.machineId).map(other => cellKey(workplace(sim.machines, other.machineId).work[0])),
    ...(dynamic ? sim.workers.filter(other => other.id !== worker.id).map(cellKey) : []),
  ]);
}
function pathTo(sim, worker, goals, dynamic = false) { return findPath(worker, goals, routeBlocked(sim, worker, dynamic)); }
function travel(sim, worker, phase, goals, extra = {}) {
  const path = pathTo(sim, worker, goals);
  if (path === null) return false;
  worker.path = path;
  worker.job = { phase, goals, target: path.at(-1) ?? { x: worker.x, y: worker.y }, ...extra };
  return true;
}
function assignJob(sim, worker) {
  const own = workplace(sim.machines, worker.machineId);
  if (!own) { worker.status = '미배치'; return; }
  if (worker.toilet && sim.time >= worker.nextBreak && !own.processing) {
    if (travel(sim, worker, 'toilet', [FIXED[2].access])) { worker.status = '화장실 가는 중'; return; }
  }
  if (cellKey(worker) !== cellKey(own.work[0])) {
    travel(sim, worker, 'home', own.work); worker.status = '작업대로 복귀'; return;
  }
  const warehouseWorker = own.id === WAREHOUSE.id;
  if (!warehouseWorker && (own.processing > 0 || own.input > 0)) { worker.status = '작업 중'; return; }
  const stage = warehouseWorker ? 4 : TYPES.indexOf(own.type);
  if (!warehouseWorker && (own.input + own.incoming >= BUFFER || own.output + own.reserved >= BUFFER)) { worker.status = '결과물 수거 대기'; return; }
  const sources = stage === 0 ? [{ id: 'inbound', work: [FIXED[0].access] }] : sim.machines.filter(machine => machine.type === TYPES[stage - 1] && machine.output > 0);
  let best;
  for (const source of sources) {
    // 선공정 직원의 자리를 밟지 않고 작업대 본체에 인접한 칸에서 결과물을 집는다.
    const blocked = routeBlocked(sim, worker);
    const goals = source.id === 'inbound' ? source.work : [...new Map(footprint(source).body.flatMap(neighbors).filter(cell => !blocked.has(cellKey(cell))).map(cell => [cellKey(cell), cell])).values()];
    const path = pathTo(sim, worker, goals);
    if (path !== null && (!best || path.length < best.path.length)) best = { source, goals, path };
  }
  if (best) {
    if (stage > 0) { best.source.output--; best.source.reserved++; }
    if (warehouseWorker) sim.warehouse.incoming++; else own.incoming++;
    worker.path = best.path; worker.job = { phase: 'pickup', goals: best.goals, target: best.path.at(-1) ?? { x: worker.x, y: worker.y }, source: best.source.id, destination: own.id, stage };
    worker.status = warehouseWorker ? '포장대 완제품 수거하러 이동' : '이전 작업대 재료 수거';
  } else worker.status = warehouseWorker ? '창고에서 완제품 대기' : '재료 대기';
}
function arrive(sim, worker) {
  const job = worker.job;
  if (!job || worker.path.length || cellKey(worker) !== cellKey(job.target)) return;
  if (job.phase === 'toilet') { worker.breakLeft = 3; worker.job = null; worker.status = '화장실 이용 중'; return; }
  if (job.phase === 'home') { worker.job = null; worker.status = '작업 준비'; return; }
  if (job.phase === 'pickup') {
    const goals = job.destination === WAREHOUSE.id ? [WAREHOUSE.access] : sim.machines.find(machine => machine.id === job.destination).work;
    const path = pathTo(sim, worker, goals);
    if (path === null) { worker.status = '복귀 동선 막힘'; return; }
    if (job.source !== 'inbound') sim.machines.find(machine => machine.id === job.source).reserved--;
    else sim.supplied++;
    worker.carrying = true;
    worker.path = path; job.target = path.at(-1) ?? { x: worker.x, y: worker.y }; job.goals = goals; job.phase = 'delivery';
    worker.status = job.stage === 4 ? '완제품을 창고로 운반' : '담당 작업대로 운반';
  } else if (job.phase === 'delivery') {
    if (job.destination === WAREHOUSE.id) {
      if (worker.machineId !== WAREHOUSE.id) throw new Error('창고 담당자만 완제품을 보관할 수 있습니다.');
      sim.warehouse.stock++; sim.warehouse.incoming--; sim.shipped = sim.warehouse.stock; sim.firstShipment ??= sim.time;
    }
    else { const machine = sim.machines.find(m => m.id === job.destination); machine.input++; machine.incoming--; }
    worker.carrying = false; worker.job = null; worker.status = '작업 준비';
  }
}
export function stepSimulation(sim) {
  if (sim.complete) return sim;
  sim.tick++; sim.time = Math.min(STAGE.duration, Number((sim.tick * DT).toFixed(4)));
  for (const worker of sim.workers) {
    worker.from = { x: worker.x, y: worker.y };
    if (worker.breakLeft > 0) {
      worker.breakLeft = Math.max(0, Number((worker.breakLeft - DT).toFixed(4))); worker.metrics.break += DT;
      if (!worker.breakLeft) { worker.nextBreak = sim.time + 20; worker.status = '업무 복귀'; }
      continue;
    }
    if (!worker.job) assignJob(sim, worker);
    arrive(sim, worker);
  }
  const occupied = new Set(sim.workers.map(cellKey));
  for (let i = 0; i < sim.workers.length; i++) {
    const worker = sim.workers[(sim.tick + i) % sim.workers.length];
    if (worker.breakLeft > 0) continue;
    if (!worker.job) { worker.metrics.idle += DT; continue; }
    if (!worker.path.length) { arrive(sim, worker); continue; }
    let next = worker.path[0];
    if (occupied.has(cellKey(next))) {
      worker.wait++;
      if (worker.wait >= 2) {
        const alternative = pathTo(sim, worker, worker.job.goals, true);
        if (alternative?.length) { worker.path = alternative; worker.job.target = alternative.at(-1); next = alternative[0]; }
      }
      if (occupied.has(cellKey(next))) {
        worker.metrics.collision += DT; sim.heat[cellKey(worker)] = (sim.heat[cellKey(worker)] ?? 0) + DT;
        if (worker.wait >= 5) {
          const blocked = routeBlocked(sim, worker);
          const side = neighbors(worker).find(cell => !blocked.has(cellKey(cell)) && !occupied.has(cellKey(cell)));
          if (side) {
            occupied.delete(cellKey(worker)); Object.assign(worker, side); occupied.add(cellKey(worker));
            worker.path = pathTo(sim, worker, worker.job.goals) ?? [];
            worker.job.target = worker.path.at(-1) ?? { x: worker.x, y: worker.y }; worker.wait = 0;
          }
        }
        continue;
      }
    }
    occupied.delete(cellKey(worker)); Object.assign(worker, worker.path.shift()); occupied.add(cellKey(worker));
    worker.wait = 0; worker.metrics.moving += DT; arrive(sim, worker);
  }
  for (const machine of sim.machines) {
    const worker = sim.workers.find(w => w.machineId === machine.id);
    if (!worker || worker.job || worker.breakLeft > 0 || cellKey(worker) !== cellKey(machine.work[0])) { machine.metrics.unstaffed += DT; continue; }
    const seconds = EQUIPMENT[machine.type].seconds;
    if (machine.processing > 0) {
      machine.processing = Math.max(0, Number((machine.processing - DT).toFixed(4))); machine.metrics.busy += DT; worker.metrics.working += DT;
      machine.progress = 1 - machine.processing / seconds; worker.status = `${EQUIPMENT[machine.type].short} 작업 중`;
      if (!machine.processing) { machine.output++; machine.progress = 0; }
    } else if (machine.input > 0 && machine.output + machine.reserved < BUFFER) {
      machine.input--; machine.processing = seconds; machine.progress = 0; machine.metrics.busy += DT; worker.metrics.working += DT;
    } else if (machine.output + machine.reserved >= BUFFER) machine.metrics.blocked += DT;
    else machine.metrics.starved += DT;
  }
  sim.complete = sim.time >= STAGE.duration;
  return sim;
}
export function runSimulation(layout, assignments) { const sim = createSimulation(layout, assignments); while (!sim.complete) stepSimulation(sim); return sim; }
export function summarize(sim) { return { shipped: sim.shipped, firstShipment: sim.firstShipment, moving: sim.workers.reduce((n, w) => n + w.metrics.moving, 0), collision: sim.workers.reduce((n, w) => n + w.metrics.collision, 0), break: sim.workers.reduce((n, w) => n + w.metrics.break, 0) }; }
