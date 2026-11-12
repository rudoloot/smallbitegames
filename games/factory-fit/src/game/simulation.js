import {dispatch,deliver,processBatch} from './forward-production.js';
import {parkedInlet,isInlet,isOutbound,dockSlots,dockSides} from './docks.js';
import { STAGE, EQUIPMENT, DIRECTIONS, createAssignments } from './config.js';
import { inboundPickupCells, outsideFactory, footprint, blockedCells, findPath, cellKey, neighbors, validateLayout } from './layout.js';
import {DT,motionFrame} from './motion.js';
export {DT};
const BUFFER = 2;
import { shapeFor } from './equipment-shapes.js';
export const recipeFor = (item, stage = STAGE) => ({ ...EQUIPMENT[item.type], ...shapeFor(item), ...stage.recipes?.[item.type], ...stage.stepRecipes?.[item.id?.split('-')[0]] });
// A spare of a machine has the same recipe as its original. Count destinations
// by equipment type so duplicate copies on the floor share one visual cue.
export function outputDestinations(item,stage) {
  const {output}=recipeFor(item,stage);
  if(!output)return [];
  if(output===stage.product)return ['outbound'];
  const types=new Set();
  for(const candidate of stage.inventory){
    const recipe=recipeFor(candidate,stage);
    if(recipe.needs ? recipe.needs[output]>0 : recipe.input===output) types.add(candidate.type);
  }
  return [...types];
}

// Keep one band per supplied material so mixed pallets match the cargo above them.
export function inletColors(dock, stage) {
  const supplies = dock.supplies ?? [stage.input];
  const fallback = dock.color ?? '#b98950';
  if (!supplies.length) return [fallback];
  return supplies.map(supply => {
    const receiver = stage.inventory.find(item => {
      const recipe = recipeFor(item, stage);
      return recipe.needs ? recipe.needs[supply] > 0 : recipe.input === supply;
    });
    return EQUIPMENT[receiver?.type]?.color ?? fallback;
  });
}

export function inletCellColor(dock, cell, colors) {
  const column = cell.x - dock.x;
  const row = cell.y - dock.y;
  return colors[(row * dock.width + column) % colors.length];
}

export function outputColor(item,stage) {
  if (!stage.inventory.some(given=>given.id===item.id || given.id===item.id?.split('-')[0])) return '#65757c';
  const [destination]=outputDestinations(item,stage);
  return destination==='outbound' ? stage.fixtures.find(f=>f.id==='outbound').color : EQUIPMENT[destination]?.color??'#65757c';
}
const warehouse = sim => sim.stage.fixtures.find(item => item.id === 'outbound');
const ownPlace = (sim, worker) => (isOutbound(worker.machineId) || isInlet(worker.machineId)) ? { id: 'outbound', work: [worker.home] } : sim.machines.find(m => m.id === worker.machineId);
export function createSimulation(layout, assignments = createAssignments(layout), stage = STAGE) {
  // Keep stored docks in the editable layout, but disable their material supply.
  if (stage.fixtures.some(dock => parkedInlet(dock,stage))) {
    stage = {...stage, fixtures:stage.fixtures.filter(dock => !parkedInlet(dock,stage))};
  }
  if(stage.paired) assignments=createAssignments(layout,stage,assignments);
  const machines = layout.filter(item => !EQUIPMENT[item.type].belt).map(item => ({ ...item, parked: outsideFactory(item, stage), stock:{}, input: 0, incoming: 0, output: 0, reserved: 0, pendingOutput: false, processing: 0, progress: 0, cycleStartedAt: null, totalCycleSeconds: 0, completedCycles: 0, work: footprint(item).work }));
  const belts = layout.filter(item => EQUIPMENT[item.type].belt).map(item => ({ ...item, parked: outsideFactory(item, stage), item: null, reserved: false, remaining: 0 }));
  const slots = dockSlots(stage);
  const workers = stage.workers.map((worker, id) => {
    const machineId = assignments[worker.key], place = (isOutbound(machineId)||isInlet(machineId)) ? slots.find(s=>s.id===machineId)?.cell : machines.find(m => m.id === machineId)?.work[0];
    const spawn = place ?? { x: -3 - id, y: -3 };
    return { ...worker, transfers: [], ...spawn, home: spawn, id, machineId, from: { ...spawn }, path: [], job: null, carrying: false, cargo: null, load: [], carriedWeight: 0, wait: 0, idleSeconds: 0, metrics: { moving: 0, collision: 0, working: 0, transfers: 0 }, status: place ? '자리 대기' : '미배치' };
  });
  const staffed = new Set(Object.values(assignments));
  const parallel = machines.filter(m => !m.parked && staffed.has(m.id) && recipeFor(m, stage).output === stage.product).length > 1;
  const rateWindow = parallel ? { startTime: 0, startStock: 0, minutes: [] } : null;
  return { stage, layout, assignments, machines, belts, workers, rateWindow, blocked: blockedCells(layout, stage), tick: 0, time: 0, productionTime: 0, supplied: 0, shipped: 0, productionRate: 0, averageProductionSeconds: null, measurementStart: 0, shipmentTimes: [], minuteShipmentTicks: [], warehouse: { stock: 0, incoming: 0 }, firstShipment: null, complete: false, outcome: null, reason: '', heat: {} };
}
// Commit a layout edit without discarding the factory's production state.
// Reconcile in-flight work against the edited floor before the next tick.
export function reconfigureSimulation(sim, layout, assignments, stage = sim.stage) {
  const next = createSimulation(layout, assignments, stage);
  for (const key of ['tick', 'time', 'productionTime', 'supplied', 'shipped', 'firstShipment', 'productionRate', 'averageProductionSeconds', 'continueAfterSuccess', 'complete', 'outcome']) next[key] = sim[key];
  if (next.rateWindow && sim.rateWindow) next.rateWindow = structuredClone(sim.rateWindow);
  else if (next.rateWindow || sim.rateWindow) {
    next.productionRate = 0;
    next.averageProductionSeconds = null;
    if (next.rateWindow) Object.assign(next.rateWindow, { startTime: sim.productionTime, startStock: sim.shipped });
  }
  if(sim.motion) next.motion={...sim.motion,tick:-1,motions:[...sim.motion.motions]};
  next.heat = {...sim.heat};
  next.warehouse.stock = sim.warehouse.stock;
  next.measurementStart = sim.measurementStart;
  next.shipmentTimes = [...sim.shipmentTimes];
  next.minuteShipmentTicks = [...sim.minuteShipmentTicks];
  for (const machine of next.machines) {
    const old = sim.machines.find(m => m.id === machine.id && m.type === machine.type);
    if (!old) continue;
    for (const key of ['input', 'processing', 'progress', 'pendingOutput', 'cycleStartedAt', 'totalCycleSeconds', 'completedCycles']) machine[key] = old[key];
    machine.stock={...old.stock};
    if(old.lastSupply)machine.lastSupply={...old.lastSupply};
    machine.output = old.output + old.reserved;
  }
  for (const belt of next.belts) {
    const old = sim.belts.find(b => b.id === belt.id);
    if (old) { belt.item = old.item; belt.remaining = old.remaining; }
  }
  // All homes are already known, so new assignments can invalidate a route
  // without making an unrelated worker start again at their own machine.
  for (const worker of next.workers) {
    if (!worker.machineId) continue;
    const old = sim.workers.find(w => w.machineId === worker.machineId);
    if (!old) { if(next.motion) next.motion.motions[worker.id]=null; continue; }
    const own = ownPlace(next,worker);
    const blocked = routeBlocked(next,worker);
    const sameWorker = old.key === worker.key;
    if (sameWorker && !own.parked && !ownPlace(sim,old)?.parked) {
      const home = worker.home;
      Object.assign(worker, structuredClone(old), {home});
      const movedHome=stage.paired && cellKey(home)!==cellKey(old.home);
      if (movedHome || blocked.has(cellKey(worker))) {
        if(next.motion) next.motion.motions[worker.id]=null;
        worker.transfers=[];
        worker.wait=0;
        worker.waitingForSource=null;
        Object.assign(worker, home, {from:{...home},path:[]});
      } else if (blocked.has(cellKey(worker.from))) {
        worker.from = {x:worker.x,y:worker.y};
      }
    } else if (old.carrying) {
      worker.carrying = true;
      worker.cargo = old.cargo;
      if(old.job?.phase==='shipment') worker.job=structuredClone(old.job);
      worker.load = [...old.load];
      worker.carriedWeight = old.carriedWeight;
    }

    if(stage.paired && isOutbound(worker.machineId)) continue;
    if(stage.forward){
      if(worker.job && (worker.job.phase==='home' || worker.job.destination==='outbound' || next.machines.some(m=>m.id===worker.job.destination && !m.parked))){
        const dest=next.machines.find(m=>m.id===worker.job.destination);
        const goals=dest?neighbors(footprint(dest).output,stage):worker.job.phase==='home'?[worker.home]:worker.job.goals;
        if(restoreRoute(next,worker,goals,blocked))continue;
      }
      worker.path=[];worker.job=null;continue;
    }
    const job = worker.job;
    if(job?.phase==='shipment'){
      restoreRoute(next,worker,shippingGoals(next),blocked);
      continue;
    }
    if (job?.phase === 'pickup') {
      const object = job.sourceKind === 'machine' ? next.machines.find(m=>m.id===job.source)
        : job.sourceKind === 'belt' ? next.belts.find(b=>b.id===job.source) : null;
      const available = job.sourceKind === 'inbound' || (object && !object.parked &&
        (job.sourceKind === 'machine' ? object.output>0 : object.item && !object.reserved));
      const goals = available ? sourceGoals(next,worker,{kind:job.sourceKind,id:job.source,object}) : [];
      if (restoreRoute(next,worker,goals,blocked)) {
        if (job.sourceKind === 'machine') { object.output--; object.reserved++; }
        if (job.sourceKind === 'belt') object.reserved = true;
        if (isOutbound(worker.machineId)) next.warehouse.incoming++;
        else own.incoming++;
      } else {
        worker.job = null;
        worker.path = [];
      }
    }

    if (worker.carrying) {
      if (isOutbound(worker.machineId)) next.warehouse.incoming += worker.load.length;
      else own.incoming++;
      if (!worker.job) {
        worker.job = {phase:'delivery',destination:own.id,goals:own.work,target:own.work[0],
          cargo:worker.cargo,stage:worker.cargo.stage};
        worker.status = '물건을 운반하는 중';
      }
    }
    if (worker.job && worker.job.phase !== 'pickup') {
      restoreRoute(next,worker,own.work,blocked);
    }
  }
  return next;
}
function restoreRoute(sim,worker,goals,blocked) {
  const job = worker.job;
  job.goals = goals;
  const targetValid = goals.some(cell=>cellKey(cell)===cellKey(job.target));
  const end = worker.path.at(-1) ?? worker;
  if (targetValid && cellKey(end)===cellKey(job.target) &&
      !worker.path.some(cell=>blocked.has(cellKey(cell)))) return true;
  const path = findPath(worker,goals,blocked,sim.stage);
  worker.path = path ?? [];
  // When a delivery is cut off, retain its cargo until an edit reopens a path.
  if (goals.length) job.target = path?.at(-1) ?? (path ? {x:worker.x,y:worker.y} : goals[0]);
  return path !== null;
}
function fail(sim, reason) { sim.complete = true; sim.outcome = 'failure'; sim.reason = reason; return sim; }
export function validateRun(layout, assignments, stage = STAGE) {
  // Only reject invalid physical placement/data; missing staff and blocked routes are observable gameplay.
  if (Object.values(assignments).some(id => id && !dockSlots(stage).some(s=>s.id===id) && !layout.some(m => m.id === id))) return { valid: false, errors: ['작업자 배정 데이터를 확인해 주세요.'] };
  return validateLayout(layout, { stage, allowOutside: true });
}
function routeBlocked(sim, worker, dynamic = false) {
  return new Set([...sim.blocked, ...sim.workers.filter(w => w.id !== worker.id && w.machineId).map(w => cellKey(ownPlace(sim, w).work[0])), ...(dynamic ? sim.workers.filter(w => w.id !== worker.id && w.machineId).map(cellKey) : [])]);
}
const pathTo = (sim, worker, goals, dynamic = false) => findPath(worker, goals, routeBlocked(sim, worker, dynamic), sim.stage);
function itemData(sim, product, visualStage) { return { product, stage: visualStage, weight: sim.stage.weights?.[product] ?? 1 }; }
function beltAt(sim, cell) { return sim.belts.find(b => !b.parked && cellKey(b) === cellKey(cell)); }
function beltNext(belt) { const direction = DIRECTIONS[belt.rotation]; return { x: belt.x + direction.x, y: belt.y + direction.y }; }
function connectedBelt(sim, machine) { return beltAt(sim, footprint(machine).outlet); }
function updateBelts(sim) {
  // Snapshot the movable items, so a product can move at most one belt cell per tick.
  const ready = sim.belts.filter(b => !b.parked && b.item && !b.reserved && b.remaining <= DT);
  sim.belts.forEach(b => { b.remaining = Math.max(0, b.remaining - DT); });
  for (const belt of ready) {
    const next = beltNext(belt), target = beltAt(sim, next);
    if (target && !target.item) { target.item = belt.item; target.remaining = .6; belt.item = null; }
    else if (!target) {
      const machine = sim.machines.find(m => !m.parked && recipeFor(m, sim.stage).input === belt.item.product && footprint(m).body.some(c => cellKey(c) === cellKey(next)));
      if (machine && machine.input + machine.incoming < BUFFER) { machine.input++; machine.stock[belt.item.product]=(machine.stock[belt.item.product]??0)+1; belt.item = null; }
    }
  }
  for (const machine of sim.machines) {
    if (machine.parked) continue;
    const belt = connectedBelt(sim, machine), recipe = recipeFor(machine, sim.stage);
    if (belt && !belt.item && machine.output > 0) { machine.output--; belt.item = itemData(sim, recipe.output, recipe.outputStage); belt.remaining = .6; }
  }
}
function sourceGoals(sim, worker, source) {
  if (source.kind === 'inbound' && sim.stage.paired) {
    const dock=sim.stage.fixtures.find(f=>f.id===source.id);
    return dock ? dockSides(dock).flat() : [];
  }
  if (source.kind === 'inbound') return inboundPickupCells(sim.stage, sim.blocked);
  const blocked = routeBlocked(sim, worker), shape = source.kind === 'belt' ? null : footprint(source.object);
  const cells = source.kind === 'belt' ? [source.object] : shape.output ? [shape.output] : shape.body;
  return [...new Map(cells.flatMap(c => neighbors(c, sim.stage)).filter(c => !blocked.has(cellKey(c))).map(c => [cellKey(c), c])).values()];
}
function assignJob(sim, worker, collecting = false) {
  if(sim.stage.forward)return dispatch(sim,worker,pathTo);
  worker.waitingForSource = null;
  const own = ownPlace(sim, worker); if (!own) return;
  if (!collecting && cellKey(worker) !== cellKey(own.work[0])) {
    const path = pathTo(sim, worker, own.work); if (path) { worker.path = path; worker.job = { phase: 'home', goals: own.work, target: own.work[0] }; } return;
  }
  const storing = own.id === 'outbound', recipe = storing ? null : recipeFor(own, sim.stage);
  if(sim.stage.paired && storing){
    if(worker.cargo){
      if(worker.receivedTick<sim.tick){
        worker.transfers.push({x:worker.x,y:worker.y,from:'hand',to:'outbound',id:'outbound',stage:worker.cargo.stage});
        sim.warehouse.stock++;recordShipment(sim,1);
        worker.cargo=null;worker.carrying=false;worker.metrics.transfers++;
      }
      return;
    }
    const adjacent=sim.machines.filter(m=>!m.parked && m.output>0 &&
      recipeFor(m,sim.stage).output===sim.stage.product && trayAtReceiver(m,worker.home));
    const last=adjacent.findIndex(m=>m.id===worker.lastPickup);
    const source=adjacent.length ? adjacent[(last+1)%adjacent.length] : null;
    if(source){
      const recipe=recipeFor(source,sim.stage);
      source.output--;
      worker.lastPickup=source.id;
      worker.cargo=itemData(sim,recipe.output,recipe.outputStage);
      worker.carrying=true;worker.receivedTick=sim.tick;worker.metrics.transfers++;
      worker.transfers.push({x:worker.x,y:worker.y,from:'output',to:'hand',id:source.id,stage:recipe.outputStage});
    }
    return;
  }
  if(sim.stage.paired && recipe.output===sim.stage.product && own.output && !trayAtReceiver(own,warehouse(sim).access)){
    const goals=shippingGoals(sim),path=pathTo(sim,worker,goals);
    if(path===null)return;
    own.output--;
    worker.carrying=true;
    worker.cargo=itemData(sim,recipe.output,recipe.outputStage);
    worker.transfers.push({x:worker.x,y:worker.y,from:'output',to:'hand',id:own.id,stage:recipe.outputStage});
    worker.path=path;
    worker.job={phase:'shipment',goals,target:path.at(-1)??{x:worker.x,y:worker.y}};
    worker.status='완제품을 출고 담당자에게 전달하는 중';
    return;
  }
  if (!storing && (own.pendingOutput || own.processing > 0 || (!sim.stage.paired && (own.input > 0 || own.input + own.incoming >= BUFFER)))) return;
  const wanted = storing ? sim.stage.product : recipe.input, sources = [];
  const needs=recipe?.needs ?? {[wanted]:1};
  const accepts=product=>sim.stage.paired && !storing ? (needs[product]??0)>(own.stock[product]??0) : product===wanted;
  if(sim.stage.paired){
    for(const dock of sim.stage.fixtures.filter(f=>isInlet(f.id))){
      for(const product of dock.supplies??[sim.stage.input]){
        if(accepts(product)) sources.push({id:dock.id,kind:'inbound',cargo:itemData(sim,product,Math.max(0,sim.stage.goods?.indexOf(product)??0))});
      }
    }
  } else if (wanted === sim.stage.input && sim.supplied + sim.workers.filter(w => w.job?.sourceKind === 'inbound' && w.job.phase === 'pickup').length < (sim.stage.batch ?? Infinity)) sources.push({ id: 'inbound', kind: 'inbound', cargo: itemData(sim, wanted, 0) });
  for (const machine of sim.machines) {
    if (machine.parked) continue;
    const sourceRecipe = recipeFor(machine, sim.stage);
    if (accepts(sourceRecipe.output) && machine.id !== own.id && ((!storing && !sim.stage.paired) || machine.output > 0) && !connectedBelt(sim, machine)) sources.push({ id: machine.id, kind: 'machine', object: machine, cargo: itemData(sim, sourceRecipe.output, sourceRecipe.outputStage) });
  }
  for (const belt of sim.belts) if (!belt.parked && belt.item && accepts(belt.item.product) && !belt.reserved && !beltAt(sim, beltNext(belt)) && !sim.machines.some(m => footprint(m).body.some(c => cellKey(c) === cellKey(beltNext(belt))))) sources.push({ id: belt.id, kind: 'belt', object: belt, cargo: belt.item });
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
function recordShipment(sim,count) {
  const sampleCount = sim.stage.sampleCount ?? 5;
  for (let i = 0; i < count; i++) {
    sim.shipmentTimes.push(sim.productionTime);
    if (sim.stage.minuteGoal) sim.minuteShipmentTicks.push(sim.tick);
    if (sim.shipmentTimes.length > sampleCount) sim.measurementStart = sim.shipmentTimes.shift();
  }
  if (count > 0 && !sim.rateWindow) {
    sim.averageProductionSeconds = (sim.productionTime - sim.measurementStart) / sim.shipmentTimes.length;
    sim.productionRate = 60 / sim.averageProductionSeconds;
  }
  sim.shipped = sim.warehouse.stock; sim.firstShipment ??= sim.productionTime;
}

function trayAtReceiver(machine,home) {
  const tray=footprint(machine).output;
  return tray && Math.abs(tray.x-home.x)+Math.abs(tray.y-home.y)===1;
}
function shippingGoals(sim) {
  return neighbors(warehouse(sim).access,sim.stage);
}
function arrive(sim, worker) {
  const job = worker.job; if (!job || worker.path.length || cellKey(worker) !== cellKey(job.target)) return;
  if (job.phase === 'home') { worker.job = null; return; }
  if(job.phase==='shipment'){
    const receiver=sim.workers.find(w=>w.machineId==='outbound');
    if(receiver.carrying || receiver.transfers.length)return;
    worker.transfers.push({x:worker.x,y:worker.y,from:'hand',to:'receiver',id:'outbound',stage:worker.cargo.stage});
    receiver.receivedTick=sim.tick;receiver.carrying=true;receiver.cargo=worker.cargo;
    worker.metrics.transfers++;worker.carrying=false;worker.cargo=null;worker.job=null;
    return;
  }
  if(sim.stage.forward)return deliver(sim,worker);
  if (job.phase === 'pickup') {
    const own = ownPlace(sim, worker), path = pathTo(sim, worker, own.work); if (path === null) return;
    if (job.sourceKind === 'machine') sim.machines.find(m => m.id === job.source).reserved--;
    else if (job.sourceKind === 'belt') { const belt = sim.belts.find(b => b.id === job.source); belt.item = null; belt.reserved = false; }
    else sim.supplied++;
    worker.transfers.push({x:worker.x,y:worker.y,from:job.sourceKind==='machine'?'output':job.sourceKind,to:'hand',id:job.source,
      stage:job.cargo.stage,stack:worker.load.length});
    worker.metrics.transfers++;
    worker.carrying = true; worker.cargo = job.cargo; worker.path = path; job.phase = 'delivery'; job.goals = own.work; job.target = own.work[0]; worker.status = '물건을 운반하는 중';
    if (own.id === 'outbound') {
      worker.load.push(job.cargo); worker.carriedWeight += job.cargo.weight;
      // Collect available goods from other tables before returning, within the weight budget.
      assignJob(sim, worker, true);
    }
  } else {
    worker.transfers.push({x:worker.x,y:worker.y,from:'hand',to:job.destination==='outbound'?'outbound':'process',id:job.destination,
      stage:worker.cargo.stage,count:Math.max(1,worker.load.length)});
    if (job.destination === 'outbound') {
      const count = worker.load.length; sim.warehouse.stock += count;
      recordShipment(sim,count);
      sim.warehouse.incoming -= count;
      worker.load = []; worker.carriedWeight = 0;
    }
    else { const machine = ownPlace(sim, worker); machine.input++; machine.incoming--; machine.stock[job.cargo.product]=(machine.stock[job.cargo.product]??0)+1; }
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
  const priorStock=sim.shipped;
  const previousActivity = sim.workers.map(worker => activityState(sim, worker));
  sim.productionTime=sim.stage.playbackGoals ? sim.productionTime+motionFrame(sim).duration : Number(((sim.tick+1)*DT).toFixed(4));
  for (const worker of sim.workers) worker.transfers.length = 0;
  sim.tick++; sim.time = Number((sim.tick * DT).toFixed(4)); if(!sim.stage.forward) updateBelts(sim);
  for (const worker of sim.workers) { worker.from = { x: worker.x, y: worker.y }; if (ownPlace(sim, worker)?.parked) { worker.status = '공장 밖 대기'; continue; } if (!worker.job) assignJob(sim, worker); arrive(sim, worker); }
  const occupied = new Set(sim.workers.filter(w => w.machineId).map(cellKey));
  for (let i = 0; i < sim.workers.length; i++) {
    const worker = sim.workers[(sim.tick + i) % sim.workers.length]; if (!worker.job || ownPlace(sim, worker)?.parked) continue;
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
    if (machine.parked || !worker || worker.job || cellKey(worker) !== cellKey(machine.work[0])) continue;
    if(sim.stage.forward){processBatch(sim,machine,worker,recipe);continue;}
    if (machine.processing > 0) {
      machine.processing = Math.max(0, Number((machine.processing - DT).toFixed(4))); machine.progress = 1 - machine.processing / recipe.seconds; worker.metrics.working += DT; worker.status = '작업 중';
      if (!machine.processing) {
        machine.pendingOutput = true;
        worker.transfers.push({x:worker.x,y:worker.y,from:'process',to:'hand',id:machine.id,stage:recipe.outputStage ?? 4});
      }
    } else if (!machine.pendingOutput && machine.input > 0) {
      const needs=recipe.needs??{[recipe.input]:1};
      if(sim.stage.paired){
        if(!Object.entries(needs).every(([product,count])=>(machine.stock[product]??0)>=count)) continue;
        for(const [product,count] of Object.entries(needs)){machine.stock[product]-=count;machine.input-=count;}
      } else machine.input--; machine.processing = recipe.seconds; machine.cycleStartedAt = sim.time; worker.status = '작업 시작'; }
    // A reserved item still occupies the tray until its collector physically picks it up.
    if (machine.pendingOutput) {
      if (machine.output + machine.reserved === 0) {
        worker.transfers.push({x:worker.x,y:worker.y,from:'hand',to:'output',id:machine.id,stage:recipe.outputStage ?? 4});
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
  // Count complete simulation minutes so the timing of a grouped delivery cannot
  // inflate throughput. Empty minutes also enter the rolling average.
  const window = sim.rateWindow;
  while (window && sim.productionTime + 1e-9 >= window.startTime + 60) {
    const stock=sim.productionTime > window.startTime+60+1e-9 ? priorStock : sim.shipped;
    window.minutes.push(stock - window.startStock);
    if (window.minutes.length > 3) window.minutes.shift();
    window.startTime += 60;
    window.startStock = stock;
    sim.productionRate = window.minutes.reduce((sum, count) => sum + count, 0) / window.minutes.length;
    sim.averageProductionSeconds = sim.productionRate > 0 ? 60 / sim.productionRate : null;
  }
  let goalRate = sim.productionRate;
  if (sim.stage.minuteGoal) {
    const ticksPerMinute = Math.round(60 / DT);
    const cutoff = sim.tick - ticksPerMinute;
    while (sim.minuteShipmentTicks.length && sim.minuteShipmentTicks[0] <= cutoff) sim.minuteShipmentTicks.shift();
    goalRate = cutoff < 0 ? 0 : sim.minuteShipmentTicks.length;
  }
  if (sim.stage.targetPerMinute != null && sim.shipmentTimes.length === (sim.stage.sampleCount ?? 5)) {
    if ((window && !window.minutes.length && !sim.stage.minuteGoal) || goalRate < sim.stage.targetPerMinute) return sim;
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
