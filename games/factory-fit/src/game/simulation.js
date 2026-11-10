import { STAGE, EQUIPMENT, DIRECTIONS, createAssignments } from './config.js';
import { footprint, blockedCells, findPath, cellKey, neighbors, validateLayout } from './layout.js';
export const DT = 0.2;
const BUFFER = 2;
export const recipeFor = (item, stage = STAGE) => ({ ...EQUIPMENT[item.type], ...stage.recipes?.[item.type] });
const warehouse = sim => sim.stage.fixtures.find(item => item.id === 'outbound');
const ownPlace = (sim, worker) => worker.machineId === 'outbound' ? { id: 'outbound', work: [warehouse(sim).access] } : sim.machines.find(m => m.id === worker.machineId);
export function createSimulation(layout, assignments = createAssignments(layout), stage = STAGE) {
  const machines = layout.filter(item => !EQUIPMENT[item.type].belt).map(item => ({ ...item, input: 0, incoming: 0, output: 0, reserved: 0, pendingOutput: false, processing: 0, progress: 0, cycleStartedAt: null, totalCycleSeconds: 0, completedCycles: 0, work: footprint(item).work }));
  const belts = layout.filter(item => EQUIPMENT[item.type].belt).map(item => ({ ...item, item: null, reserved: false, remaining: 0 }));
  const workers = stage.workers.map((worker, id) => {
    const machineId = assignments[worker.key], place = machineId === 'outbound' ? warehouse({ stage }).access : machines.find(m => m.id === machineId)?.work[0];
    const spawn = place ?? { x: -3 - id, y: -3 };
    return { ...worker, ...spawn, id, machineId, from: { ...spawn }, path: [], job: null, carrying: false, cargo: null, load: [], carriedWeight: 0, wait: 0, idleSeconds: 0, metrics: { moving: 0, collision: 0, working: 0, transfers: 0 }, status: place ? '자리 대기' : '미배치' };
  });
  return { stage, layout, assignments, machines, belts, workers, blocked: blockedCells(layout, stage), tick: 0, time: 0, supplied: 0, shipped: 0, productionRate: 0, averageProductionSeconds: null, measurementStart: 0, shipmentTimes: [], warehouse: { stock: 0, incoming: 0 }, firstShipment: null, complete: false, outcome: null, reason: '', heat: {} };
}
// Commit a layout edit without discarding the factory's production state.
// Workers return to their assigned slots; old pickup reservations are released.
export function reconfigureSimulation(sim, layout, assignments) {
  const next = createSimulation(layout, assignments, sim.stage);
  for (const key of ['tick', 'time', 'supplied', 'shipped', 'firstShipment', 'productionRate', 'averageProductionSeconds', 'continueAfterSuccess', 'complete', 'outcome']) next[key] = sim[key];
  next.warehouse.stock = sim.warehouse.stock;
  next.measurementStart = sim.measurementStart;
  next.shipmentTimes = [...sim.shipmentTimes];
  for (const machine of next.machines) {
    const old = sim.machines.find(m => m.id === machine.id && m.type === machine.type);
    if (!old) continue;
    for (const key of ['input', 'processing', 'progress', 'pendingOutput', 'cycleStartedAt', 'totalCycleSeconds', 'completedCycles']) machine[key] = old[key];
    machine.output = old.output + old.reserved;
  }
  for (const belt of next.belts) {
    const old = sim.belts.find(b => b.id === belt.id);
    if (old) { belt.item = old.item; belt.remaining = old.remaining; }
  }
  for (const worker of next.workers.filter(w => w.machineId)) {
    const old = sim.workers.find(w => w.machineId === worker.machineId);
    if (!old?.carrying) continue;
    worker.carrying = true; worker.cargo = old.cargo;
    worker.load = [...old.load]; worker.carriedWeight = old.carriedWeight;
    const target = { x: worker.x, y: worker.y };
    worker.job = { phase: 'delivery', destination: worker.machineId, target, goals: [target], cargo: old.cargo, stage: old.cargo.stage };
    if (worker.machineId === 'outbound') next.warehouse.incoming += worker.load.length;
    else next.machines.find(m => m.id === worker.machineId).incoming++;
  }
  return next;
}
function fail(sim, reason) { sim.complete = true; sim.outcome = 'failure'; sim.reason = reason; return sim; }
export function validateRun(layout, assignments, stage = STAGE) {
  // Only reject invalid physical placement/data; missing staff and blocked routes are observable gameplay.
  if (Object.values(assignments).some(id => id && id !== 'outbound' && !layout.some(m => m.id === id))) return { valid: false, errors: ['작업자 배정 데이터를 확인해 주세요.'] };
  return validateLayout(layout, { stage });
}
function routeBlocked(sim, worker, dynamic = false) {
  return new Set([...sim.blocked, ...sim.workers.filter(w => w.id !== worker.id && w.machineId).map(w => cellKey(ownPlace(sim, w).work[0])), ...(dynamic ? sim.workers.filter(w => w.id !== worker.id && w.machineId).map(cellKey) : [])]);
}
const pathTo = (sim, worker, goals, dynamic = false) => findPath(worker, goals, routeBlocked(sim, worker, dynamic), sim.stage);
function itemData(sim, product, visualStage) { return { product, stage: visualStage, weight: sim.stage.weights?.[product] ?? 1 }; }
function beltAt(sim, cell) { return sim.belts.find(b => cellKey(b) === cellKey(cell)); }
function beltNext(belt) { const direction = DIRECTIONS[belt.rotation]; return { x: belt.x + direction.x, y: belt.y + direction.y }; }
function connectedBelt(sim, machine) { return beltAt(sim, footprint(machine).outlet); }
function updateBelts(sim) {
  // Snapshot the movable items, so a product can move at most one belt cell per tick.
  const ready = sim.belts.filter(b => b.item && !b.reserved && b.remaining <= DT);
  sim.belts.forEach(b => { b.remaining = Math.max(0, b.remaining - DT); });
  for (const belt of ready) {
    const next = beltNext(belt), target = beltAt(sim, next);
    if (target && !target.item) { target.item = belt.item; target.remaining = .6; belt.item = null; }
    else if (!target) {
      const machine = sim.machines.find(m => recipeFor(m, sim.stage).input === belt.item.product && footprint(m).body.some(c => cellKey(c) === cellKey(next)));
      if (machine && machine.input + machine.incoming < BUFFER) { machine.input++; belt.item = null; }
    }
  }
  for (const machine of sim.machines) {
    const belt = connectedBelt(sim, machine), recipe = recipeFor(machine, sim.stage);
    if (belt && !belt.item && machine.output > 0) { machine.output--; belt.item = itemData(sim, recipe.output, recipe.outputStage); belt.remaining = .6; }
  }
}
function sourceGoals(sim, worker, source) {
  if (source.kind === 'inbound') return [sim.stage.fixtures.find(f => f.id === 'inbound').access];
  const blocked = routeBlocked(sim, worker), shape = source.kind === 'belt' ? null : footprint(source.object);
  const cells = source.kind === 'belt' ? [source.object] : shape.output ? [shape.output] : shape.body;
  return [...new Map(cells.flatMap(c => neighbors(c, sim.stage)).filter(c => !blocked.has(cellKey(c))).map(c => [cellKey(c), c])).values()];
}
function assignJob(sim, worker, collecting = false) {
  worker.waitingForSource = null;
  const own = ownPlace(sim, worker); if (!own) return;
  if (!collecting && cellKey(worker) !== cellKey(own.work[0])) {
    const path = pathTo(sim, worker, own.work); if (path) { worker.path = path; worker.job = { phase: 'home', goals: own.work, target: own.work[0] }; } return;
  }
  const storing = own.id === 'outbound', recipe = storing ? null : recipeFor(own, sim.stage);
  if (!storing && (own.pendingOutput || own.processing > 0 || own.input > 0 || own.input + own.incoming >= BUFFER)) return;
  const wanted = storing ? sim.stage.product : recipe.input, sources = [];
  if (wanted === sim.stage.input && sim.supplied + sim.workers.filter(w => w.job?.sourceKind === 'inbound' && w.job.phase === 'pickup').length < (sim.stage.batch ?? Infinity)) sources.push({ id: 'inbound', kind: 'inbound', cargo: itemData(sim, wanted, 0) });
  for (const machine of sim.machines) {
    const sourceRecipe = recipeFor(machine, sim.stage);
    if (sourceRecipe.output === wanted && machine.id !== own.id && (!storing || machine.output > 0) && !connectedBelt(sim, machine)) sources.push({ id: machine.id, kind: 'machine', object: machine, cargo: itemData(sim, wanted, sourceRecipe.outputStage) });
  }
  for (const belt of sim.belts) if (belt.item?.product === wanted && !belt.reserved && !beltAt(sim, beltNext(belt)) && !sim.machines.some(m => footprint(m).body.some(c => cellKey(c) === cellKey(beltNext(belt))))) sources.push({ id: belt.id, kind: 'belt', object: belt, cargo: belt.item });
  let best;
  for (const source of sources) {
    const capacity = storing ? (sim.stage.warehouseCarryKg ?? 20) - worker.carriedWeight : worker.strength;
    if (source.cargo.weight > capacity) { if (!collecting) worker.status = storing ? '운반 가능한 무게를 초과했어요' : '힘센 직원이 필요해요'; continue; }
    const goals = sourceGoals(sim, worker, source), path = pathTo(sim, worker, goals);
    if (path !== null && (!best || path.length < best.path.length)) best = { source, goals, path };
  }
  if (!best) return;
  const { source, goals, path } = best;
  // Choose the closest reachable supplier first, independently of its stock.
  if (source.kind === 'machine' && source.object.output === 0) {
    worker.waitingForSource = source.id;
    worker.status = '가까운 작업대의 재료를 기다리는 중';
    return;
  }
  if (source.kind === 'machine') { source.object.output--; source.object.reserved++; }
  if (source.kind === 'belt') source.object.reserved = true;
  if (storing) sim.warehouse.incoming++; else own.incoming++;
  worker.path = path; worker.job = { phase: 'pickup', target: path.at(-1) ?? { x: worker.x, y: worker.y }, goals, source: source.id, sourceKind: source.kind, destination: own.id, cargo: source.cargo, stage: source.cargo.stage }; worker.status = '재료를 가지러 가는 중';
}
function arrive(sim, worker) {
  const job = worker.job; if (!job || worker.path.length || cellKey(worker) !== cellKey(job.target)) return;
  if (job.phase === 'home') { worker.job = null; return; }
  if (job.phase === 'pickup') {
    const own = ownPlace(sim, worker), path = pathTo(sim, worker, own.work); if (path === null) return;
    if (job.sourceKind === 'machine') sim.machines.find(m => m.id === job.source).reserved--;
    else if (job.sourceKind === 'belt') { const belt = sim.belts.find(b => b.id === job.source); belt.item = null; belt.reserved = false; }
    else sim.supplied++;
    worker.metrics.transfers++;
    worker.carrying = true; worker.cargo = job.cargo; worker.path = path; job.phase = 'delivery'; job.goals = own.work; job.target = own.work[0]; worker.status = '물건을 운반하는 중';
    if (own.id === 'outbound') {
      worker.load.push(job.cargo); worker.carriedWeight += job.cargo.weight;
      // Collect available goods from other tables before returning, within the weight budget.
      assignJob(sim, worker, true);
    }
  } else {
    if (job.destination === 'outbound') {
      const count = worker.load.length; sim.warehouse.stock += count;
      const sampleCount = sim.stage.sampleCount ?? 5;
      for (let i = 0; i < count; i++) {
        sim.shipmentTimes.push(sim.time);
        if (sim.shipmentTimes.length > sampleCount) sim.measurementStart = sim.shipmentTimes.shift();
      }
      if (count > 0) {
        sim.averageProductionSeconds = (sim.time - sim.measurementStart) / sim.shipmentTimes.length;
        sim.productionRate = 60 / sim.averageProductionSeconds;
      }
      sim.warehouse.incoming -= count; sim.shipped = sim.warehouse.stock; sim.firstShipment ??= sim.time;
      worker.load = []; worker.carriedWeight = 0;
    }
    else { const machine = ownPlace(sim, worker); machine.input++; machine.incoming--; }
    worker.metrics.transfers++;
    worker.carrying = false; worker.cargo = null; worker.job = null; worker.status = '작업 준비';
  }
}
function activityState(sim, worker) {
  const machine = sim.machines.find(m => m.id === worker.machineId);
  return [worker.x, worker.y, worker.metrics.working, worker.metrics.transfers, worker.carrying, worker.load.length,
    machine?.processing, machine?.input, machine?.pendingOutput].join('|');
}
export function stepSimulation(sim) {
  if (sim.complete && !(sim.continueAfterSuccess && sim.outcome === 'success')) return sim;
  if (!sim.tick) { const check = validateRun(sim.layout, sim.assignments, sim.stage); if (!check.valid) return fail(sim, check.errors[0]); }
  const previousActivity = sim.workers.map(worker => activityState(sim, worker));
  sim.tick++; sim.time = Number((sim.tick * DT).toFixed(4)); updateBelts(sim);
  for (const worker of sim.workers) { worker.from = { x: worker.x, y: worker.y }; if (!worker.job) assignJob(sim, worker); arrive(sim, worker); }
  const occupied = new Set(sim.workers.filter(w => w.machineId).map(cellKey));
  for (let i = 0; i < sim.workers.length; i++) {
    const worker = sim.workers[(sim.tick + i) % sim.workers.length]; if (!worker.job) continue;
    if (!worker.path.length) { arrive(sim, worker); continue; }
    let next = worker.path[0];
    if (occupied.has(cellKey(next))) {
      worker.wait++; worker.metrics.collision += DT; sim.heat[cellKey(worker)] = (sim.heat[cellKey(worker)] ?? 0) + DT;
      if (worker.wait >= 2) {
        const path = pathTo(sim, worker, worker.job.goals, true);
        if (path !== null) {
          worker.path = path; worker.job.target = path.at(-1) ?? { x: worker.x, y: worker.y };
          if (!path.length) { arrive(sim, worker); continue; }
          next = path[0];
        }
      }
      if (occupied.has(cellKey(next))) {
        if (worker.wait >= 5) { const blocked = routeBlocked(sim, worker), side = neighbors(worker, sim.stage).find(c => !blocked.has(cellKey(c)) && !occupied.has(cellKey(c)));
          if (side) {
            occupied.delete(cellKey(worker)); Object.assign(worker, side); occupied.add(cellKey(worker));
            const path = pathTo(sim, worker, worker.job.goals); worker.path = path ?? [];
            if (path !== null) worker.job.target = path.at(-1) ?? { x: worker.x, y: worker.y };
            worker.wait = 0;
          }
        } continue;
      }
    }
    occupied.delete(cellKey(worker)); Object.assign(worker, worker.path.shift()); occupied.add(cellKey(worker)); worker.wait = 0; worker.metrics.moving += DT; arrive(sim, worker);
  }
  for (const machine of sim.machines) {
    const worker = sim.workers.find(w => w.machineId === machine.id), recipe = recipeFor(machine, sim.stage);
    if (!worker || worker.job || cellKey(worker) !== cellKey(machine.work[0])) continue;
    if (machine.processing > 0) {
      machine.processing = Math.max(0, Number((machine.processing - DT).toFixed(4))); machine.progress = 1 - machine.processing / recipe.seconds; worker.metrics.working += DT; worker.status = '작업 중';
      if (!machine.processing) machine.pendingOutput = true;
    } else if (!machine.pendingOutput && machine.input > 0) { machine.input--; machine.processing = recipe.seconds; machine.cycleStartedAt = sim.time; worker.status = '작업 시작'; }
    // A reserved item still occupies the tray until its collector physically picks it up.
    if (machine.pendingOutput) {
      if (machine.output + machine.reserved === 0) {
        machine.output = 1; machine.pendingOutput = false; machine.progress = 0;
        if (machine.cycleStartedAt != null) { machine.totalCycleSeconds += sim.time - machine.cycleStartedAt; machine.completedCycles++; machine.cycleStartedAt = null; } worker.status = '출력칸에 올려놓음';
      } else worker.status = '출력칸이 비기를 기다리는 중';
    }
  }
  for (const worker of sim.workers) {
    const own = sim.machines.find(machine => machine.id === worker.machineId);
    const processingHere = own?.processing > 0 && !worker.job && cellKey(worker) === cellKey(own.work[0]);
    worker.idleSeconds = !worker.machineId || processingHere || activityState(sim, worker) !== previousActivity[worker.id]
      ? 0 : Number((worker.idleSeconds + DT).toFixed(4));
  }
  if (sim.stage.targetPerMinute != null && sim.shipmentTimes.length === (sim.stage.sampleCount ?? 5)) {
    if (sim.productionRate < sim.stage.targetPerMinute) return sim;
    sim.complete = true; sim.outcome = 'success'; return sim;
  }
  if (sim.stage.targetPerMinute == null && sim.shipped >= sim.stage.goal) { sim.complete = true; sim.outcome = 'success'; return sim; }
  return sim;
}
// Offline QA helper only: reaching the step budget returns an unfinished simulation, never a gameplay failure.
export function runSimulation(layout, assignments, stage = STAGE, maxTicks = 3000) {
  const sim = createSimulation(layout, assignments, stage); for (let i = 0; i < maxTicks && !sim.complete; i++) stepSimulation(sim); return sim;
}
export function summarize(sim) { return { shipped: sim.shipped, firstShipment: sim.firstShipment, outcome: sim.outcome, moving: sim.workers.reduce((n, w) => n + w.metrics.moving, 0), collision: sim.workers.reduce((n, w) => n + w.metrics.collision, 0) }; }
