import { footprint, operatorFacing, cellKey } from './layout.js';
import { shapeFor } from './equipment-shapes.js';

export const DT=.2;
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
function machineCenter(item){
  const shape=shapeFor(item);
  const w=shape?.width ?? 1,h=shape?.height ?? 1;
  return {x:item.x+(item.rotation%2?h:w)/2,y:item.y+(item.rotation%2?w:h)/2};
}
function surfacePoint(kind,event,sim){
  if(kind==='inbound' || kind==='outbound'){
    const dock=sim.stage.fixtures.find(f=>f.id===(kind==='inbound'?event.id:kind));
    return dock && {x:clamp(event.x+.5,dock.x+.5,dock.x+dock.width-.5),
      y:clamp(event.y+.5,dock.y+.5,dock.y+dock.height-.5)};
  }
  const item=sim.layout.find(m=>m.id===event.id);
  if(!item)return null;
  if(kind==='belt')return machineCenter(item);
  const shape=footprint(item);
  const cell=kind==='output'?shape.output:shape.process;
  return cell && {x:cell.x+.5,y:cell.y+.5};
}
const turnRate=1.5*Math.PI; // Radians per second at normal playback speed.
const secondsPerTile=.60; // One 0.5 m tile while handling goods.
export const transferSeconds=.65/1.5;
const shortestTurn=(from,to)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
export function motionFrame(sim) {
  if(sim.motion?.tick===sim.tick) return sim.motion;
  const previous=sim.motion?.motions ?? [];
  let frameDuration=DT;
  const motions=sim.workers.map(worker=>{
    const old=previous[worker.id];
    let angle=old?.angle ?? 0;
    let x=worker.from.x,y=worker.from.y,time=0;
    const segments=[], events=[];
    function segment(duration,toAngle,toX=x,toY=y) {
      if(duration>0) segments.push({start:time,duration,angle,delta:toAngle-angle,x,y,toX,toY});
      time+=duration;angle=toAngle;x=toX;y=toY;
    }
    function turnTo(target,available=Infinity) {
      const turn=clamp(shortestTurn(angle,target),-available*turnRate,available*turnRate);
      segment(Math.abs(turn)/turnRate,angle+turn);
    }
    function walk(toX,toY) {
      if(x===toX && y===toY) return;
      const target=Math.atan2(toX-x,toY-y);
      turnTo(target);
      segment(Math.hypot(toX-x,toY-y)*secondsPerTile,angle,toX,toY);
    }
    for(const event of worker.transfers){
      walk(event.x,event.y);
      const point=surfacePoint(event.from==='hand'?event.to:event.from,event,sim);
      const start=time;
      if(point) turnTo(Math.atan2(point.x-x-.5,point.y-y-.5));
      events.push({start,moveStart:time,end:time+transferSeconds});
      segment(transferSeconds,angle);
    }
    walk(worker.x,worker.y);
    if(!segments.length){
      const own=sim.machines.find(m=>m.id===worker.machineId);
      const facing=own && cellKey(worker)===cellKey(own.work[0]) && operatorFacing(footprint(own));
      const supplier=worker.waitingForSource && sim.machines.find(m=>m.id===worker.waitingForSource);
      const source=supplier && machineCenter(supplier);
      const target=source ? Math.atan2(source.x-x-.5,source.y-y-.5) :
        facing ? Math.atan2(facing.x,facing.y) : angle;
      // Spawn already looking at the station. Replaying tick zero must not spin
      // from world north after the edit view has shown the worker in position.
      if(!old) angle=target;
      turnTo(target,DT);
      segment(Math.max(0,DT-time),angle);
    }
    frameDuration=Math.max(frameDuration,time);
    return {segments,events,angle};
  });
  sim.motion={tick:sim.tick,motions,duration:frameDuration};
  return sim.motion;
}
