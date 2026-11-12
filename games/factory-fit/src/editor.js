import {sitePath} from './site-path.js';
import { restoreLayoutVariants } from './game/restore-variants.js';
import { showShapeOptions } from './view/shape-options.js';
import { shapeFor } from './game/equipment-shapes.js';
import { icon } from './view/ui-icons.js';
import { workshopConfig } from './game/workshop-inlets.js';
import { FACTORIES, processConfig } from './game/products.js';
import { STAGE, EQUIPMENT, createAssignments } from './game/config.js';
import { footprint, validateLayout, cellKey } from './game/layout.js';
import { sessionStage, isInlet, atWall, dockBody, dockSides, dockSlots } from './game/docks.js';
import { validSession } from './game/session.js';
import { createSimulation, stepSimulation, DT } from './game/simulation.js';

const $ = id => document.getElementById(id);
const storageKey = 'factory-fit.editor.v1';
const emptyPlan = () => ({ layout: [], assignments: createAssignments([]) });
const factoryOf = d => FACTORIES[d.factory ?? 'box'];
const activeSteps = d => factoryOf(d).steps.filter(s=>!d.steps || d.steps.includes(s.id));
const toolKey = (d,s) => (d.factory??'box')==='box' ? s.type : s.id;
const terrain = { floor:'바닥 추가', cut:'바닥 제거', pillar:'기둥', hole:'구멍', inbound:'입고장', outbound:'출고장' };
const tools = { move:'설비 이동',worker:'작업자', erase:'삭제' };
const names = { ...terrain, ...tools };
function blank() {
  const cells=[];
  for(let y=1;y<=8;y++) for(let x=1;x<=10;x++) cells.push(x+','+y);
  const fixture=(id,y)=>({id,label:names[id],width:2,height:2,x:1,y,access:{x:3,y},color:id==='inbound'?'#b98950':'#579087'});
  return {version:1,name:'나의 공장',width:14,height:12,target:8,cells,holes:[],pillars:[],
    fixtures:[fixture('inbound',1),fixture('outbound',6)],start:emptyPlan(),reference:emptyPlan()};
}
let doc=blank(),mode='start',tool='cutter',rotation=0,variant='O',history=[];
let group='machines', grid=false, moving=null, scene, graphics;
const sharedStage = d => ({...STAGE,id:'editor-preview',name:d.name,width:d.width,height:d.height,cells:d.cells,
  holes:d.holes,pillars:d.pillars,fixtures:d.fixtures,targetPerMinute:d.target,minuteGoal:false,...workshopConfig(d)});
function pairPlans(d){
  const stage=sharedStage(d);
  for(const plan of [d.start,d.reference]) plan.assignments=createAssignments(plan.layout,stage,plan.assignments);
  return d;
}
pairPlans(doc);
const stageFor = (d, key = mode) => sessionStage(sharedStage(d), d[key]);
function issue(d) {
  if(d?.version!==1 || typeof d.name!=='string' || !Number.isFinite(d.target) || d.target<=0 ||
    ![d.width,d.height].every(n=>Number.isInteger(n)&&n>=4&&n<=64)) return '문제 파일의 형식이나 크기를 확인해 주세요.';
  const coords=c=>c && Number.isInteger(c.x)&&Number.isInteger(c.y)&&c.x>=0&&c.y>=0&&c.x<d.width&&c.y<d.height;
  if(!Array.isArray(d.cells)||!d.cells.length||!d.cells.every(k=>typeof k==='string' && /^\d+,\d+$/.test(k) && coords({x:+k.split(',')[0],y:+k.split(',')[1]}))) return '부지 안에 바닥을 지정하세요.';
  if(![d.holes,d.pillars].every(list=>Array.isArray(list)&&list.every(c=>coords(c)&&d.cells.includes(cellKey(c))))) return '장애물 아래에 바닥이 필요합니다.';
  try { processConfig(d.factory,d.steps); } catch { return '제품과 사용할 공정을 확인해 주세요.'; }
  const stage=sharedStage(d);
  if(!Array.isArray(d.fixtures)||d.fixtures.length!==2||!['inbound','outbound'].every(id=>d.fixtures.some(f=>f.id===id&&f.width===2&&f.height===2&&coords(f)&&(id==='inbound'||(coords(f.access)&&dockSides(f).flat().some(c=>cellKey(c)===cellKey(f.access))))))) return '입출고장에는 2×2 바닥과 인접 자리가 필요합니다.';
  if(!atWall(d.fixtures.find(f=>f.id==='outbound'),stage)) return '출고장 한 면의 두 칸이 모두 벽에 닿아야 합니다.';
  for(const key of ['start','reference']){
    const plan=d[key];
    if(!Array.isArray(plan?.layout)||!plan.assignments) return '시작·정답 배치 데이터가 필요합니다.';
    const label=key==='start'?'시작 배치':'정답 배치';
    const result=validateLayout(plan.layout,{stage:stageFor(d,key)});
    if(!result.valid) return label+' · '+result.errors[0];
    if(!validSession({version:5,stageId:stage.id,...plan},stage))
      return label+' · 입고장 주변 수거 공간과 작업자가 배정된 자리를 확인하세요.';

  }
  return '';
}
function restoreDocument(value) {
  if (!value?.start || !value.reference) return value;
  if(value.factory==='dumbbell'){
    const retired=id=>['m3','m4','m5'].includes(id?.split('-')[0]);
    if(value.steps){
      const kept=value.steps.filter(id=>!retired(id));
      value.steps=kept.length?kept:FACTORIES.dumbbell.steps.map(s=>s.id);
    }
    for(const plan of [value.start,value.reference]){
      plan.layout=plan.layout.filter(m=>!retired(m.id));
      for(const key of Object.keys(plan.assignments))if(retired(plan.assignments[key]))plan.assignments[key]=null;
    }
  }
  if(workshopConfig(value).forward){
    for(const plan of [value.start,value.reference])for(const key of Object.keys(plan.assignments)){
      if(plan.assignments[key]?.startsWith('outbound'))plan.assignments[key]=null;
    }
  }
  const stage=sharedStage(value);
  return pairPlans({...value,start:restoreLayoutVariants(value.start,stage),reference:restoreLayoutVariants(value.reference,stage)});
}
try { const saved=restoreDocument(JSON.parse(localStorage.getItem(storageKey)));if(saved&&!issue(saved))doc=saved; } catch {}
function save(){try{localStorage.setItem(storageKey,JSON.stringify(doc));}catch{$('status').textContent='자동 저장 공간이 부족합니다. 파일로 저장해 주세요.';}}
function accept(next){pairPlans(next);const error=issue(next);if(error){$('status').textContent=error;return false;}
  history.push(doc);if(history.length>60)history.shift();doc=next;$('status').textContent='';save();draw();return true;}
function cellMap(d) {
  const map=new Map(),mark=(c,kind,text,id,color)=>map.set(cellKey(c),{kind,text,id,color});
  for(const c of d.pillars)mark(c,'pillar','■');
  for(const c of d.holes)mark(c,'hole','×');
  for(const f of stageFor(d).fixtures) dockBody(f).forEach((c,i)=>mark(c,isInlet(f.id)?'inbound':f.id,i?'':(isInlet(f.id)?(f.id==='inbound'?'입':'입2'):'출'),f.id));
  for(const {id,cell} of dockSlots(stageFor(d)).sort((a,b)=>Number(Object.values(d[mode].assignments).includes(b.id))-Number(Object.values(d[mode].assignments).includes(a.id)))) if(!map.has(cellKey(cell)))mark(cell,'work','○',id);
  const plan=d[mode];
  for(const m of plan.layout){const f=footprint(m);f.body.forEach((c,i)=>{
      const output=f.output && cellKey(c)===cellKey(f.output);
      mark(c,'machine',output?'O':i?'':EQUIPMENT[m.type].name[0],m.id,output?'#278f88':EQUIPMENT[m.type].color);
    });
    for(const c of f.work)mark(c,'work','○',m.id);}
  for(const val of map.values())if(val.kind==='work'){
    const key=Object.keys(plan.assignments).find(k=>plan.assignments[k]===val.id);
    if(key){val.kind='staff';val.text=key.slice(1);}
  }
  return map;
}
function machineAt(hit){
  const plan=doc[mode],at=cellMap(doc).get(cellKey(hit.cell));
  return plan.layout.find(m=>m.id===(hit.id??hit.workId??at?.id));
}
function candidate(cell,centered){
  const plan=doc[mode], existing=tool==='move' ? plan.layout.find(m=>m.id===moving) : null;
  const step=activeSteps(doc).find(s=>toolKey(doc,s)===tool);
  if(!step&&!existing)return null;
  const base=existing??step,spec=EQUIPMENT[base.type], selected=Object.hasOwn(spec.variants ?? {},variant) ? variant : spec.defaultVariant;
  const geometry=shapeFor({type:base.type,variant:selected}) ?? spec;
  let id=base.id,n=1;
  if(!existing)while(plan.layout.some(m=>m.id===id))id=base.id+'-'+n++;
  const x=cell.x-(centered?Math.floor((rotation%2?geometry.height:geometry.width)/2):0);
  const y=cell.y-(centered?Math.floor((rotation%2?geometry.width:geometry.height)/2):0);
  return {id,type:base.type,variant:selected,x,y,rotation};
}
function applyMachine(plan,item){
  const i=plan.layout.findIndex(m=>m.id===item.id);
  if(i<0)plan.layout.push(item);else plan.layout[i]=item;
}
function pick3d(hit){
  if(!hit.cell)return;
  const m=machineAt(hit);
  if(tool==='worker' && hit.workId){
    const at=[...cellMap(doc)].find(([,v])=>v.id===hit.workId&&['work','staff'].includes(v.kind));
    if(at){editCell(...at[0].split(',').map(Number));return;}
  }
  if(m && (tool==='erase'||tool==='worker'||(tool==='move'&&!moving)) && !hit.workId){
    const c=footprint(m).body[0]; editCell(c.x,c.y);return;
  }
  editCell(hit.cell.x,hit.cell.y,true);
}
function preview(cell){
  const item=candidate(cell,true);
  if(!item)return null;
  const next={...doc,[mode]:{...doc[mode],layout:[...doc[mode].layout]}};
  applyMachine(next[mode],item);
  return {item,valid:!issue(pairPlans(next))};
}
function editCell(x,y,centered=false) {
  const next=structuredClone(doc),plan=next[mode],cell={x,y},key=cellKey(cell);
  const at=cellMap(next).get(key);
  const step=activeSteps(next).find(s=>toolKey(next,s)===tool);
  if(tool==='move'&&!moving){
    const m=plan.layout.find(it=>it.id===at?.id);
    if(!m){$('status').textContent='옮길 설비를 먼저 선택하세요.';return;}
    moving=m.id;rotation=m.rotation;variant=m.variant ?? EQUIPMENT[m.type].defaultVariant;draw();return;
  }
  if(tool==='floor'){if(next.cells.includes(key))return;next.cells.push(key);}
  else if(tool==='cut'){next.cells=next.cells.filter(k=>k!==key);}
  else if(tool==='hole'||tool==='pillar'){
    if(!next.cells.includes(key)||at && !['floor','work'].includes(at.kind)){ $('status').textContent='빈 바닥을 선택하세요.';return;}
    next[tool==='hole'?'holes':'pillars'].push(cell);
  }else if(isInlet(tool)||tool==='outbound'){
    if(tool==='inbound-2'){(plan.inlets??={})[tool]=cell;accept(next);return;}
    if(tool==='inbound'){plan.inbound=cell;accept(next);return;}
    const f=next.fixtures.find(v=>v.id===tool);Object.assign(f,cell);
    for(const access of dockSides(f).flat()){f.access=access;if(!issue(next)){accept(next);return;}}
  }else if(step||moving && tool==='move'){
    const item=candidate(cell,centered);
    if(!item)return;
    applyMachine(plan,item);
    if(accept(next) && moving){moving=null;draw();}
    return;
  }else if(tool==='worker'){
    if(!at || !['work','staff','machine'].includes(at.kind)){ $('status').textContent='설비 또는 출고장 옆의 동그라미를 선택하세요.';return;}
    const assigned=$('worker').value;
    for(const k of Object.keys(plan.assignments))if(plan.assignments[k]===at.id)plan.assignments[k]=null;
    plan.assignments[assigned]=at.id;
  }else if(tool==='erase'){
    if(at?.kind==='staff'){const k=Object.keys(plan.assignments).find(k=>plan.assignments[k]===at.id);plan.assignments[k]=null;}
    else if(plan.layout.some(m=>m.id===at?.id)){plan.layout=plan.layout.filter(m=>m.id!==at.id);
      for(const k of Object.keys(plan.assignments))if(plan.assignments[k]===at.id)plan.assignments[k]=null;}
    else{next.pillars=next.pillars.filter(c=>cellKey(c)!==key);next.holes=next.holes.filter(c=>cellKey(c)!==key);}
  }
  accept(next);
}
function draw(){
  const factory=factoryOf(doc), steps=activeSteps(doc);
  $('factory').value=factory.key;
  $('process-flow').textContent=steps.map(s=>s.label).join(' → ');
  $('steps').replaceChildren();
  for(const s of factory.steps){
    const label=document.createElement('label'),input=document.createElement('input');
    input.type='checkbox';input.value=s.id;input.checked=steps.includes(s);
    input.onchange=()=>changeRoute(factory.key,[...$('steps').querySelectorAll('input:checked')].map(c=>c.value));
    label.append(input,s.label+' · '+EQUIPMENT[s.type].name);$('steps').append(label);
  }
  const buttons=Object.fromEntries(steps.map(s=>[toolKey(doc,s),factory.key==='box'?EQUIPMENT[s.type].name:s.label]));
  const dockTools={...terrain};
  for(const f of sharedStage(doc).fixtures.filter(f=>isInlet(f.id)))dockTools[f.id]=f.label;
  $('terrain').replaceChildren();addTools('terrain',dockTools);
  if(!Object.hasOwn({...names,...dockTools,...buttons},tool)) tool=toolKey(doc,steps[0]);
  $('equipment').replaceChildren();addTools('equipment',buttons);
  $('width').value=doc.width;$('height').value=doc.height;
  $('name').value=doc.name;$('target').value=doc.target;$('undo').disabled=!history.length;
  const selectedType=steps.find(s=>toolKey(doc,s)===tool)?.type ?? (tool==='move' && doc[mode].layout.find(m=>m.id===moving)?.type);
  showShapeOptions($('shape'),selectedType,variant);
  $('rotate').textContent='회전 '+rotation*90+'°';$('rotate').disabled=!Object.hasOwn(buttons,tool) && !moving;
  document.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.mode===mode));
  document.querySelectorAll('[data-tool]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.tool===tool));
  $('hint').textContent=(dockTools[tool]??names[tool]??buttons[tool])+' · '+(tool==='worker'?'담당 자리를 누르세요':tool==='move'?(moving?'새 위치를 누르세요':'옮길 설비를 누르세요'):'설치·편집할 칸을 누르세요');$('count').textContent=doc.cells.length+'칸';
  $('terrain').hidden=group!=='terrain';$('worker-panel').hidden=group!=='workers';$('equipment').hidden=group!=='machines';
  document.querySelectorAll('[data-group]').forEach(b=>b.setAttribute('aria-pressed',b.dataset.group===group));
  $('grid-toggle').setAttribute('aria-pressed',grid);
  $('grid-toggle').textContent=grid?'3D 보기':'격자 보기';
  document.querySelector('.viewport').hidden=!grid;$('scene-frame').hidden=grid;
  $('fit').disabled=grid;
  if(graphics){
    const images=graphics.equipmentImages(steps,selectedType,variant,sharedStage(doc));
    for(const s of steps){
      const b=$('equipment').querySelector('[data-tool="'+toolKey(doc,s)+'"]');
      const img=document.createElement('img');img.alt='';img.src=images.get(s.id);b.prepend(img);
      b.title=s.label+' · '+EQUIPMENT[s.type].name;
    }
    if(group==='workers')$('portrait').src=graphics.workerImage(STAGE.workers,$('worker').value);
  }
  if(!grid && scene)scene.update(stageFor(doc),doc[mode],moving,tool==='worker'?$('worker').value:null);
  if(!grid)return;
  const board=$('board'), map=cellMap(doc),floor=new Set(doc.cells);board.style.setProperty('--cols',doc.width);
  const fragment=document.createDocumentFragment();
  for(let y=0;y<doc.height;y++)for(let x=0;x<doc.width;x++){const k=x+','+y,v=map.get(k),b=document.createElement('button');
    b.className='cell '+(v?.kind??(floor.has(k)?'floor':''));b.dataset.cell=k;b.textContent=v?.text??'';
    if (v?.color) b.style.backgroundColor = v.color;
    b.setAttribute('aria-label',k+' '+(v?.id??v?.kind??(floor.has(k)?'바닥':'부지 밖')));fragment.append(b);}
  board.replaceChildren(fragment);
}
function addTools(id,group){for(const [key,label] of Object.entries(group)){
  const b=document.createElement('button');b.dataset.tool=key;b.textContent=label;b.onclick=()=>selectTool(key);$(id).append(b);}}
function selectTool(key){moving=null;tool=key;$('status').textContent='';draw();}
for(const b of document.querySelectorAll('.edit-actions [data-tool],#worker-panel [data-tool]'))b.onclick=()=>selectTool(b.dataset.tool);
for(const b of document.querySelectorAll('[data-group]'))b.onclick=()=>{
  group=b.dataset.group;
  selectTool(group==='terrain'?'floor':group==='workers'?'worker':toolKey(doc,activeSteps(doc)[0]));
};
$('worker').onchange=()=>selectTool('worker');
$('configure').onclick=()=>$('settings').showModal();$('close-settings').onclick=()=>$('settings').close();
$('grid-toggle').onclick=()=>{grid=!grid;draw();};$('fit').onclick=()=>scene?.fit();
for(const b of document.querySelectorAll('[data-icon]'))b.innerHTML=icon(b.dataset.icon);
addTools('terrain',terrain);
function changeRoute(key, ids) {
  if(!ids.length){$('status').textContent='공정을 하나 이상 선택하세요.';draw();return;}
  const next=structuredClone(doc), changed=key!==factoryOf(doc).key;
  next.factory=key;next.steps=ids;
  if(changed)for(const plan of [next.start,next.reference]){
    delete plan.inlets;
    for(const key of Object.keys(plan.assignments))if(isInlet(plan.assignments[key])||plan.assignments[key]?.startsWith('outbound'))plan.assignments[key]=null;
  }
  let removed=0;
  for(const plan of [next.start,next.reference]){
    const obsolete=plan.layout.filter(m=>changed || !ids.includes(m.id.split('-')[0]));
    removed+=obsolete.length;const gone=new Set(obsolete.map(m=>m.id));
    plan.layout=plan.layout.filter(m=>!gone.has(m.id));
    for(const w of Object.keys(plan.assignments))if(gone.has(plan.assignments[w]))plan.assignments[w]=null;
  }
  if(removed && !confirm('공정을 변경하면 두 배치에서 기존 설비 '+removed+'대와 해당 작업 배정을 해제합니다. 변경할까요?')){draw();return;}
  accept(next);
}
for(const f of Object.values(FACTORIES))$('factory').add(new Option(f.name,f.key));
$('factory').onchange=()=>{const f=FACTORIES[$('factory').value];changeRoute(f.key,f.steps.map(s=>s.id));};
for(const w of STAGE.workers)$('worker').add(new Option(w.name,w.key));
$('board').onclick=e=>{const k=e.target.closest('[data-cell]')?.dataset.cell;if(k)editCell(...k.split(',').map(Number));};
document.querySelectorAll('[data-mode]').forEach(b=>b.onclick=()=>{moving=null;mode=b.dataset.mode;$('status').textContent='';draw();});
$('shape').onchange=event=>{variant=event.target.value;draw();};
$('rotate').onclick=()=>{rotation=(rotation+1)%4;draw();};
$('undo').onclick=()=>{if(history.length){moving=null;doc=history.pop();save();draw();}};
$('name').onchange=()=>accept({...doc,name:$('name').value.trim()||'나의 공장'});
$('target').onchange=()=>{if(!accept({...doc,target:Number($('target').value)}))draw();};
$('new').onclick=()=>{if(accept(blank())){moving=null;mode='start';group='machines';tool='cutter';draw();}};
for (const dim of ['width','height']) $(dim).onchange=()=>{
  if (!accept({...doc,[dim]:Number($(dim).value)})) draw();
};
$('export').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=doc.name+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('import').onclick=()=>$('file').click();
$('file').onchange=async()=>{try{const f=$('file').files[0];if(f)accept(restoreDocument(JSON.parse(await f.text())));}catch{$('status').textContent='문제 JSON 파일을 읽을 수 없습니다.';}finally{$('file').value='';}};
$('simulate').onclick=()=>{const plan=doc[mode],sim=createSimulation(plan.layout,plan.assignments,stageFor(doc));sim.continueAfterSuccess=true;
  const ticks=Math.round(300/DT);for(let i=0;i<ticks;i++)stepSimulation(sim);const before=sim.shipped;
  for(let i=0;i<ticks;i++)stepSimulation(sim);
  $('status').textContent='5분 예열 후 5분간 '+(sim.shipped-before)+'개 입고 · '+((sim.shipped-before)/5).toFixed(1)+'개/분 · 목표 '+doc.target+'개/분';};
$('play').onclick=()=>{const p=doc[mode];
  sessionStorage.setItem('factory-fit.editor.preview',JSON.stringify({factory:doc.factory,steps:doc.steps,name:doc.name,width:doc.width,height:doc.height,cells:doc.cells,holes:doc.holes,pillars:doc.pillars,fixtures:sharedStage(doc).workshopInlets?doc.fixtures:stageFor(doc).fixtures,startInbound:p.inbound,startInlets:p.inlets,targetPerMinute:doc.target,startLayout:p.layout,startAssignments:p.assignments}));
  save();location.href=sitePath('./?stage=editor-preview');};
draw();
try{
  graphics=await import('./editor-scene.js');
  scene=graphics.editorScene($('scene-frame'),{pick:pick3d,preview});
  draw();
  window.factoryEditor=Object.freeze({projectCell:(x,y)=>scene.projectCell({x,y})});
}catch(error){
  graphics=null;scene=null;grid=true;draw();$('grid-toggle').disabled=true;
  $('status').textContent='3D 화면을 열 수 없어 격자 편집기로 전환했습니다.';
  console.error(error);
}

document.querySelector("header a").href = sitePath("./");
