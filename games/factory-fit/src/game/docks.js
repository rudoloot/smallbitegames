// A wall borders the playable floor. Interior pillars and missing floor holes do not count as walls.
export const keyOf = cell => cell.x + ',' + cell.y;
export const onFloor = (cell, stage) => stage.cells ? stage.cells.includes(keyOf(cell)) :
  cell.x >= 0 && cell.y >= 0 && cell.x < stage.width && cell.y < stage.height;
export function dockBody(dock) {
  return Array.from({ length: dock.width * dock.height }, (_, i) =>
    ({ x: dock.x + i % dock.width, y: dock.y + Math.floor(i / dock.width) }));
}
export function parkedInlet(dock, stage) {
  return isInlet(dock.id) && dockBody(dock).every(cell => !onFloor(cell, stage));
}
export function dockSides({ x, y, width, height }) {
  return [
    Array.from({length:height}, (_,i)=>({x:x+width,y:y+i})),
    Array.from({length:height}, (_,i)=>({x:x-1,y:y+i})),
    Array.from({length:width}, (_,i)=>({x:x+i,y:y-1})),
    Array.from({length:width}, (_,i)=>({x:x+i,y:y+height})),
  ];
}
export const atWall = (dock,stage) => dockSides(dock).some(side=>side.every(c=>!onFloor(c,stage)));
export const inletId=id=>typeof id==='string'?id.split('@')[0]:null;
export const isInlet=id=>/^inbound(?:-|$)/.test(inletId(id));
export const isOutbound = id => id === 'outbound' || (typeof id === 'string' && id.startsWith('outbound@'));
export function dockSlots(stage) {
  if(stage.forward){
    const blocked=new Set([...stage.holes,...(stage.pillars??[]),...stage.fixtures.flatMap(dockBody)].map(keyOf));
    return stage.fixtures.filter(f=>isInlet(f.id) && !parkedInlet(f,stage)).flatMap(f=>dockSides(f).flat()
      .filter(cell=>onFloor(cell,stage)&&!blocked.has(keyOf(cell)))
      .map(cell=>({cell,id:keyOf(cell)===keyOf(f.access)?f.id:
        f.id+'@'+keyOf({x:cell.x-f.x,y:cell.y-f.y})})));
  }
  const dock=stage.fixtures.find(f=>f.id==='outbound');
  if(stage.paired || dock.width!==2 || dock.height!==2) return [{id:'outbound',cell:dock.access}];
  const blocked=new Set([...stage.holes,...(stage.pillars??[]),...stage.fixtures.flatMap(dockBody)].map(keyOf));
  return dockSides(dock).flat().filter(c=>onFloor(c,stage)&&!blocked.has(keyOf(c))).map(cell=>({
    id:keyOf(cell)===keyOf(dock.access)?'outbound':'outbound@'+keyOf(cell),cell
  }));
}
// Extend the original corner footprints outward to preserve existing layouts and saved coordinates.
export function expandDocks(stage) {
  const cells=new Set(stage.cells ?? Array.from({length:stage.width*stage.height},(_,i)=>keyOf({x:i%stage.width,y:Math.floor(i/stage.width)})));
  const fixtures=stage.fixtures.map(old=>{
    const dock={...old,x:old.x-1,y:old.id==='inbound'?old.y-(2-old.height):old.y,width:2,height:2};
    for(const c of dockBody(dock)) cells.add(keyOf(c));
    if(old.id==='outbound'){
      for(const side of [0,2,3]) for(const c of dockSides(dock)[side]) cells.add(keyOf(c));
      for(const y of [dock.y-1,dock.y+2])cells.add(keyOf({x:dock.x+2,y}));
    }
    return dock;
  });
  return {...stage,cells:[...cells],fixtures};
}
export function sessionStage(stage, state) {
  if((stage.forward || stage.paired && (stage.playerPlacesInbound || stage.workshopInlets)) && state){
    const fixtures=stage.fixtures.flatMap(f=>{
      if(!isInlet(f.id))return [f];
      const pos=f.id==='inbound'?(stage.workshopInlets && state.inbound===undefined?f:state.inbound):state.inlets?.[f.id];
      return pos?[{...f,...pos,access:{x:pos.x+f.access.x-f.x,y:pos.y+f.access.y-f.y}}]:[];
    });
    return {...stage,fixtures};
  }
  // Existing saves without this field used the authored inlet.
  if (state?.inbound === null) return {...stage,fixtures:stage.fixtures.filter(f=>f.id!=='inbound')};
  if (!state?.inbound) return stage;
  return {...stage,fixtures:stage.fixtures.map(f=>f.id==='inbound'?{...f,x:state.inbound.x,y:state.inbound.y}:f)};
}
