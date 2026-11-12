import { validateLayout, footprint, cellKey, inBounds } from './layout.js';
import { sessionStage, dockSlots, isInlet, isOutbound } from './docks.js';
import { EQUIPMENT } from './config.js';

// Old saves and editor exports only recorded a type and rotation.
export function restoreLayoutVariants(plan, stage) {
  if (!Array.isArray(plan?.layout) || !plan.layout.some(item => EQUIPMENT[item.type]?.variants && item.variant === undefined)) return plan;
  const live = sessionStage(stage,plan);
  const assignedDocks = new Set(Object.values(plan.assignments ?? {}).filter(id=>isInlet(id)||isOutbound(id)));
  const reserved = new Set(dockSlots(live).filter(s => assignedDocks.has(s.id)).map(s=>cellKey(s.cell)));
  for (const cell of Object.values(plan.waitingWorkers ?? {})) reserved.add(cellKey(cell));
  const layout = plan.layout.filter(item => item.variant !== undefined || !EQUIPMENT[item.type]?.variants);
  const chosen = new Map();
  for (const item of plan.layout) {
    const spec = EQUIPMENT[item.type];
    if (item.variant !== undefined || !spec?.variants) continue;
    if (![item.x,item.y,item.rotation].every(Number.isInteger) || item.rotation<0 || item.rotation>3) return plan;
    const parked = !inBounds(item,live);
    let match;
    for (let distance=0; distance<=3 && !match; distance++) {
      for (let dy=-distance; dy<=distance && !match; dy++) for (const dx of new Set([distance-Math.abs(dy), Math.abs(dy)-distance])) {
        for (const variant of Object.keys(spec.variants)) {
          for (let turn=0; turn<4; turn++) {
            const next={...item,variant,x:item.x+dx,y:item.y+dy,rotation:(item.rotation+turn)%4};
            const shape=footprint(next);
            if (!parked && !shape.body.some(c=>inBounds(c,live))) continue;
            if ([...shape.body,...shape.work].some(c=>reserved.has(cellKey(c)))) continue;
            if (validateLayout([...layout,next],{stage:live,allowOutside:parked || layout.some(m=>!inBounds(m,live))}).valid) { match=next; break; }
          }
          if (match) break;
        }
        if (match) break;
      }
    }
    if (!match) return plan;
    layout.push(match); chosen.set(item.id,match);
  }
  return {...plan,layout:plan.layout.map(item=>chosen.get(item.id) ?? item)};
}
