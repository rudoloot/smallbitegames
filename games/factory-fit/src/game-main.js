import {sitePath} from './site-path.js';
import { showReference } from './view/reference-layout.js';
import { FACTORIES } from './game/products.js';
import {parkedInlet,sessionStage,dockSlots,inletId,isInlet,isOutbound} from './game/docks.js';
import { inBounds, cellKey, outsideFactory } from './game/layout.js';
import { shapeLabel, showShapeOptions } from './view/shape-options.js';
import { icon } from './view/ui-icons.js';
import { STAGE, STAGES, EQUIPMENT, PRODUCTS, createAssignments, suppliedEquipment } from './game/config.js';
import { transact, createSession } from './game/session.js';
import { createSimulation, stepSimulation, reconfigureSimulation, recipeFor, DT } from './game/simulation.js';
import { loadSession, saveSession, loadProgress, saveProgress } from './platform/storage.js';
const $ = selector => document.querySelector(selector);
for (const [id, name] of [['map-exit', 'map'], ['undo', 'undo'], ['redo', 'redo'], ['options', 'settings'], ['fit-view', 'fit'], ['previous', 'previous'], ['next', 'next']]) $('#'+id).innerHTML = icon(name);
$('#rotate').innerHTML = icon('rotate') + '<span>회전</span>';
const openingSession = createSession();
if (STAGE.id === 'editor-preview') {
  openingSession.layout = structuredClone(STAGE.startLayout);
  openingSession.assignments=STAGE.paired?createAssignments(openingSession.layout,STAGE):{...openingSession.assignments,...STAGE.startAssignments};
}
let session = (STAGE.id==='editor-preview' ? null : loadSession()) ?? structuredClone(openingSession), draft = null, pendingWorker = null, selectedId = null, view;
const undoStack = [], redoStack = [];
let historyPresent = structuredClone(session);
const createLiveSimulation = (layout, assignments) => Object.assign(createSimulation(layout, assignments, sessionStage(STAGE,session)), { continueAfterSuccess: true });
let goalAchieved = false, lastMeasurement = null;
let sim = createLiveSimulation(session.layout, session.assignments), mode = 'edit', running = false, accumulator = 0, lastTime = 0, noticeTimer;
let pausedRun = null, playbackSpeed = 1, playbackTime = 0;
const catalogInventory = Object.keys(EQUIPMENT).map(type => ({ id: `catalog-${type}`, type }));
const previewCache = new Map();
let generatePreviews;
function catalogPreview(type,variant) {
  const key = type + '/' + (variant ?? '');
  if (!previewCache.has(key) && generatePreviews) {
    previewCache.set(key, generatePreviews([{type,variant}]).get(type));
  }
  return previewCache.get(key);
}
function shapeGrid(spec) {
  const rows = (spec.mask ?? ['#']).map(row => [...row]);
  if (spec.workCell) {
    const [x,y] = spec.workCell;
    while (rows.length <= y) rows.push(Array(spec.width).fill('.'));
    rows[y][x] = 'W';
  }
  return rows.flat().map(c => {
    const kind = {'.':'empty','#':'body',O:'output',W:'worker'}[c];
    return `<span class="cell-${kind}">${c==='O'&&STAGE.forward?'I':c==='O'||c==='W'?c:''}</span>`;
  }).join('');
}
for (const {type} of catalogInventory) {
  const card = document.createElement('article'), spec = EQUIPMENT[type];
  card.style.setProperty('--machine-color',spec.color);
  card.innerHTML = `<h3>${spec.name}</h3><select aria-label="${spec.name} 모양"></select><img data-equipment-type="${type}" alt="${spec.name} 모델"><small></small><div class="shape-grid"></div>`;
  const select = card.querySelector('select');
  showShapeOptions(select,type,spec.defaultVariant);
  function updateDiagram() {
    const variant = select.value || undefined, geometry = recipeFor({type,variant}, STAGE);
    const grid = card.querySelector('.shape-grid');
    grid.style.gridTemplateColumns = `repeat(${geometry.width},22px)`;
    grid.innerHTML = shapeGrid(geometry);
    const cells = geometry.mask?.join('').replaceAll('.','').length ?? 1;
    card.querySelector('small').textContent = spec.belt ? '운반 · 1칸' : `작업자 포함 ${cells+1}칸 · ${geometry.seconds}초`;
    const image = catalogPreview(type,variant);
    if (image) card.querySelector('img').src = image;
  }
  select.onchange = updateDiagram;
  updateDiagram();
  $('#catalog-grid').append(card);
}
$('#options').addEventListener('click',()=>$('#options-dialog').showModal());
$('#options-close').addEventListener('click',()=>$('#options-dialog').close());
$('#catalog-open').addEventListener('click',()=>{$('#options-dialog').close();$('#catalog-dialog').showModal();});
$('#catalog-close').addEventListener('click',()=>$('#catalog-dialog').close());
const canEdit = () => ['edit', 'run'].includes(mode);
const cleared = new Set(loadProgress());
const clearKey = `${[STAGE.id,STAGE.revision].filter(Boolean).join(':')}:sample:${STAGE.sampleCount}:rate:${STAGE.targetPerMinute}`;
function updateProduction() {
  $('#stage-goal').textContent = goalAchieved ? '목표 성공' : STAGE.minuteGoal ? `최근 60초 입고 ${sim.minuteShipmentTicks.length}/${Math.ceil(STAGE.targetPerMinute)}개` : '목표 : 분당 ' + STAGE.targetPerMinute + '개 제작';
  $('#stage-goal').classList.toggle('achieved', goalAchieved);
  if (sim.rateWindow) {
    const count = sim.rateWindow.minutes.length;
    $('#production-rate').textContent = count ? sim.productionRate.toFixed(1) + '개/분' : (running ? '첫 1분 측정 중' : '첫 1분 측정 대기');
    $('#production-rate').title = count ? '최근 '+count+'분 평균 · 매분 갱신' : '첫 1분의 창고 입고량을 측정하는 중';
    return;
  }
  const current = sim;
  if (current.averageProductionSeconds != null) lastMeasurement = { averageProductionSeconds: current.averageProductionSeconds, productionRate: current.productionRate };
  const measured = current.averageProductionSeconds != null ? current : lastMeasurement ?? current;
  $('#production-rate').textContent = `${measured.averageProductionSeconds == null ? '—' : measured.productionRate.toFixed(1)}개/분`;
  const average = measured.averageProductionSeconds == null ? '첫 입고 대기 중' : `평균 ${measured.averageProductionSeconds.toFixed(2)}초/개`;
  $('#production-rate').title = mode === 'run' && !running ? `${average} · 일시정지 · 배치 수정 가능` : mode === 'edit' ? `첫 입고부터 최근 최대 ${STAGE.sampleCount}개의 평균으로 측정해요` : `${average} · 누적 ${sim.shipped}개`;
}
function notice(text, error = false) { clearTimeout(noticeTimer); $('#notice').textContent = text; $('#notice').classList.toggle('error', error); $('#notice').hidden = false; noticeTimer = setTimeout(() => $('#notice').hidden = true, error ? 6000 : 3400); }
function persist(record = true) {
  if (record && JSON.stringify(historyPresent) !== JSON.stringify(session)) {
    undoStack.push(historyPresent); if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }
  historyPresent = structuredClone(session);
  if (STAGE.id!=='editor-preview') saveSession(session);
  if (mode === 'run') {
    sim = reconfigureSimulation(sim, session.layout, session.assignments, sessionStage(STAGE,session));
    mode = 'run';
    if (!running) pausedRun = { sim, layout: JSON.stringify(session), accumulator };
  }
}
const currentResult = () => draft && draft.x !== null ? transact(session, draft) : null;
const currentState = () => session;
const nameOf = id => isInlet(id)?STAGE.fixtures.find(f=>f.id===inletId(id))?.label:isOutbound(id) ? '출고장' : EQUIPMENT[session.layout.find(m => m.id === id)?.type]?.short ?? '미배치';
function refresh({ model = true } = {}) {
  const result = currentResult(), working = currentState();
  $('#onboarding').hidden = session.layout.length > 0 || !!draft || !canEdit();
  $('#context').hidden = !canEdit() || (!draft && !pendingWorker);
  $('#catalog-panel').hidden = !!draft || !!pendingWorker;
  $('#context').classList.toggle('machine-detail', !!draft || !!pendingWorker);
  $('#worker-guidance').hidden = !pendingWorker;
  const inlet=draft?.type==='moveInbound';
  $('#machine-stats').hidden = !draft || inlet;
  $('#move-inbound').hidden = !inlet || !placedInlet(draft?.id);
  $('#rotate').hidden = inlet;
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !redoStack.length;
  $('#machine-actions').hidden = !draft; $('#worker-actions').hidden = !pendingWorker;
  $('#run').innerHTML = icon(running ? 'pause' : 'play');
  $('#run').setAttribute('aria-label', running ? '일시정지' : '재생');
  if(inlet){
    $('#selected-name').textContent=STAGE.fixtures.find(f=>f.id===draft.id).label;
    $('#shape').hidden=true;
    const dock = {...STAGE.fixtures.find(f=>f.id===draft.id), x:draft.x, y:draft.y};
    const placement = parkedInlet(dock,STAGE) ? '공장 밖 임시 보관 · 자재 공급 중지' : '배치 가능';
    $('#placement-status').textContent=draft.x===null ? '빈 2×2칸을 선택하세요. 공장 밖에도 임시 보관할 수 있어요.' : result?.ok ? placement+' · 설치를 눌러 확정하세요.' : result.error;
    $('#confirm').disabled=!result?.ok;
    $('#remove').hidden=!placedInlet(draft?.id);
  } else if (draft) {
    const item = suppliedEquipment(draft.id);
    showShapeOptions($('#shape'), item.type, draft.variant); $('#shape').hidden = !!item.variant || !EQUIPMENT[item.type].variants; $('#selected-name').textContent = (recipeFor(item,STAGE).operation ?? EQUIPMENT[item.type].name) + (item.variant ? ' · '+shapeLabel(item.variant) : '');
    $('#placement-status').textContent = draft.x === null ? '설치할 위치를 누르세요 · 공장 밖은 임시 대기' : result?.ok ? `${draft.rotation * 90}° · 배치 가능` : `${draft.rotation * 90}° · 간섭 — 위치나 방향을 바꿔 주세요`;
    $('#confirm').disabled = !result?.ok;
    $('#remove').hidden = !session.layout.some(m => m.id === draft.id);
  } else if (pendingWorker) { $('#selected-name').textContent = STAGE.workers.find(w => w.key === pendingWorker).name; $('#placement-status').textContent = '작업자 자리 선택'; $('#unassign').disabled = !session.assignments[pendingWorker] && !session.waitingWorkers?.[pendingWorker]; }
  if (view && model) {
    view.setLayout(working.layout, selectedId, working.assignments, pendingWorker, working.waitingWorkers,sessionStage(STAGE,working));
    if (mode === 'edit') sim = createLiveSimulation(working.layout, working.assignments);
    const given = draft && suppliedEquipment(draft.id);
    view.setPreview(draft && draft.x !== null ? inlet ? {...STAGE.fixtures.find(f=>f.id===draft.id),x:draft.x,y:draft.y,type:'inbound'} : { ...draft, type: given.type, operator:STAGE.paired && !EQUIPMENT[given.type].belt
      ? STAGE.workers.find(w=>(result?.state?.assignments??working.assignments)[w.key]===draft.id) ?? STAGE.workers[STAGE.inventory.indexOf(given)] : null } : null, !!result?.ok);
  }
  updateProduction();
  updateEquipmentInfo();
  updateCards();
}
function updateEquipmentInfo() {
  if (!draft || draft.type==='moveInbound') return;
  const type = suppliedEquipment(draft.id).type;
  const recipe = recipeFor({ ...draft, type }, STAGE), machine = sim.machines.find(m => m.id === draft.id);
  $('#machine-cycle').textContent = recipe.seconds + '초';
  $('#machine-average').textContent = machine?.completedCycles ? (machine.totalCycleSeconds / machine.completedCycles).toFixed(2) + '초' : '측정 중';
}
function commitDraft() {
  if (!draft) return true;
  const result = currentResult(); if (!result?.ok) { notice(result?.error ?? '설비를 놓을 위치를 선택해 주세요.', true); return false; }
  session = result.state; draft = null; selectedId = null; persist(); refresh(); return true;
}
function cancel() {  draft = null; pendingWorker = null; selectedId = null; refresh(); }
function beginSupply(baseId) {
  if (!STAGE.unlimitedEquipment) { beginMachine(baseId); return; }
  let id = baseId, n = 1;
  while (session.layout.some(item => item.id === id)) id = `${baseId}-${n++}`;
  beginMachine(id);
}
function beginMachine(id) {
  
  if (!canEdit() || draft?.id === id) return;
  if (draft && !commitDraft()) return;
  pendingWorker = null; selectedId = id;
  const placed = session.layout.find(item => item.id === id);
  draft = { type: 'place', id, variant: placed?.variant ?? suppliedEquipment(id).variant ?? EQUIPMENT[suppliedEquipment(id).type].defaultVariant, x: placed?.x ?? null, y: placed?.y ?? null, rotation: placed?.rotation ?? 0 }; refresh();
}
function chooseWorker(key) {  if (!canEdit() || (draft && !commitDraft())) return; draft = null; selectedId = null; pendingWorker = key; refresh(); }
function moveDraft(cell) {
  if (!draft || !cell) return;
  const given = suppliedEquipment(draft.id), spec = recipeFor({...draft, type:given.type}, STAGE), w = draft.rotation % 2 ? spec.height : spec.width, h = draft.rotation % 2 ? spec.width : spec.height;
  const x = cell.x - Math.floor(w / 2), y = cell.y - Math.floor(h / 2);
  if (draft.x === x && draft.y === y) return; Object.assign(draft, { x, y }); refresh();
}
function assign(workId) {
  if (!pendingWorker || !workId) { notice('담당할 설비의 파란 자리를 선택하세요.', true); return; }
  const result = transact(session, { type: 'assign', workerId: pendingWorker, machineId: workId });
  if (!result.ok) { notice(result.error, true); return; }
  session = result.state; pendingWorker = null; persist(); refresh();
}
const inboundFixtures=STAGE.playerPlacesInbound===false?[]:STAGE.fixtures.filter(f=>isInlet(f.id));
const placedInlet=id=>sessionStage(STAGE,session).fixtures.some(f=>f.id===id);
function beginInbound(id) {
  if(STAGE.playerPlacesInbound===false)return;
  pendingWorker=null; selectedId=null;
  draft={type:'moveInbound',id,x:null,y:null};
  refresh();
}
function pick(hit) {
  if (!canEdit()) return;
  if (draft?.type==='moveInbound' && hit.cell) {
    Object.assign(draft,hit.cell);
    refresh();return;
  }
  if (pendingWorker && !hit.workId && hit.cell && !inBounds(hit.cell)) {
    const result = transact(session, { type: 'waitOutside', workerId: pendingWorker, ...hit.cell });
    if (!result.ok) { notice(result.error, true); return; }
    session = result.state; pendingWorker = null; persist(); refresh(); notice('작업자가 공장 밖에서 대기합니다.'); return;
  }
  if(pendingWorker && STAGE.forward && !hit.workId && isInlet(hit.fixedId)){
    const slots=dockSlots(sessionStage(STAGE,session)).filter(s=>inletId(s.id)===hit.fixedId);
    const slot=slots.find(s=>!Object.values(session.assignments).includes(s.id) &&
      transact(session,{type:'assign',workerId:pendingWorker,machineId:s.id}).ok);
    if(slot)assign(slot.id);else notice('교대할 입고 담당자의 자리를 선택하세요.');
    return;
  }
  if (pendingWorker) { assign(hit.workId ?? ((STAGE.forward ? isInlet(hit.fixedId) : isOutbound(hit.fixedId)) ? hit.fixedId : null)); return; }
  if (draft && hit.cell) {
    moveDraft(hit.cell);
    const stored = outsideFactory({ ...draft, type: suppliedEquipment(draft.id).type });
    if (commitDraft() && stored) notice('설비가 공장 밖에서 대기합니다.');
    return;
  }
  const waiting = hit.cell && Object.entries(session.waitingWorkers ?? {}).find(([,cell]) => cellKey(cell) === cellKey(hit.cell));
  if (waiting) { chooseWorker(waiting[0]); return; }
  if(isInlet(hit.fixedId)) {beginInbound(hit.fixedId);return;}
  if (hit.id) beginMachine(hit.id);
  else if (hit.workId && STAGE.paired) { if(session.layout.some(m=>m.id===hit.workId)) beginMachine(hit.workId); }
  else if (hit.workId) { const key = Object.keys(session.assignments).find(key => session.assignments[key] === hit.workId); if (key) chooseWorker(key); else { selectInventory('workers'); notice('아래 작업자를 고른 뒤 이 자리에 배치하세요.'); } }
}
const inventories = {equipment:{slots:[],page:0},workers:{slots:[],page:0}};
let activeInventory='equipment';
function selectInventory(name) {
  
  if(STAGE.paired && name==='workers')return;
  activeInventory=name;
  for (const key of Object.keys(inventories)) {
    const active=key===name, tab=$('#'+key+'-tab');
    tab.setAttribute('aria-selected',String(active));
    tab.tabIndex=active?0:-1;
    $('#'+key+'-list').hidden=!active;
  }
  updateCards();
}
for (const name of Object.keys(inventories)) {
  const tab=$('#'+name+'-tab');
  if(STAGE.paired && name==='workers'){tab.hidden=true;continue;}
  tab.onclick=()=>selectInventory(name);
  tab.onkeydown=event=>{
    if (STAGE.paired || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();event.stopPropagation();
    const next=event.key==='Home'?'equipment':event.key==='End'?'workers':name==='workers'?'equipment':'workers';
    selectInventory(next);
    $('#'+next+'-tab').focus();
  };
}
function updateCards() {
  const inventory=inventories[activeInventory], available=[];
  for (const slot of inventory.slots) {
    slot.hidden=true;
    const card=slot.firstElementChild;
    if (!card) continue;
    const {fixture,supplyId,workerKey}=card.dataset;
    const used=isInlet(fixture) ? placedInlet(fixture) : workerKey
      ? session.assignments[workerKey] || session.waitingWorkers?.[workerKey]
      : !STAGE.unlimitedEquipment && session.layout.some(m=>m.id===supplyId);
    card.disabled=!canEdit() || !!used;
    if (!used) available.push(slot);
  }
  const pages=Math.max(1,Math.ceil(available.length/10));
  inventory.page=Math.min(inventory.page,pages-1);
  const visible=available.slice(inventory.page*10,(inventory.page+1)*10);
  const blanks=inventory.slots.filter(slot=>!slot.firstElementChild);
  for (const slot of [...visible,...blanks.slice(0,10-visible.length)]) slot.hidden=false;
  $('#inventory-page').textContent=(inventory.page+1)+' / '+pages;
  $('#previous').disabled=inventory.page===0;
  $('#next').disabled=inventory.page+1>=pages;
}
function turnCard(direction) {
  const inventory=inventories[activeInventory];
  inventory.page=Math.max(0,inventory.page+direction);
  updateCards();
}
function appendSlot(name,card) {
  const slot=document.createElement('div');
  slot.className='inventory-slot';
  if (card) slot.append(card);
  inventories[name].slots.push(slot);
  $('#'+name+'-list').append(slot);
}
$('#onboarding strong').textContent=STAGE.name;
if(STAGE.processTitle){
  document.title='Factory Fit · '+STAGE.processTitle;
  $('#help-dialog .eyebrow').textContent=STAGE.processTitle+' 공장';
  $('#onboarding strong').textContent=STAGE.processTitle+' 공장';
  $('#onboarding span').textContent=STAGE.processSummary;
}
for(const fixture of inboundFixtures){
  const card=document.createElement('button');
  card.type='button';card.className='supply-card';card.dataset.fixture=fixture.id;
  card.innerHTML='<img data-inbound-preview alt="" draggable="false"><span>입고장</span>';
  card.querySelector('span').textContent=fixture.label;
  card.onclick=()=>{
    if (performance.now()<=suppressClickUntil || !canEdit()) return;
    beginInbound(fixture.id);
  };
  appendSlot('equipment',card);
}
const route = STAGE.referenceLayout?(STAGE.referenceLayout??STAGE.inventory):FACTORIES[STAGE.factory ?? 'box'].steps.filter(step => !STAGE.steps || STAGE.steps.includes(step.id));
const typeOrder = [...new Set([...route, ...STAGE.inventory].map(item => item.type))];
const sortedEquipment = [...STAGE.inventory].sort((a,b) =>
  typeOrder.indexOf(a.type) - typeOrder.indexOf(b.type) ||
  (a.variant ?? '').localeCompare(b.variant ?? '', 'en')
);
for (const given of sortedEquipment) {
  const spec=recipeFor(given,STAGE),card=document.createElement('button');
  const repeated=STAGE.referenceLayout?.filter(item=>item.type===given.type).length>1;
  const label=(repeated && spec.operation ? spec.operation : spec.name)+(given.variant?' · '+shapeLabel(given.variant,false):'');
  card.type='button';card.className='supply-card';card.dataset.supplyId=given.id;
  card.setAttribute('aria-label',label+' 선택');card.title=[spec.operation,label,spec.seconds+'초'].filter(Boolean).join(' · ');
  card.innerHTML=`<img data-equipment-type="${given.type}" data-variant="${given.variant??''}" alt="" draggable="false"><span>${label}</span>`;
  card.onclick=()=>{if(performance.now()>suppressClickUntil)beginSupply(given.id);};
  appendSlot('equipment',card);
}
for (const worker of STAGE.paired?[]:STAGE.workers) {
  const card=document.createElement('button');card.type='button';card.className='supply-card worker';card.dataset.workerKey=worker.key;
  card.setAttribute('aria-label',worker.name+' 작업자 선택');
  card.innerHTML=`<img data-worker-portrait="${worker.key}" alt="" draggable="false"><span>${worker.name}</span>`;
  card.onclick=()=>{if(performance.now()>suppressClickUntil)chooseWorker(worker.key);};
  appendSlot('workers',card);
}
for(const name of Object.keys(inventories)) {
  for(let i=0;i<10;i++) appendSlot(name);
}
// A card swipe browses the tray. Only a click selects a card.
let gesture = null, suppressClickUntil = 0;
$('#inventory-grid').addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0) return;
  suppressClickUntil = 0;
  gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: false };
  event.target.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (gesture?.id === event.pointerId && Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 7) gesture.moved = true;
});
document.addEventListener('pointerup', event => {
  if (gesture?.id !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (gesture.moved || Math.hypot(dx, dy) > 7) {
    suppressClickUntil = performance.now() + 500;
    if (Math.abs(dx) >= 32 && Math.abs(dx) > Math.abs(dy)) turnCard(dx < 0 ? 1 : -1);
  }
  gesture = null;
});
document.addEventListener('pointercancel', event => { if (gesture?.id === event.pointerId) gesture = null; });
function finish() {
  if(sim.outcome !== 'success') { running=false;edit();if(sim.reason)notice(sim.reason,true);return; }
  goalAchieved=true;mode='run';refresh({model:false});if(STAGE.id!=='editor-preview'){cleared.add(clearKey);saveProgress([...cleared]);}
  $('#result-icon').textContent='✦';$('#result-title').textContent='생산 목표 달성!';
  $('#result-copy').textContent=STAGE.minuteGoal ? `최근 60초 동안 ${sim.minuteShipmentTicks.length}개 입고! 목표 ${STAGE.targetPerMinute}개/분을 달성했습니다.` : sim.rateWindow ? `최근 ${sim.rateWindow.minutes.length}분 평균 · 분당 ${sim.productionRate.toFixed(1)}개 입고` : `최근 ${STAGE.sampleCount}개 제작 ${(sim.averageProductionSeconds * STAGE.sampleCount).toFixed(1)}초 · 평균 ${sim.averageProductionSeconds.toFixed(2)}초/개. 분당 ${sim.productionRate.toFixed(1)}개 생산!`;
  $('#result-note').textContent='목표 달성 후에도 공장은 계속 가동됩니다.';$('#result-dialog').showModal();
}
function start() {
  if (!view) return;
  if (mode === 'run') {
    if (running) { pauseRun(); return; }
    if (draft && !commitDraft()) return;
    const unchanged = pausedRun?.layout === JSON.stringify(session);
    sim = unchanged ? pausedRun.sim : createLiveSimulation(session.layout, session.assignments);
    accumulator = unchanged ? pausedRun.accumulator : 0;
    pausedRun = null; pendingWorker = null; selectedId = null; running = true; refresh(); return;
  }
  if (draft && !commitDraft()) return;
  pendingWorker = null; selectedId = null; sim = createLiveSimulation(session.layout, session.assignments); accumulator = 0;
  mode = 'run'; running = true; refresh();
}
function pauseRun() {
  pausedRun = { sim, layout: JSON.stringify(session), accumulator }; running = false; refresh();
}
function edit() {  pausedRun = null; mode = 'edit'; running = false; accumulator = 0; draft = null; pendingWorker = null; selectedId = null; refresh(); }
function restoreHistory(direction) {
  const from = direction === 'undo' ? undoStack : redoStack;
  const to = direction === 'undo' ? redoStack : undoStack;
  if (!from.length) return;
  to.push(structuredClone(session)); session = from.pop();
  draft = null; pendingWorker = null; selectedId = null;
  persist(false); refresh();
}
$('#undo').addEventListener('click', () => restoreHistory('undo'));
$('#redo').addEventListener('click', () => restoreHistory('redo'));
$('#run').addEventListener('click', start);
$('#speed').addEventListener('click', () => {
  playbackSpeed=playbackSpeed%3+1;
  $('#speed').textContent=playbackSpeed+'×';
  $('#speed').setAttribute('aria-label','재생 속도 '+playbackSpeed+'배');
});
$('#confirm').addEventListener('click', commitDraft); $('#cancel').addEventListener('click', cancel); $('#worker-cancel').addEventListener('click', cancel);
$('#shape').onchange = event => { if (draft) { draft.variant = event.target.value; refresh(); } };
$('#move-inbound').onclick=()=>{beginInbound(draft.id);notice('이동할 위치를 누른 뒤 설치하세요.');};
$('#rotate').addEventListener('click', () => { if (draft?.type==='place') { draft.rotation = (draft.rotation + 1) % 4; refresh(); } });
$('#remove').addEventListener('click', () => { if (!draft) return; const result = transact(session, { type: draft.type==='moveInbound'?'removeInbound':'remove', id: draft.id }); if (result.ok) { session = result.state; persist(); cancel(); } });
$('#unassign').addEventListener('click', () => { const result = transact(session, { type: 'assign', workerId: pendingWorker, machineId: null }); if (result.ok) { session = result.state; persist(); cancel(); } });
for (const [id, direction] of [['previous', -1], ['next', 1]]) $('#'+id).addEventListener('click', () => { turnCard(direction); });
$('#fit-view').addEventListener('click', () => view?.fit()); $('#retry').addEventListener('click', () => $('#result-dialog').close());
$('#result-list').addEventListener('click', () => { location.href = STAGE.id==='editor-preview' ? sitePath('./editor.html') : sitePath('./'); });
$('#map-exit').addEventListener('click', () => { saveSession(session); location.href = STAGE.id==='editor-preview' ? sitePath('./editor.html') : sitePath('./'); });
$('#map-home').addEventListener('click', () => { location.href = STAGE.id==='editor-preview' ? sitePath('./editor.html') : sitePath('./'); });
const nextStage = STAGE.id==='editor-preview' ? null : STAGES[STAGES.findIndex(stage => stage.id === STAGE.id) + 1];
$('#next-stage').disabled = !nextStage; $('#next-stage').title = nextStage ? nextStage.name : '마지막 스테이지입니다';
$('#next-stage').addEventListener('click', () => { if (nextStage) location.href = stageUrl(nextStage.id); });
$('#stage-list-close').addEventListener('click', () => $('#stage-list-dialog').close());
for (const stage of STAGES) {
  const button = document.createElement('button'); button.textContent = String(stage.number).padStart(2, '0') + ' · ' + stage.name;
  button.addEventListener('click', () => { location.href = stageUrl(stage.id); }); $('#stage-list').append(button);
}
if (STAGE.playbackGoals) $('#goal-help').append(' 생산량과 목표는 회전·운반을 포함한 1배속 시간으로 계산합니다.');
if(STAGE.paired){
  $('#reference-open').hidden=!STAGE.referenceLayout;
  $('#reference-open').onclick=()=>{showReference($('#reference-content'),STAGE);$('#options-dialog').close();$('#reference-dialog').showModal();};
  $('#reference-close').onclick=()=>$('#reference-dialog').close();
  $('#help-dialog ol li:nth-child(4)').textContent=STAGE.hint+' 입고장의 깃발을 보고 첫 작업대를 배치하세요.';
  $('#goal-help').textContent='완제품 설비가 한 대면 최근 '+STAGE.sampleCount+'개 출고 간격의 평균으로 목표를 판정합니다.';
}
if (STAGE.minuteGoal) $('#goal-help').textContent = '가동 60초 후부터 최근 60초 동안 창고에 입고된 수량으로 목표를 판정합니다.';
$('#help').addEventListener('click', () => { $('#options-dialog').close(); $('#help-dialog').showModal(); }); $('#help-close').addEventListener('click', () => $('#help-dialog').close());
$('#options-reset').addEventListener('click', () => { $('#options-dialog').close(); $('#reset-dialog').showModal(); });
$('#reset').addEventListener('click', () => { $('#help-dialog').close(); $('#reset-dialog').showModal(); }); $('#reset-cancel').addEventListener('click', () => $('#reset-dialog').close());
$('#reset-confirm').addEventListener('click', () => { session = createSession(); undoStack.length = redoStack.length = 0; historyPresent = structuredClone(session); goalAchieved = false; lastMeasurement = null; $('#reset-dialog').close(); mode = 'edit'; persist(); inventories.equipment.page=inventories.workers.page=0; selectInventory('equipment'); edit(); });
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if ((event.ctrlKey || event.metaKey) && !event.target.closest('input,textarea,select') && ['z', 'y'].includes(event.key.toLowerCase())) {
    event.preventDefault(); restoreHistory(event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo'); return;
  }
  if (event.target.closest('.tray') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); turnCard(event.key === 'ArrowLeft' ? -1 : 1); $('#'+activeInventory+'-list').querySelector('.inventory-slot:not([hidden]) button:not([hidden])')?.focus(); return; }
  if (event.key === 'Escape') { cancel(); return; }
  if (event.target.closest('input,textarea,select')) return; if (event.key.toLowerCase() === 'r' && draft) $('#rotate').click(); if (event.code === 'Space' && !event.target.closest('button')) { event.preventDefault(); start(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && running) { if (mode === 'run') pauseRun(); else { running = false; refresh({ model: false }); } } lastTime = 0; });
async function boot() {
  try {
    const { createFactoryView } = await import('./view/factory.js');
    const { createEquipmentPreviews } = await import('./view/equipment-previews.js');
    const { createWorkerPreviews } = await import('./view/worker-previews.js');
    const portraits = STAGE.paired ? null : createWorkerPreviews(STAGE.workers);
    for(const img of document.querySelectorAll('[data-worker-portrait]')) img.src=portraits.get(img.dataset.workerPortrait);
    generatePreviews = createEquipmentPreviews;
    const previews = createEquipmentPreviews(catalogInventory);
    for (const [type,image] of previews) previewCache.set(type+'/'+(EQUIPMENT[type].defaultVariant ?? ''), image);
    for (const img of document.querySelectorAll('#catalog-grid [data-equipment-type]')) img.src = previews.get(img.dataset.equipmentType);
    const inventoryImages = createEquipmentPreviews([...sortedEquipment.map(item=>({...item,operator:STAGE.paired?STAGE.workers[STAGE.inventory.indexOf(item)]:null})),...inboundFixtures.map(f=>({...f,type:'inbound'}))], {inventoryView:true});
    for(const f of inboundFixtures) document.querySelector('[data-fixture="'+f.id+'"] img').src=inventoryImages.get(f.id);
    for (const img of document.querySelectorAll('#equipment-list [data-equipment-type]')) {
      img.src = inventoryImages.get(img.closest('button').dataset.supplyId);
    }
    view = createFactoryView($('#scene'), { onPick: pick, onContextLost: () => { running = false; notice('3D 연결이 끊겼어요. 새로고침하면 저장한 배치를 복원합니다.', true); } }, STAGE);
    sim = createLiveSimulation(session.layout, session.assignments);
    if (session.layout.length) { mode='run'; running=true; }
    $('#loading').remove(); $('#scene').dataset.ready = 'true'; $('#run').disabled = false; refresh();
    // Read-only diagnostics for authoring and browser QA; no solution or mutating hook is exposed.
    window.factoryFit = Object.freeze({ snapshot: () => structuredClone({ session, simulationLayout: sim.layout, machines: sim.machines, preview: view.inspectPreview(), mode, outcome: sim.outcome, shipped: sim.shipped, productionRate: sim.productionRate, averageProductionSeconds: sim.averageProductionSeconds, shipmentTimes: sim.shipmentTimes, targetPerMinute: STAGE.targetPerMinute, time: sim.time, productionTime: sim.productionTime, running, playbackSpeed, reason: sim.reason, draft }), projectCell: (x, y) => view.projectCell({ x, y }) });
    function frame(now) {
      const elapsed = lastTime ? Math.min(.15, (now - lastTime) / 1000) : 0; lastTime = now;
      let duration=view.playbackDuration(sim);
      if (running) {
        const delta=elapsed*playbackSpeed;
        playbackTime+=delta;
        accumulator+=delta;
        while(accumulator>=duration && (!sim.complete || sim.outcome==='success')){
          accumulator-=duration;stepSimulation(sim);duration=view.playbackDuration(sim);
        }
        if(sim.complete && (sim.outcome!=='success' || !goalAchieved)) finish();
        updateProduction();
      }
      view.update(sim, mode==='run' ? accumulator/duration : 1, playbackTime, !running && canEdit()); updateEquipmentInfo(); view.render(); requestAnimationFrame(frame);
    } requestAnimationFrame(frame);
  } catch (error) { const el = $('#loading') ?? $('#notice'); el.hidden = false; el.classList.add('error'); el.textContent = '3D 화면을 열지 못했어요. 페이지를 새로고침해 주세요.'; console.error(error); }
}
refresh(); boot();

function stageUrl(stage) {
  const url = new URL(location.href);
  if (stage) url.searchParams.set("stage", stage);
  else url.searchParams.delete("stage");
  return url.href;
}

window.addEventListener("factory-fit-site-exit", () => { if(STAGE.id !== 'editor-preview') saveSession(session); });
