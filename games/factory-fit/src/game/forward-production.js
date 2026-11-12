import {dockSides, isInlet, keyOf} from './docks.js';
import {footprint, neighbors} from './layout.js';
import {DT} from './motion.js';

export function dispatch(sim,w,pathTo) {
  if(!w.machineId) return;
  if(!w.carrying && keyOf(w)!==keyOf(w.home)) {
    const path=pathTo(sim,w,[w.home]);
    if(path){w.path=path;w.job={phase:'home',goals:[w.home],target:w.home};}
    return;
  }
  const dock=sim.stage.fixtures.find(f=>f.id===w.machineId);
  if(!w.carrying && !isInlet(dock?.id)) return;
  const available=w.carrying?[w.cargo.product]:dock.supplies;
  for(let i=0;i<available.length;i++){
    const product=available[((w.cursor??0)+i)%available.length];
    const options=[];
    if(product===sim.stage.product){
      const outlet=sim.stage.fixtures.find(f=>f.id==='outbound');
      options.push({id:outlet.id,goals:dockSides(outlet).flat()});
    } else for(const m of sim.machines){
      if(m.parked) continue;
      const amount=sim.stage.stepRecipes[m.id.split('-')[0]].needs[product]??0;
      const incoming=sim.workers.filter(other=>other.job?.destination===m.id && other.cargo?.product===product).length;
      if((m.stock[product]??0)+incoming<amount) options.push({id:m.id,goals:neighbors(footprint(m).output,sim.stage)});
    }
    let best;
    for(const opt of options){
      const path=pathTo(sim,w,opt.goals);
      if(path && (!best || path.length<best.path.length)) best={...opt,path};
    }
    if(!best) continue;
    if(!w.carrying){
      w.cursor=((w.cursor??0)+i+1)%available.length;
      w.carrying=true;w.cargo={product,stage:sim.stage.goods.indexOf(product),weight:1};
      w.transfers.push({x:w.x,y:w.y,from:'inbound',to:'hand',id:dock.id,stage:w.cargo.stage});sim.supplied++;
    }
    w.path=best.path;w.job={phase:'send',destination:best.id,goals:best.goals,target:best.path.at(-1)??{x:w.x,y:w.y}};
    w.status='납품 중';return;
  }
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
