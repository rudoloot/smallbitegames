import { icon } from './view/ui-icons.js';
import { STAGE, STAGES, EQUIPMENT, PRODUCTS, suppliedEquipment, createSuggestedLayout } from './game/config.js';
import { transact, createSession } from './game/session.js';
import { createSimulation, stepSimulation, runSimulation, reconfigureSimulation, recipeFor, DT } from './game/simulation.js';
import { loadSession, saveSession, loadProgress, saveProgress } from './platform/storage.js';
import { loadEquipmentColor, saveEquipmentColor } from './platform/appearance.js';
import { EQUIPMENT_SHAPES } from './game/equipment-shapes.js';
const $ = selector => document.querySelector(selector);
for (const [id, name] of [['map-exit', 'map'], ['undo', 'undo'], ['redo', 'redo'], ['options', 'settings'], ['fit-view', 'fit'], ['previous', 'previous'], ['next', 'next']]) $('#'+id).innerHTML = icon(name);
$('#rotate').innerHTML = icon('rotate') + '<span>회전</span>';
const openingSession = { ...createSession(), layout: createSuggestedLayout() };
Object.assign(openingSession.assignments, { w1: 'm1', w2: 'm2', w3: 'm3', w4: 'outbound' });
let session = loadSession() ?? structuredClone(openingSession), draft = null, pendingWorker = null, selectedId = null, view;
const undoStack = [], redoStack = [];
let historyPresent = structuredClone(session);
const baseline = runSimulation(session.layout, session.assignments, { ...STAGE, targetPerMinute: 0 }, 800);
const createLiveSimulation = (layout, assignments) => Object.assign(createSimulation(layout, assignments), { continueAfterSuccess: true });
let goalAchieved = false, lastMeasurement = null;
let sim = createLiveSimulation(session.layout, session.assignments), mode = 'demo', running = false, accumulator = 0, lastTime = 0, tab = 'equipment', noticeTimer;
let pausedRun = null;
let equipmentColor = loadEquipmentColor(), previewGenerator;
const catalogInventory = Object.keys(EQUIPMENT_SHAPES).map(type=>({id:`catalog-${type}`,type}));
function renderPreviews() {
  if(!previewGenerator)return;
  const previews=previewGenerator(catalogInventory,equipmentColor);
  for(const img of document.querySelectorAll('[data-equipment-type]'))img.src=previews.get(img.dataset.equipmentType);
}
function applyEquipmentColor(value) {
  if(!/^#[0-9a-f]{6}$/i.test(value))return;
  equipmentColor=value; view?.setEquipmentColor(value); $('#equipment-color').value=value;saveEquipmentColor(value);
}
$('#equipment-color').value=equipmentColor;
$('#equipment-color').addEventListener('input',event=>applyEquipmentColor(event.target.value));
$('#equipment-color').addEventListener('change',renderPreviews);
for(const [name,color] of [['세이지','#788665'],['블루','#668ca7'],['크림','#c6bda8'],['코랄','#bd7b68'],['라벤더','#9389ae'],['차콜','#58646b']]) {
  const button=document.createElement('button');button.textContent=name;button.style.borderBottom=`5px solid ${color}`;button.addEventListener('click',()=>{applyEquipmentColor(color);renderPreviews();});$('#equipment-swatches').append(button);
}
for(const {type} of catalogInventory) {
  const spec=EQUIPMENT_SHAPES[type],card=document.createElement('article');
  const rows=spec.mask.map(row=>[...row]);while(rows.length<=spec.workCell[1])rows.push(Array(spec.width).fill('.'));rows[spec.workCell[1]][spec.workCell[0]]='W';
  card.innerHTML=`<h3>${spec.name}</h3><img data-equipment-type="${type}" alt="${spec.name} 모델"><small>${spec.width}×${spec.height} · ${spec.mask.join('').replaceAll('.','').length}칸 · ${spec.seconds}초</small><div class="shape-grid" style="grid-template-columns:repeat(${spec.width},22px)">${rows.flat().map(c=>`<span class="cell-${c==='.'?'empty':c==='O'?'output':c==='W'?'worker':'body'}">${c==='#'||c==='.'?'':c}</span>`).join('')}</div>`;
  $('#catalog-grid').append(card);
}
$('#options').addEventListener('click',()=>$('#options-dialog').showModal());
$('#options-close').addEventListener('click',()=>$('#options-dialog').close());
$('#catalog-open').addEventListener('click',()=>{$('#options-dialog').close();$('#catalog-dialog').showModal();});
$('#catalog-close').addEventListener('click',()=>$('#catalog-dialog').close());
const canEdit = () => ['edit', 'demo', 'run'].includes(mode);
const cardIndexes = { equipment: 0, workers: 0 };
const cleared = new Set(loadProgress());
const clearKey = `${STAGE.id}:sample:${STAGE.sampleCount}:rate:${STAGE.targetPerMinute}`;
function updateProduction() {
  $('#stage-goal').textContent = goalAchieved ? '목표 성공' : '목표 : 분당 ' + STAGE.targetPerMinute + '개 제작';
  $('#stage-goal').classList.toggle('achieved', goalAchieved);
  const current = mode === 'demo' && sim.averageProductionSeconds == null ? baseline : sim;
  if (current.averageProductionSeconds != null) lastMeasurement = { averageProductionSeconds: current.averageProductionSeconds, productionRate: current.productionRate };
  const measured = current.averageProductionSeconds != null ? current : lastMeasurement ?? current;
  $('#production-rate').textContent = `${measured.averageProductionSeconds == null ? '—' : measured.productionRate.toFixed(1)}개/분`;
  const average = measured.averageProductionSeconds == null ? '첫 입고 대기 중' : `평균 ${measured.averageProductionSeconds.toFixed(2)}초/개`;
  $('#production-rate').title = current === baseline ? `기본 배치 · ${average}` : mode === 'run' && !running ? `${average} · 일시정지 · 배치 수정 가능` : mode === 'edit' ? `첫 입고부터 최근 최대 ${STAGE.sampleCount}개의 평균으로 측정해요` : `${average} · 누적 ${sim.shipped}개`;
}
function notice(text, error = false) { clearTimeout(noticeTimer); $('#notice').textContent = text; $('#notice').classList.toggle('error', error); $('#notice').hidden = false; noticeTimer = setTimeout(() => $('#notice').hidden = true, error ? 6000 : 3400); }
function persist(record = true) {
  if (record && JSON.stringify(historyPresent) !== JSON.stringify(session)) {
    undoStack.push(historyPresent); if (undoStack.length > 50) undoStack.shift();
    redoStack.length = 0;
  }
  historyPresent = structuredClone(session);
  saveSession(session);
  if (mode === 'demo' || mode === 'run') {
    sim = reconfigureSimulation(sim, session.layout, session.assignments);
    mode = 'run';
    if (!running) pausedRun = { sim, layout: JSON.stringify(session), accumulator };
  }
}
const currentResult = () => draft && draft.x !== null ? transact(session, draft) : null;
const currentState = () => session;
const nameOf = id => id === 'outbound' ? '창고' : EQUIPMENT[session.layout.find(m => m.id === id)?.type]?.short ?? '미배치';
function refresh({ model = true } = {}) {
  const result = currentResult(), working = currentState();
  $('#onboarding').hidden = session.layout.length > 0 || !!draft || !canEdit();
  $('#context').hidden = !canEdit() || (!draft && !pendingWorker);
  $('#catalog-panel').hidden = !!draft || !!pendingWorker;
  $('#context').classList.toggle('machine-detail', !!draft || !!pendingWorker);
  $('#worker-guidance').hidden = !pendingWorker;
  $('#machine-stats').hidden = !draft;
  $('#undo').disabled = !undoStack.length; $('#redo').disabled = !redoStack.length;
  $('#machine-actions').hidden = !draft; $('#worker-actions').hidden = !pendingWorker;
  $('#run').innerHTML = icon(running ? 'pause' : 'play');
  $('#run').setAttribute('aria-label', running ? '일시정지' : '재생');
  $('#equipment-tab').disabled = !canEdit(); $('#workers-tab').disabled = !canEdit();
  for (const card of document.querySelectorAll('.supply-card')) {
    const id = card.dataset.supplyId, key = card.dataset.workerKey;
    card.classList.toggle('selected', id ? draft?.id === id : pendingWorker === key);
    const assigned = key ? session.assignments[key] : null, placed = id ? session.layout.find(m => m.id === id) : assigned;
    card.classList.toggle('placed', !!placed); card.disabled = !canEdit();
    card.querySelector('.card-state').textContent = id ? '' : assigned ? `${nameOf(assigned)} 담당` : '';
  }
  if (draft) {
    const item = suppliedEquipment(draft.id); $('#selected-name').textContent = EQUIPMENT[item.type].name;
    $('#placement-status').textContent = draft.x === null ? '바닥을 누르거나 위로 끌어 놓으세요' : result?.ok ? `${draft.rotation * 90}° · 배치 가능` : `${draft.rotation * 90}° · 간섭 — 위치나 방향을 바꿔 주세요`;
    $('#confirm').disabled = !result?.ok;
    $('#remove').hidden = !session.layout.some(m => m.id === draft.id);
  } else if (pendingWorker) { $('#selected-name').textContent = STAGE.workers.find(w => w.key === pendingWorker).name; $('#placement-status').textContent = '작업자 자리 선택'; $('#unassign').disabled = !session.assignments[pendingWorker]; }
  if (view && model) {
    view.setLayout(working.layout, selectedId, working.assignments, pendingWorker);
    if (mode === 'edit') sim = createLiveSimulation(working.layout, working.assignments);
    const given = draft && suppliedEquipment(draft.id);
    view.setPreview(draft && draft.x !== null ? { ...draft, type: given.type } : null, !!result?.ok);
  }
  updateProduction();
  updateEquipmentInfo();
  updateCards();
}
function updateEquipmentInfo() {
  if (!draft) return;
  const type = suppliedEquipment(draft.id).type;
  const recipe = recipeFor({ type }, STAGE), machine = sim.machines.find(m => m.id === draft.id);
  $('#machine-cycle').textContent = recipe.seconds + '초';
  $('#machine-average').textContent = machine?.completedCycles ? (machine.totalCycleSeconds / machine.completedCycles).toFixed(2) + '초' : '측정 중';
}
function commitDraft() {
  if (!draft) return true;
  const result = currentResult(); if (!result?.ok) { notice(result?.error ?? '설비를 놓을 위치를 선택해 주세요.', true); return false; }
  session = result.state; draft = null; selectedId = null; persist(); refresh(); return true;
}
function cancel() { draft = null; pendingWorker = null; selectedId = null; refresh(); }
function beginSupply(baseId) {
  let id = baseId, n = 1;
  while (session.layout.some(item => item.id === id)) id = `${baseId}-${n++}`;
  beginMachine(id);
}
function beginMachine(id) {
  if (!canEdit() || draft?.id === id) return;
  if (draft && !commitDraft()) return;
  pendingWorker = null; selectedId = id;
  const placed = session.layout.find(item => item.id === id);
  draft = { type: 'place', id, x: placed?.x ?? null, y: placed?.y ?? null, rotation: placed?.rotation ?? 0, follow: !placed }; refresh();
}
function chooseWorker(key) { if (!canEdit() || (draft && !commitDraft())) return; draft = null; selectedId = null; pendingWorker = key; setTab('workers'); refresh(); }
function moveDraft(cell) {
  if (!draft || !cell) return;
  const given = suppliedEquipment(draft.id), spec = EQUIPMENT[given.type], w = draft.rotation % 2 ? spec.height : spec.width, h = draft.rotation % 2 ? spec.width : spec.height;
  const x = cell.x - Math.floor(w / 2), y = cell.y - Math.floor(h / 2);
  if (draft.x === x && draft.y === y) return; Object.assign(draft, { x, y }); refresh();
}
function assign(workId) {
  if (!pendingWorker || !workId) { notice('작업대 또는 창고 앞의 한 칸을 선택하세요.', true); return; }
  const result = transact(session, { type: 'assign', workerId: pendingWorker, machineId: workId });
  if (!result.ok) { notice(result.error, true); return; }
  session = result.state; pendingWorker = null; persist(); refresh();
}
function pick(hit) {
  if (!canEdit()) return;
  if (pendingWorker) { assign(hit.workId ?? (hit.fixedId === 'outbound' ? 'outbound' : null)); return; }
  if (draft) { moveDraft(hit.cell); draft.follow = false; return; }
  if (hit.id) beginMachine(hit.id);
  else if (hit.workId) { const key = Object.keys(session.assignments).find(key => session.assignments[key] === hit.workId); if (key) chooseWorker(key); else { setTab('workers'); notice('아래 작업자를 고른 뒤 이 자리에 배치하세요.'); } }
}
function availableCards(name) {
  return [...$('#'+name+'-list').querySelectorAll('.supply-card')].filter(card => name !== 'workers' || !currentState().assignments[card.dataset.workerKey]);
}
function updateCards() {
  for (const name of ['equipment', 'workers']) {
    const cards = availableCards(name);
    cardIndexes[name] = Math.max(0, Math.min(cardIndexes[name], cards.length - 1));
    for (const card of $('#'+name+'-list').querySelectorAll('.supply-card')) card.hidden = card !== cards[cardIndexes[name]];
  }
  const count = availableCards(tab).length;
  $('#workers-empty').hidden = availableCards('workers').length > 0;
  $('#previous').disabled = !canEdit() || count < 2 || (tab === 'equipment' && cardIndexes[tab] === 0);
  $('#next').disabled = !canEdit() || count < 2 || (tab === 'equipment' && cardIndexes[tab] === count - 1);
}
function turnCard(direction) {
  if (!canEdit()) return;
  const count = availableCards(tab).length;
  if (!count) return;
  cardIndexes[tab] = tab === 'workers' ? (cardIndexes[tab] + direction + count) % count : Math.max(0, Math.min(count - 1, cardIndexes[tab] + direction));
  updateCards();
}
function setTab(name) {
  tab = name; for (const other of ['equipment', 'workers']) { const active = name === other; $('#'+other+'-tab').setAttribute('aria-selected', String(active)); $('#'+other+'-list').hidden = !active; }
  updateCards();
}
const itemSymbols = Object.fromEntries(['timber', 'parts', 'crate', 'finished'].map(name => [name, icon(name)]));
for (const given of STAGE.inventory) {
  const spec = EQUIPMENT[given.type], card = document.createElement('button'); card.type = 'button'; card.className = 'supply-card'; card.dataset.supplyId = given.id; card.setAttribute('aria-label', `${spec.name} 선택`); card.style.setProperty('--machine-color', spec.color);
  card.innerHTML = `<span class="card-heading"><b>${spec.name} · ${spec.seconds}초</b><small class="card-state" hidden></small></span><span class="recipe"><span class="ingredient"><b>${itemSymbols[spec.input]}</b>${PRODUCTS[spec.input]}</span><span class="arrow">→</span><img class="machine-preview" data-equipment-type="${given.type}" alt="${spec.name} 3D 모델" draggable="false"><span class="arrow">→</span><span class="ingredient"><b>${itemSymbols[spec.output]}</b>${PRODUCTS[spec.output]}</span></span>`;
  card.addEventListener('click', () => { if (performance.now() > suppressClickUntil) beginSupply(given.id); }); $('#equipment-list').append(card);
}
for (const worker of STAGE.workers) {
  const card = document.createElement('button'); card.type = 'button'; card.className = 'supply-card worker'; card.dataset.workerKey = worker.key; card.setAttribute('aria-label', `${worker.name} 작업자 선택`); card.style.setProperty('--worker-color', worker.color);
  card.innerHTML = `<span class="card-heading"><b>${worker.name}</b><small class="card-state" hidden></small></span><span class="worker-body"><img class="worker-portrait" data-worker-portrait="${worker.key}" alt="${worker.name} 실제 모델 얼굴" draggable="false"><span>${worker.trait}<small>작업대 또는 창고에 배치</small></span></span>`;
  card.addEventListener('click', () => { if (performance.now() > suppressClickUntil) chooseWorker(worker.key); }); $('#workers-list').append(card);
}
// Vertical drag places; a horizontal swipe turns exactly one card. Pointer capture keeps drops reliable on touch.
let gesture = null, suppressClickUntil = 0;
for (const card of document.querySelectorAll('.supply-card')) card.addEventListener('pointerdown', event => {
  if (!canEdit() || event.button > 0) return;
  suppressClickUntil = 0;
  gesture = { card, pointerId: event.pointerId, x: event.clientX, y: event.clientY, kind: null }; card.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (!gesture.kind && Math.hypot(dx, dy) > 9) {
    gesture.kind = Math.abs(dx) > Math.abs(dy) ? 'scroll' : 'place';
    if (gesture.kind === 'place') { if (gesture.card.dataset.supplyId) beginSupply(gesture.card.dataset.supplyId); else chooseWorker(gesture.card.dataset.workerKey); }
  }
  if (gesture.kind === 'scroll') event.preventDefault();
  if (gesture.kind === 'place') { event.preventDefault(); if (draft) moveDraft(view?.pickAt(event.clientX, event.clientY).cell); }
}, { passive: false });
document.addEventListener('pointerup', event => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  const active = gesture; gesture = null;
  if (draft && active.kind === 'place') draft.follow = false;
  if (!active.kind) return; suppressClickUntil = performance.now() + 500;
  if (active.kind === 'scroll') { const dx = event.clientX - active.x; if (Math.abs(dx) >= 32) turnCard(dx < 0 ? 1 : -1); return; }
  if (active.kind === 'place' && event.clientY < $('.tray').getBoundingClientRect().top) {
    if (pendingWorker) { const hit = view.pickAt(event.clientX, event.clientY); assign(hit.workId); }
    else if (draft && !currentResult()?.ok) notice(currentResult()?.error ?? '부지 위에 놓아 주세요.', true);
  } else if (active.kind === 'place') cancel();
});
document.addEventListener('pointercancel', () => { if (gesture?.kind === 'place') cancel(); gesture = null; });
function finish() {
  if(sim.outcome !== 'success') { running=false;edit();if(sim.reason)notice(sim.reason,true);return; }
  goalAchieved=true;mode='run';refresh({model:false});cleared.add(clearKey);saveProgress([...cleared]);
  $('#result-icon').textContent='✦';$('#result-title').textContent='생산 목표 달성!';
  $('#result-copy').textContent=`최근 ${STAGE.sampleCount}개 제작 ${(sim.averageProductionSeconds * STAGE.sampleCount).toFixed(1)}초 · 평균 ${sim.averageProductionSeconds.toFixed(2)}초/개. 분당 ${sim.productionRate.toFixed(1)}개 생산!`;
  $('#result-note').textContent='목표 달성 후에도 공장은 계속 가동됩니다.';$('#result-dialog').showModal();
}
function start() {
  if (!view) return;
  if (mode === 'demo') { mode = 'run'; pauseRun(); return; }
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
function edit() { pausedRun = null; mode = 'edit'; running = false; accumulator = 0; draft = null; pendingWorker = null; selectedId = null; refresh(); }
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
$('#confirm').addEventListener('click', commitDraft); $('#cancel').addEventListener('click', cancel); $('#worker-cancel').addEventListener('click', cancel);
$('#rotate').addEventListener('click', () => { if (draft) { draft.rotation = (draft.rotation + 1) % 4; refresh(); } });
$('#remove').addEventListener('click', () => { if (!draft) return; const result = transact(session, { type: 'remove', id: draft.id }); if (result.ok) { session = result.state; persist(); cancel(); } });
$('#unassign').addEventListener('click', () => { const result = transact(session, { type: 'assign', workerId: pendingWorker, machineId: null }); if (result.ok) { session = result.state; persist(); cancel(); } });
for (const name of ['equipment', 'workers']) $('#'+name+'-tab').addEventListener('click', () => { if (draft && !commitDraft()) return; pendingWorker = null; setTab(name); refresh(); });
for (const [id, direction] of [['previous', -1], ['next', 1]]) $('#'+id).addEventListener('click', () => { turnCard(direction); });
$('#fit-view').addEventListener('click', () => view?.fit()); $('#retry').addEventListener('click', () => $('#result-dialog').close());
$('#result-list').addEventListener('click', () => { location.href = stageUrl(); });
$('#map-exit').addEventListener('click', () => { saveSession(session); location.href = stageUrl(); });
$('#map-home').addEventListener('click', () => { location.href = stageUrl(); });
const nextStage = STAGES[STAGES.findIndex(stage => stage.id === STAGE.id) + 1];
$('#next-stage').disabled = !nextStage; $('#next-stage').title = nextStage ? nextStage.name : '마지막 샘플 스테이지입니다';
$('#next-stage').addEventListener('click', () => { if (nextStage) location.href = stageUrl(nextStage.id); });
$('#stage-list-close').addEventListener('click', () => $('#stage-list-dialog').close());
for (const stage of STAGES) {
  const button = document.createElement('button'); button.textContent = String(stage.number).padStart(2, '0') + ' · ' + stage.name;
  button.addEventListener('click', () => { location.href = stageUrl(stage.id); }); $('#stage-list').append(button);
}
$('#help').addEventListener('click', () => { $('#options-dialog').close(); $('#help-dialog').showModal(); }); $('#help-close').addEventListener('click', () => $('#help-dialog').close());
$('#options-reset').addEventListener('click', () => { $('#options-dialog').close(); $('#reset-dialog').showModal(); });
$('#reset').addEventListener('click', () => { $('#help-dialog').close(); $('#reset-dialog').showModal(); }); $('#reset-cancel').addEventListener('click', () => $('#reset-dialog').close());
$('#reset-confirm').addEventListener('click', () => { session = createSession(); undoStack.length = redoStack.length = 0; historyPresent = structuredClone(session); goalAchieved = false; lastMeasurement = null; $('#reset-dialog').close(); mode = 'edit'; persist(); edit(); setTab('equipment'); });
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if ((event.ctrlKey || event.metaKey) && !event.target.closest('input,textarea,select') && ['z', 'y'].includes(event.key.toLowerCase())) {
    event.preventDefault(); restoreHistory(event.key.toLowerCase() === 'y' || event.shiftKey ? 'redo' : 'undo'); return;
  }
  if (event.target.closest('.tray') && ['ArrowLeft', 'ArrowRight'].includes(event.key)) { event.preventDefault(); turnCard(event.key === 'ArrowLeft' ? -1 : 1); $('#'+tab+'-list').querySelector('.supply-card:not([hidden])')?.focus(); return; }
  if (event.key === 'Escape') { cancel(); return; }
  if (event.target.closest('input,textarea,select')) return; if (event.key.toLowerCase() === 'r' && draft) $('#rotate').click(); if (event.code === 'Space' && !event.target.closest('button')) { event.preventDefault(); start(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && running) { if (mode === 'run') pauseRun(); else { running = false; refresh({ model: false }); } } lastTime = 0; });
async function boot() {
  try {
    const { createFactoryView } = await import('./view/factory.js');
    const { createEquipmentPreviews } = await import('./view/equipment-previews.js');
    const { createWorkerPreviews } = await import('./view/worker-previews.js');
    const portraits = createWorkerPreviews(STAGE.workers);
    for(const img of document.querySelectorAll('[data-worker-portrait]')) img.src=portraits.get(img.dataset.workerPortrait);
    previewGenerator = createEquipmentPreviews; renderPreviews();
    view = createFactoryView($('#scene'), { onPick: pick, onHover: cell => { if (draft?.follow && !gesture) moveDraft(cell); }, canPan: () => !draft && !pendingWorker, onContextLost: () => { running = false; notice('3D 연결이 끊겼어요. 새로고침하면 저장한 배치를 복원합니다.', true); } }, STAGE);
    view.setEquipmentColor(equipmentColor);
    sim = createLiveSimulation(session.layout, session.assignments);
    for (let i = 0; i < 30; i++) stepSimulation(sim);
    running = true;
    $('#loading').remove(); $('#scene').dataset.ready = 'true'; $('#run').disabled = false; refresh();
    // Read-only diagnostics for authoring and browser QA; no solution or mutating hook is exposed.
    window.factoryFit = Object.freeze({ snapshot: () => structuredClone({ session, simulationLayout: sim.layout, machines: sim.machines, preview: view.inspectPreview(), mode, outcome: sim.outcome, shipped: sim.shipped, productionRate: sim.productionRate, averageProductionSeconds: sim.averageProductionSeconds, shipmentTimes: sim.shipmentTimes, targetPerMinute: STAGE.targetPerMinute, time: sim.time, running, reason: sim.reason, draft }), projectCell: (x, y) => view.projectCell({ x, y }) });
    function frame(now) {
      const elapsed = lastTime ? Math.min(.15, (now - lastTime) / 1000) : 0; lastTime = now;
      if (running) { accumulator += elapsed; while (accumulator >= DT && (!sim.complete || sim.outcome === 'success')) { stepSimulation(sim); accumulator -= DT; } if (sim.complete && (sim.outcome !== 'success' || !goalAchieved)) finish(); updateProduction(); }
      view.update(sim, running ? accumulator / DT : 1, now / 1000, !running && canEdit()); updateEquipmentInfo(); view.render(); requestAnimationFrame(frame);
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

window.addEventListener("factory-fit-site-exit", () => saveSession(session));
