import { STAGE, EQUIPMENT, PRODUCTS } from './game/config.js';
import { transact, createSession } from './game/session.js';
import { createSimulation, stepSimulation, validateRun, DT } from './game/simulation.js';
import { loadSession, saveSession, loadProgress, saveProgress } from './platform/storage.js';
const $ = selector => document.querySelector(selector);
let session = loadSession() ?? createSession(), draft = null, pendingWorker = null, selectedId = null, view;
let sim = createSimulation(session.layout, session.assignments), mode = 'edit', running = false, accumulator = 0, lastTime = 0, tab = 'equipment', noticeTimer;
const cleared = new Set(loadProgress());
function notice(text, error = false) { clearTimeout(noticeTimer); $('#notice').textContent = text; $('#notice').classList.toggle('error', error); $('#notice').hidden = false; noticeTimer = setTimeout(() => $('#notice').hidden = true, error ? 6000 : 3400); }
function persist() { $('#save-status').textContent = saveSession(session) ? '배치를 저장했어요 · 설비 3대와 직원 4명' : '이 세션에서 배치를 유지해요'; }
const currentResult = () => draft && draft.x !== null ? transact(session, draft) : null;
const currentState = () => currentResult()?.state ?? session;
const nameOf = id => id === 'outbound' ? '창고' : EQUIPMENT[session.layout.find(m => m.id === id)?.type]?.short ?? '미배치';
function refresh({ model = true } = {}) {
  const result = currentResult(), working = currentState();
  $('#onboarding').hidden = session.layout.length > 0 || !!draft || mode !== 'edit';
  $('#equipment-count').textContent = `${session.layout.length}/${STAGE.inventory.length}`;
  $('#workers-count').textContent = `${Object.values(session.assignments).filter(Boolean).length}/${STAGE.workers.length}`;
  $('#context').hidden = mode !== 'edit' || (!draft && !pendingWorker);
  $('#machine-actions').hidden = !draft; $('#worker-actions').hidden = !pendingWorker;
  $('#run').textContent = mode === 'edit' ? '▶ 공장 가동' : mode === 'complete' ? '↻ 다시 가동' : running ? 'Ⅱ 일시정지' : '▶ 계속 가동';
  $('#edit').hidden = mode === 'edit';
  $('#mode-label').textContent = mode === 'edit' ? cleared.has(STAGE.id) ? '클리어 · 다시 배치해도 좋아요' : '제품 한 개를 완성해요' : mode === 'complete' ? sim.outcome === 'success' ? '스테이지 클리어' : '배치를 고쳐 보세요' : running ? '직원들이 일하고 있어요' : '가동 일시정지';
  $('#equipment-tab').disabled = mode !== 'edit'; $('#workers-tab').disabled = mode !== 'edit';
  for (const card of document.querySelectorAll('.supply-card')) {
    const id = card.dataset.supplyId, key = card.dataset.workerKey;
    card.classList.toggle('selected', id ? draft?.id === id : pendingWorker === key);
    const assigned = key ? session.assignments[key] : null, placed = id ? session.layout.find(m => m.id === id) : assigned;
    card.classList.toggle('placed', !!placed); card.disabled = mode !== 'edit';
    card.querySelector('.card-state').textContent = id ? placed ? '배치됨 · 선택해 수정' : '지급 1대' : assigned ? `${nameOf(assigned)} 담당` : '미배치';
  }
  if (draft) {
    const item = STAGE.inventory.find(m => m.id === draft.id); $('#selected-name').textContent = EQUIPMENT[item.type].name;
    $('#placement-status').textContent = draft.x === null ? '바닥을 누르거나 위로 끌어 놓으세요' : result?.ok ? `${draft.rotation * 90}° · 배치 가능` : '놓을 수 없는 위치';
    $('#confirm').disabled = !result?.ok;
    $('#remove').hidden = !session.layout.some(m => m.id === draft.id);
  } else if (pendingWorker) { $('#selected-name').textContent = STAGE.workers.find(w => w.key === pendingWorker).name; $('#placement-status').textContent = '작업자 자리 선택'; $('#unassign').disabled = !session.assignments[pendingWorker]; }
  if (view && model) {
    view.setLayout(working.layout, selectedId, working.assignments, pendingWorker);
    if (mode === 'edit') sim = createSimulation(working.layout, working.assignments);
    const given = draft && STAGE.inventory.find(m => m.id === draft.id);
    view.setPreview(draft?.x !== null && draft && !result?.ok ? { ...draft, type: given.type } : null, false);
  }
}
function commitDraft() {
  if (!draft) return true;
  const result = currentResult(); if (!result?.ok) { notice(result?.error ?? '설비를 놓을 위치를 선택해 주세요.', true); return false; }
  session = result.state; draft = null; selectedId = null; persist(); refresh(); return true;
}
function cancel() { draft = null; pendingWorker = null; selectedId = null; refresh(); }
function beginMachine(id) {
  if (mode !== 'edit' || draft?.id === id) return;
  if (draft && !commitDraft()) return;
  pendingWorker = null; selectedId = id;
  const placed = session.layout.find(item => item.id === id);
  draft = { type: 'place', id, x: placed?.x ?? null, y: placed?.y ?? null, rotation: placed?.rotation ?? 0, follow: !placed }; refresh();
}
function chooseWorker(key) { if (mode !== 'edit' || (draft && !commitDraft())) return; draft = null; selectedId = null; pendingWorker = key; setTab('workers'); refresh(); }
function moveDraft(cell) {
  if (!draft || !cell) return;
  const given = STAGE.inventory.find(m => m.id === draft.id), spec = EQUIPMENT[given.type], w = draft.rotation % 2 ? spec.height : spec.width, h = draft.rotation % 2 ? spec.width : spec.height;
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
  if (mode !== 'edit') return;
  if (pendingWorker) { assign(hit.workId ?? (hit.fixedId === 'outbound' ? 'outbound' : null)); return; }
  if (draft) { moveDraft(hit.cell); draft.follow = false; return; }
  if (hit.id) beginMachine(hit.id);
  else if (hit.workId) { setTab('workers'); notice('아래 작업자를 고른 뒤 이 자리에 배치하세요.'); }
}
function setTab(name) {
  tab = name; for (const other of ['equipment', 'workers']) { const active = name === other; $('#'+other+'-tab').setAttribute('aria-selected', String(active)); $('#'+other+'-list').hidden = !active; }
  $('#tray-hint').textContent = name === 'equipment' ? '위로 끌어 배치' : '직접 자리에 배치';
}
const itemSymbols = { timber: '▰', parts: '▤', crate: '▢', finished: '▣' };
for (const given of STAGE.inventory) {
  const spec = EQUIPMENT[given.type], card = document.createElement('button'); card.type = 'button'; card.className = 'supply-card'; card.dataset.supplyId = given.id; card.setAttribute('aria-label', `${spec.name} 선택`); card.style.setProperty('--machine-color', spec.color);
  card.innerHTML = `<span class="card-heading"><b>${spec.name}</b><small class="card-state">지급 1대</small></span><span class="recipe"><span class="ingredient"><b>${itemSymbols[spec.input]}</b>${PRODUCTS[spec.input]}</span><span class="arrow">→</span><span class="machine-icon">${given.type === 'cutter' ? '◐' : given.type === 'assembly' ? '▤' : '▣'}</span><span class="arrow">→</span><span class="ingredient"><b>${itemSymbols[spec.output]}</b>${PRODUCTS[spec.output]}</span></span>`;
  card.addEventListener('click', () => { if (performance.now() > suppressClickUntil) beginMachine(given.id); }); $('#equipment-list').append(card);
}
for (const worker of STAGE.workers) {
  const card = document.createElement('button'); card.type = 'button'; card.className = 'supply-card worker'; card.dataset.workerKey = worker.key; card.setAttribute('aria-label', `${worker.name} 작업자 선택`); card.style.setProperty('--worker-color', worker.color);
  card.innerHTML = `<span class="card-heading"><b>${worker.name}</b><small class="card-state">미배치</small></span><span class="worker-body"><i class="worker-avatar"></i><span>${worker.trait}<small>작업대 또는 창고에 배치</small></span></span>`;
  card.addEventListener('click', () => { if (performance.now() > suppressClickUntil) chooseWorker(worker.key); }); $('#workers-list').append(card);
}
// Vertical drag places; horizontal drag browses. Pointer capture keeps drops reliable on touch.
let gesture = null, suppressClickUntil = 0;
for (const card of document.querySelectorAll('.supply-card')) card.addEventListener('pointerdown', event => {
  if (mode !== 'edit' || event.button > 0) return;
  suppressClickUntil = 0;
  gesture = { card, pointerId: event.pointerId, x: event.clientX, y: event.clientY, scroll: card.parentElement.scrollLeft, kind: null }; card.setPointerCapture(event.pointerId);
});
document.addEventListener('pointermove', event => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
  if (!gesture.kind && Math.hypot(dx, dy) > 9) {
    gesture.kind = Math.abs(dx) > Math.abs(dy) ? 'scroll' : 'place';
    if (gesture.kind === 'place') { if (gesture.card.dataset.supplyId) beginMachine(gesture.card.dataset.supplyId); else chooseWorker(gesture.card.dataset.workerKey); }
  }
  if (gesture.kind === 'scroll') gesture.card.parentElement.scrollLeft = gesture.scroll - dx;
  if (gesture.kind === 'place') { event.preventDefault(); if (draft) moveDraft(view?.pickAt(event.clientX, event.clientY).cell); }
}, { passive: false });
document.addEventListener('pointerup', event => {
  if (!gesture || gesture.pointerId !== event.pointerId) return;
  const active = gesture; gesture = null;
  if (draft && active.kind === 'place') draft.follow = false;
  if (!active.kind) return; suppressClickUntil = performance.now() + 500;
  if (active.kind === 'place' && event.clientY < $('.tray').getBoundingClientRect().top) {
    if (pendingWorker) { const hit = view.pickAt(event.clientX, event.clientY); assign(hit.workId); }
    else if (draft && !currentResult()?.ok) notice(currentResult()?.error ?? '부지 위에 놓아 주세요.', true);
  } else if (active.kind === 'place') cancel();
});
document.addEventListener('pointercancel', () => { if (gesture?.kind === 'place') cancel(); gesture = null; });
function finish() {
  running = false; mode = 'complete'; refresh({ model: false });
  const success = sim.outcome === 'success'; if (success) { cleared.add(STAGE.id); saveProgress([...cleared]); }
  $('#result-icon').textContent = success ? '✦' : '↗'; $('#result-title').textContent = success ? '첫 제품 완성!' : '제품을 생산할 수 없습니다';
  $('#result-copy').textContent = success ? '직원들이 세 공정을 거쳐 완제품 한 개를 창고에 넣었어요. 첫 스테이지 클리어!' : sim.reason;
  $('#retry').textContent = success ? '내 배치 다시 보기' : '배치 고치기'; $('#result-note').textContent = success ? '현재 샘플은 스테이지 1을 제공합니다.' : '배치는 그대로 유지됩니다.'; $('#result-dialog').showModal();
}
function start() {
  if (!view) return;
  if (mode === 'run') { running = !running; refresh({ model: false }); return; }
  if (draft && !commitDraft()) return;
  pendingWorker = null; selectedId = null; sim = createSimulation(session.layout, session.assignments); accumulator = 0;
  const check = validateRun(session.layout, session.assignments);
  if (!check.valid) { sim.complete = true; sim.outcome = 'failure'; sim.reason = check.errors[0]; finish(); return; }
  mode = 'run'; running = true; refresh();
}
function edit() { mode = 'edit'; running = false; accumulator = 0; draft = null; pendingWorker = null; selectedId = null; refresh(); }
$('#run').addEventListener('click', start); $('#edit').addEventListener('click', edit);
$('#confirm').addEventListener('click', commitDraft); $('#cancel').addEventListener('click', cancel); $('#worker-cancel').addEventListener('click', cancel);
$('#rotate').addEventListener('click', () => { if (draft) { draft.rotation = (draft.rotation + 1) % 4; refresh(); } });
$('#remove').addEventListener('click', () => { if (!draft) return; const result = transact(session, { type: 'remove', id: draft.id }); if (result.ok) { session = result.state; persist(); cancel(); } });
$('#unassign').addEventListener('click', () => { const result = transact(session, { type: 'assign', workerId: pendingWorker, machineId: null }); if (result.ok) { session = result.state; persist(); cancel(); } });
for (const name of ['equipment', 'workers']) $('#'+name+'-tab').addEventListener('click', () => { if (draft && !commitDraft()) return; pendingWorker = null; setTab(name); refresh(); });
for (const [id, direction] of [['previous', -1], ['next', 1]]) $('#'+id).addEventListener('click', () => { const list = $('#'+tab+'-list'); list.scrollBy({ left: direction * list.clientWidth * .8, behavior: 'smooth' }); });
$('#fit-view').addEventListener('click', () => view?.fit()); $('#retry').addEventListener('click', () => { $('#result-dialog').close(); edit(); });
$('#help').addEventListener('click', () => $('#help-dialog').showModal()); $('#help-close').addEventListener('click', () => $('#help-dialog').close());
$('#reset').addEventListener('click', () => { $('#help-dialog').close(); $('#reset-dialog').showModal(); }); $('#reset-cancel').addEventListener('click', () => $('#reset-dialog').close());
$('#reset-confirm').addEventListener('click', () => { session = createSession(); $('#reset-dialog').close(); persist(); edit(); setTab('equipment'); });
document.addEventListener('keydown', event => {
  if (document.querySelector('dialog[open]')) return;
  if (event.key === 'Escape') { cancel(); return; }
  if (event.target.closest('input,textarea,select')) return; if (event.key.toLowerCase() === 'r' && draft) $('#rotate').click(); if (event.code === 'Space' && !event.target.closest('button')) { event.preventDefault(); start(); }
});
document.addEventListener('visibilitychange', () => { if (document.hidden && running) { running = false; refresh({ model: false }); } lastTime = 0; });
async function boot() {
  try {
    const { createFactoryView } = await import('./view/factory.js');
    view = createFactoryView($('#scene'), { onPick: pick, onHover: cell => { if (draft?.follow && !gesture) moveDraft(cell); }, canPan: () => !draft && !pendingWorker, onContextLost: () => { running = false; notice('3D 연결이 끊겼어요. 새로고침하면 저장한 배치를 복원합니다.', true); } });
    $('#loading').remove(); $('#scene').dataset.ready = 'true'; $('#run').disabled = false; refresh();
    // Read-only diagnostics for authoring and browser QA; no solution or mutating hook is exposed.
    window.factoryFit = Object.freeze({ snapshot: () => structuredClone({ session, mode, outcome: sim.outcome, shipped: sim.shipped, time: sim.time, running, reason: sim.reason, draft }), projectCell: (x, y) => view.projectCell({ x, y }) });
    function frame(now) {
      const elapsed = lastTime ? Math.min(.15, (now - lastTime) / 1000) : 0; lastTime = now;
      if (running) { accumulator += elapsed; while (accumulator >= DT && !sim.complete) { stepSimulation(sim); accumulator -= DT; } if (sim.complete) finish(); }
      view.update(sim, running ? accumulator / DT : 1, now / 1000); view.render(); requestAnimationFrame(frame);
    } requestAnimationFrame(frame);
  } catch (error) { const el = $('#loading') ?? $('#notice'); el.hidden = false; el.classList.add('error'); el.textContent = '3D 화면을 열지 못했어요. 페이지를 새로고침해 주세요.'; console.error(error); }
}
refresh(); boot();

// Preserve the editable layout before an explicit return to the hosting site.
window.addEventListener("factory-fit-site-exit", () => { running = false; persist(); });
