import { EQUIPMENT_SHAPES } from './game/equipment-shapes.js';
import { createFactoryView } from './view/factory.js';
import { createEquipmentPreviews } from './view/equipment-previews.js';
import { createWorkerPreviews } from './view/worker-previews.js';
import { outputColor, createSimulation } from './game/simulation.js';

const images=new Map();
let portraits;
export function equipmentImages(steps, selectedType, selectedVariant, stage) {
  const items=steps.map(({id,type})=>{
    const spec=EQUIPMENT_SHAPES[type];
    const variant=type===selectedType && Object.hasOwn(spec.variants,selectedVariant) ? selectedVariant : spec.defaultVariant;
    const operator=stage.workers[stage.inventory.findIndex(given=>given.id===id)];
    return {id,type,variant,operator,key:[type,variant,operator.key,outputColor({id,type},stage)].join('/')};
  });
  const missing=items.filter(item=>!images.has(item.key));
  if(missing.length){
    const rendered=createEquipmentPreviews(missing,{inventoryView:true,stage});
    for(const item of missing) images.set(item.key,rendered.get(item.id));
  }
  return new Map(items.map(item=>[item.id,images.get(item.key)]));
}
export function workerImage(workers,key) {
  portraits??=createWorkerPreviews(workers);
  return portraits.get(key);
}

export function editorScene(frame, callbacks) {
  let view, host, previousTerrain, previousLayout, pointerCell, previewKey, scheduled=false;
  function paint(){
    if(scheduled)return;
    scheduled=true;requestAnimationFrame(()=>{scheduled=false;if(frame.offsetWidth)view?.render();});
  }
  function preview(cell){
    pointerCell=cell;
    const result=cell && callbacks.preview(cell);
    const key=result ? JSON.stringify(result) : '';
    if(key===previewKey)return;
    previewKey=key;view?.setPreview(result?.item,!!result?.valid);paint();
  }
  function update(stage,plan,selected,worker){
    const terrain=JSON.stringify([stage.width,stage.height,stage.cells,stage.pillars,stage.holes,stage.fixtures.find(f=>f.id==='outbound'),stage.processSummary,stage.fixtures.map(f=>f.id)]);
    if(terrain!==previousTerrain){
      const camera=view?.cameraState();
      view?.dispose();host=document.createElement('div');host.className='editor-scene';frame.replaceChildren(host);
      view=createFactoryView(host,{onPick:callbacks.pick,onHover:preview,onCameraChange:paint},stage);
      if(camera)view.restoreCamera(camera);
      host.addEventListener('pointerleave',()=>preview(null));
      host.addEventListener('pointerdown',()=>preview(null));
      previousTerrain=terrain;previousLayout=null;pointerCell=null;previewKey='';
    }
    const layout=JSON.stringify([plan,selected,worker,stage.fixtures]);
    if(layout!==previousLayout){
      view.setLayout(plan.layout,selected,plan.assignments,worker,{},stage);
      view.update(createSimulation(plan.layout,plan.assignments,stage),1,0,false);
      previousLayout=layout;
    }
    preview(pointerCell);paint();
  }
  return {update,fit(){view?.fit();paint();},projectCell(cell){return view?.projectCell(cell);}};
}
