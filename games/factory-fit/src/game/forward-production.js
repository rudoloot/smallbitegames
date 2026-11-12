import {dockSides, inletId, isInlet, keyOf} from './docks.js';
import {footprint, neighbors} from './layout.js';
import {DT} from './motion.js';

function startTrip(worker,destination,goals,path){
  worker.path=path;
  worker.job={phase:'send',destination,goals,target:path.at(-1)??{x:worker.x,y:worker.y}};
  worker.status='납품 중';
}

function requests(sim,products){
  const open=[];
  for(const machine of sim.machines){
    if(machine.parked)continue;
    const recipe=sim.stage.stepRecipes[machine.id.split('-')[0]];
    for(const product of products){
      const needed=recipe.needs[product];
      if(!needed)continue;
      const reserved=sim.workers.filter(w=>w.job?.destination===machine.id && w.cargo?.product===product).length;
      const remaining=needed-(machine.stock[product]??0)-reserved;
      if(remaining>0)open.push({machine,product,remaining,goals:neighbors(footprint(machine).output,sim.stage)});
    }
  }
  return open;
}

// Assign all available hands at this dock together. The oldest unserved
// destination/material goes first; walking distance breaks equivalent ties.
function supplyDock(sim,dock,pathTo){
  const idle=sim.workers.filter(w=>inletId(w.machineId)===dock.id && !w.carrying && !w.job && keyOf(w)===keyOf(w.home));
  const pairs=[];
  for(const request of requests(sim,dock.supplies)){
    for(const worker of idle){
      const path=pathTo(sim,worker,request.goals);
      if(path)pairs.push({worker,request,path});
    }
  }
  const last=({request:r})=>r.machine.lastSupply?.[r.product]??-1;
  while(pairs.length){
    pairs.sort((a,b)=>last(a)-last(b)||a.path.length-b.path.length);
    const {worker,request,path}=pairs.shift();
    if(worker.job || request.remaining===0)continue;
    const {machine,product,goals}=request;
    request.remaining--;
    (machine.lastSupply??={})[product]=sim.tick;
    worker.carrying=true;worker.cargo={product,stage:sim.stage.goods.indexOf(product),weight:1};
    worker.transfers.push({x:worker.x,y:worker.y,from:'inbound',to:'hand',id:dock.id,stage:worker.cargo.stage});
    sim.supplied++;
    startTrip(worker,machine.id,goals,path);
  }
}

export function dispatch(sim,w,pathTo) {
  if(!w.machineId)return;
  if(!w.carrying){
    if(keyOf(w)!==keyOf(w.home)){
      const path=pathTo(sim,w,[w.home]);
      if(path){w.path=path;w.job={phase:'home',goals:[w.home],target:w.home};}
    }else if(isInlet(w.machineId)){
      const dock=sim.stage.fixtures.find(f=>f.id===inletId(w.machineId));
      // Each idle peer has already been considered on this tick.
      const checked=sim.supplyTicks??={};
      if(dock && checked[dock.id]!==sim.tick){
        checked[dock.id]=sim.tick;supplyDock(sim,dock,pathTo);
      }
    }
    return;
  }
  const product=w.cargo.product;
  const options=product===sim.stage.product
    ? [{machine:sim.stage.fixtures.find(f=>f.id==='outbound')}]
    : requests(sim,[product]);
  let best;
  for(const {machine,goals=dockSides(machine).flat()} of options){
    const path=pathTo(sim,w,goals);
    if(path && (!best || path.length<best.path.length))best={machine,goals,path};
  }
  if(best)startTrip(w,best.machine.id,best.goals,best.path);
}
export function deliver(sim,w){
  const id=w.job.destination;
  const receiver=sim.machines.find(m=>m.id===id);
  // One physical input tile accepts one handoff at a time.
  if(receiver?.lastDeliveryTick===sim.tick)return;
  if(receiver)receiver.lastDeliveryTick=sim.tick;
  w.transfers.push({x:w.x,y:w.y,from:'hand',to:id==='outbound'?'outbound':'output',id,stage:w.cargo.stage});
  if(id==='outbound'){
    sim.shipped++;sim.warehouse.stock++;sim.firstShipment??=sim.productionTime;
    sim.shipmentTimes.push(sim.productionTime);
    if(sim.shipmentTimes.length>sim.stage.sampleCount)sim.measurementStart=sim.shipmentTimes.shift();
    if(!sim.rateWindow){
      sim.averageProductionSeconds=(sim.productionTime-sim.measurementStart)/sim.shipmentTimes.length;
      sim.productionRate=60/sim.averageProductionSeconds;
    }
  } else {
    receiver.stock[w.cargo.product]=(receiver.stock[w.cargo.product]??0)+1;receiver.input++;
  }
  w.cargo=null;w.carrying=false;w.job=null;w.metrics.transfers++;w.status='작업 자리로 복귀';
}
export function processBatch(sim,m,w,r){
  if(w.carrying)return;
  if(!m.processing){
    if(!Object.entries(r.needs).every(([p,n])=>(m.stock[p]??0)>=n))return;
    for(const [p,n] of Object.entries(r.needs)){m.stock[p]-=n;m.input-=n;}
    m.processing=r.seconds;m.cycleStartedAt=sim.productionTime;w.status='작업 중';return;
  }
  m.processing=Math.max(0,Number((m.processing-DT).toFixed(4)));
  w.metrics.working+=DT;m.progress=1-m.processing/r.seconds;
  if(!m.processing){
    w.cargo={product:r.output,stage:r.outputStage,weight:1};w.carrying=true;
    w.transfers.push({x:w.x,y:w.y,from:'process',to:'hand',id:m.id,stage:r.outputStage});
    m.completedCycles++;m.totalCycleSeconds+=sim.productionTime-m.cycleStartedAt;m.progress=0;
  }
}
