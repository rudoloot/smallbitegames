// Eight rooms around a courtyard. Each link corresponds to real facing doors.
const ROOM_NODES=Object.freeze([{id:0,x:55,y:45},{id:1,x:160,y:45},{id:2,x:265,y:45},{id:3,x:55,y:150},{id:4,x:265,y:150},{id:5,x:55,y:255},{id:6,x:160,y:255},{id:7,x:265,y:255}]);
const ROOM_LINKS=Object.freeze([
 {a:0,aSide:'east',b:1,bSide:'west'},
 {a:1,aSide:'east',b:2,bSide:'west'},
 {a:0,aSide:'south',b:3,bSide:'north'},
 {a:2,aSide:'south',b:4,bSide:'north'},
 {a:3,aSide:'south',b:5,bSide:'north'},
 {a:4,aSide:'south',b:7,bSide:'north'},
 {a:5,aSide:'east',b:6,bSide:'west'},
 {a:6,aSide:'east',b:7,bSide:'west'}
]);
function roomConnections(id){return ROOM_LINKS.filter(l=>l.a===id||l.b===id).map(l=>({target:l.a===id?l.b:l.a,edge:l.a===id?l.aSide:l.bSide}));}
// Cleared rooms are safe transit corridors, never new battles or extra rewards.
function roomRoutes(current,cleared){
 const routes=new Map(),seen=new Set([current]),queue=[[current]];
 for(let i=0;i<queue.length;i++)for(const c of roomConnections(queue[i].at(-1))){
  if(seen.has(c.target))continue;seen.add(c.target);const path=[...queue[i],c.target];
  if(cleared.includes(c.target))queue.push(path);else routes.set(c.target,path);
 }
 return routes;
}
function makeDoor(edge,targetStage=null){
 const half=RULES.size/2;return {x:edge==='west'?0:edge==='east'?RULES.size:half,y:edge==='north'?0:edge==='south'?RULES.size:half,width:140,edge,targetStage,entry:false};
}
function doorNormal(door){return door.edge==='north'?{x:0,y:-1}:door.edge==='south'?{x:0,y:1}:door.edge==='west'?{x:-1,y:0}:{x:1,y:0};}
function spawnInsideDoor(door){const n=doorNormal(door);return {x:door.x-n.x*110,y:door.y-n.y*110};}
function roomDoors(id,from=null){
 const doors=roomConnections(id).map(c=>makeDoor(c.edge,c.target));
 let entry=from===null?doors.find(d=>d.edge==='north'):doors.find(d=>d.targetStage===from);
 if(!entry){entry=makeDoor('north');doors.push(entry);}entry.entry=true;
 if(!doors.some(d=>d.edge==='south'))doors.push(makeDoor('south'));
 const point=spawnInsideDoor(entry),exit=doors.filter(d=>d!==entry).sort((a,b)=>Math.hypot(b.x-point.x,b.y-point.y)-Math.hypot(a.x-point.x,a.y-point.y))[0];
 return {doors,entry,exit};
}
function roomPerimeter(doors){
 const walls=[],size=RULES.size,thickness=16;
 for(const edge of ['north','south','west','east']){
  const horizontal=edge==='north'||edge==='south',start=horizontal?0:thickness,end=horizontal?size:size-thickness;
  const openings=doors.filter(d=>d.edge===edge).map(d=>({a:(horizontal?d.x:d.y)-d.width/2,b:(horizontal?d.x:d.y)+d.width/2})).sort((a,b)=>a.a-b.a);
  let cursor=start;
  const add=(a,b)=>{if(b<=a)return;walls.push(horizontal?{x:a,y:edge==='north'?0:size-thickness,w:b-a,h:thickness,height:2}:{x:edge==='west'?0:size-thickness,y:a,w:thickness,h:b-a,height:2});};
  for(const gap of openings){add(cursor,Math.min(end,gap.a));cursor=Math.max(cursor,gap.b);}add(cursor,end);
 }
 return walls;
}
