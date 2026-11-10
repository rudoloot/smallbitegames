import { EQUIPMENT, STAGE, TYPES, FIXED, WORKERS, WAREHOUSE, createDefaultLayout } from './game/config.js';
import { validateLayout } from './game/layout.js';
import { createSession, transact, validateStaffing } from './game/session.js';
import { createSimulation, stepSimulation, runSimulation, summarize, DT } from './game/simulation.js';
import { loadSession, saveSession } from './platform/storage.js';

const $ = selector => document.querySelector(selector);
let session = loadSession() ?? createSession();
let selectedId = null, placement = null, running = false, mode = 'edit', speed = 1, accumulator = 0, lastTime = 0, heatVisible = false;
let sim = createSimulation(session.layout, session.assignments), view, pendingWorker = null, noticeTimer;
const baseline = summarize(runSimulation(createDefaultLayout()));
$('#baseline').textContent = baseline.shipped;
$('#goal').textContent = STAGE.goal; $('#mission-goal').textContent = `${STAGE.goal}개`;
const notice = (text, error = false) => {
  clearTimeout(noticeTimer); $('#notice').textContent = text; $('#notice').classList.toggle('error', error); $('#notice').hidden = false;
  noticeTimer = setTimeout(() => { $('#notice').hidden = true; }, error ? 6500 : 4200);
};
const selected = () => selectedId === WAREHOUSE.id ? { ...WAREHOUSE, type: 'warehouse', rotation: 0, fixed: true } : session.layout.find(item => item.id === selectedId);
const workplaceName = id => id === WAREHOUSE.id ? '완제품 창고' : EQUIPMENT[session.layout.find(machine => machine.id === id)?.type]?.name ?? '미배치';
function closeDrawer() { $('#drawer').hidden = true; for (const name of ['equipment', 'workers', 'mission']) $('#'+name+'-open').setAttribute('aria-expanded', 'false'); }
function openDrawer(name) {
  $('#drawer').hidden = false;
  for (const other of ['equipment', 'workers', 'mission']) {
    const active = name === other;
    $('#'+other+'-panel').hidden = !active;
    $('#'+other+'-tab').classList.toggle('active', active);
    $('#'+other+'-tab').setAttribute('aria-pressed', String(active));
    $('#'+other+'-open').setAttribute('aria-expanded', String(active));
  }
}
function cancelPlacement() { placement = null; pendingWorker = null; refreshInspector(); preview(); }

const icons = ['▥', '▤', '◩', '▣'];
for (const [index, type] of TYPES.entries()) {
  const spec = EQUIPMENT[type], button = document.createElement('button');
  button.className = 'shop-card'; button.dataset.buy = type;
  button.setAttribute('aria-label', `${spec.name} 구매 ${spec.price} G`);
  button.style.setProperty('--color', spec.color); button.style.setProperty('--tint', `${spec.color}20`);
  button.innerHTML = `<span class="shop-icon" aria-hidden="true">${icons[index]}</span><span class="shop-name">${spec.name}<small>${spec.width} × ${spec.height}타일 · ${spec.seconds}초</small></span><span class="shop-price">${spec.price}<small>G</small><b>+</b></span>`;
  button.addEventListener('click', () => {
    if (mode !== 'edit') return;
    selectedId = null; pendingWorker = null; placement = { type: 'buy', equipment: type, rotation: 0, x: 5, y: 5 }; closeDrawer();
    refreshInspector(); preview(); notice(`${spec.name}를 놓을 바닥을 선택하세요. 유효한 위치에 배치할 때 ${spec.price} G가 결제됩니다.`);
  });
  $('#shop').append(button);
}
for (const type of TYPES) {
  const cell = document.createElement('div'); cell.className = 'process-cell'; cell.dataset.process = type;
  cell.innerHTML = `<h3>${EQUIPMENT[type].short}</h3><small>재료 0 · 완성 0</small><div class="mini-track"><i></i></div>`; $('#process').append(cell);
}
for (const worker of sim.workers) {
  const card = document.createElement('div'); card.className = 'worker-card'; card.dataset.worker = worker.id;
  card.innerHTML = `<h3><i class="worker-dot" style="background:${worker.color}"></i>${worker.name}<small>${worker.trait}</small></h3><p>작업 준비</p><small class="worker-metrics">이동 0초 · 혼잡 0초</small><div class="worker-actions"><button data-place-worker="${worker.key}">자리 선택</button><button data-unassign-worker="${worker.key}">배치 해제</button></div>`;
  card.querySelector('[data-place-worker]').addEventListener('click', () => {
    if (mode !== 'edit') return;
    pendingWorker = worker.key; selectedId = null; placement = null; closeDrawer(); refreshInspector(); preview();
    notice(`${worker.name}를 배치할 작업대 또는 창고 앞 한 칸을 누르세요.`);
  });
  card.querySelector('[data-unassign-worker]').addEventListener('click', () => apply({ type: 'assign', workerId: worker.key, machineId: null }));
  $('#workers').append(card);
}

function refreshInspector() {
  const item = selected(), spec = item?.fixed ? { name: WAREHOUSE.label, width: WAREHOUSE.width, height: WAREHOUSE.height } : item ? EQUIPMENT[item.type] : placement?.type === 'buy' ? EQUIPMENT[placement.equipment] : null;
  $('#context-menu').hidden = !item && !placement;
  $('#budget').innerHTML = `${session.budget.toLocaleString()} <small>G</small>`;
  $('#selected-name').textContent = spec ? `${spec.name}${placement?.type === 'buy' ? ' 구매' : ''}` : '설비를 선택하세요';
  $('#selected-badge').textContent = item?.fixed ? '고정 시설' : placement ? '배치 중' : item ? `${item.id.toUpperCase()} · ${item.rotation * 90}°` : '배치 준비';
  $('#selection-info').textContent = item?.fixed ? '창고 직원이 포장대 위의 완제품을 가져와 보관합니다.' : spec ? `${spec.width} × ${spec.height}타일 · 작업자 자리 1칸 · ${item ? `판매 ${item.paid} G` : `구매 ${spec.price} G`}` : '';
  $('.selection-actions').hidden = !!item?.fixed;
  const operatorSelect = $('#operator-select'); operatorSelect.replaceChildren();
  const empty = document.createElement('option'); empty.value = ''; empty.textContent = '미배치 · 가동 중지'; operatorSelect.append(empty);
  for (const worker of WORKERS) {
    const option = document.createElement('option'); option.value = worker.key;
    const assignedId = session.assignments[worker.key];
    option.textContent = `${worker.name}${assignedId && assignedId !== item?.id ? ` · ${workplaceName(assignedId)}에서 이동` : ''}`; operatorSelect.append(option);
  }
  operatorSelect.value = item ? WORKERS.find(worker => session.assignments[worker.key] === item.id)?.key ?? '' : '';
  operatorSelect.disabled = !item || mode !== 'edit' || !!placement;
  const select = $('#machine-select'); select.replaceChildren();
  const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = '배치된 설비 선택'; select.append(placeholder);
  for (const machine of session.layout) { const option = document.createElement('option'); option.value = machine.id; option.textContent = `${machine.id.toUpperCase()} · ${EQUIPMENT[machine.type].name} (${machine.x + 1}열 ${machine.y + 1}행)`; select.append(option); }
  const warehouseOption = document.createElement('option'); warehouseOption.value = WAREHOUSE.id; warehouseOption.textContent = '완제품 창고 · 고정'; select.append(warehouseOption);
  select.value = item?.id ?? ''; select.disabled = mode !== 'edit';
  $('#move').disabled = !item || item.fixed || mode !== 'edit' || !!placement;
  $('#rotate').disabled = item?.fixed || mode !== 'edit' || (!item && !placement);
  $('#sell').disabled = !item || item.fixed || mode !== 'edit' || !!placement;
  $('#sell').textContent = item && !item.fixed ? `판매 +${item.paid} G` : '판매';
  $('#placement-form').hidden = !placement || mode !== 'edit';
  if (placement) { $('#place-x').value = placement.x + 1; $('#place-y').value = placement.y + 1; $('#rotation-value').textContent = `${placement.rotation * 90}°`; }
  for (const button of document.querySelectorAll('[data-buy]')) button.disabled = mode !== 'edit' || session.budget < EQUIPMENT[button.dataset.buy].price || session.layout.length >= STAGE.maxMachines;
  $('#edit').disabled = mode === 'edit'; $('#reset').disabled = mode !== 'edit';
  $('#edit').hidden = mode === 'edit';
  for (const button of document.querySelectorAll('[data-place-worker],[data-unassign-worker]')) button.disabled = mode !== 'edit' || (button.dataset.unassignWorker && !session.assignments[button.dataset.unassignWorker]);
  $('#mode-label').textContent = mode === 'edit' ? placement ? '설비 배치 중' : '공장 둘러보기' : mode === 'complete' ? '가동 종료' : running ? '시험 가동 중' : '가동 일시정지';
  $('#run').innerHTML = mode === 'edit' ? '<span>▶</span> 시험 가동' : mode === 'complete' ? '<span>↻</span> 다시 시험' : running ? '<span>Ⅱ</span> 일시정지' : '<span>▶</span> 계속 가동';
  view?.setLayout(session.layout, selectedId, session.assignments, pendingWorker);
}

function preview() {
  if (!view) return;
  if (!placement) { view.setPreview(null); return; }
  const result = transact(session, placement);
  const type = placement.type === 'buy' ? placement.equipment : selected()?.type;
  if (type) view.setPreview({ type, x: placement.x, y: placement.y, rotation: placement.rotation }, result.ok);
}

function persist() {
  $('#save-status').textContent = saveSession(session) ? '✓ 현재 배치와 예산을 저장했습니다.' : '브라우저 저장을 사용할 수 없어 현재 세션에서만 유지됩니다.';
}

function apply(action) {
  if (mode !== 'edit') return;
  const result = transact(session, action);
  if (!result.ok) { notice(result.error, true); return; }
  session = result.state;
  if (action.type === 'buy') selectedId = session.layout.at(-1).id;
  if (action.type === 'sell') selectedId = null;
  placement = null; pendingWorker = null; sim = createSimulation(session.layout, session.assignments); accumulator = 0; heatVisible = false;
  $('#heat').setAttribute('aria-pressed', 'false'); view?.showHeat(sim, false);
  persist(); refreshInspector(); preview(); refreshMetrics();
  notice(action.type === 'sell' ? '설비를 판매하고 구매액을 100% 돌려받았습니다.' : action.type === 'assign' ? '작업자 배치를 변경했습니다.' : '설비를 배치했습니다. 작업자 자리도 함께 이동합니다.');
}

function pick({ cell, id, fixedId, workId }) {
  if (mode !== 'edit') { notice('관찰 중에는 편집할 수 없어요. 배치로 돌아가기를 눌러 주세요.'); return; }
  if (placement && cell) { apply({ ...placement, x: cell.x, y: cell.y }); return; }
  if (pendingWorker) {
    if (!workId) { notice('작업대 또는 창고 앞 한 칸을 선택해 주세요.', true); return; }
    selectedId = workId; apply({ type: 'assign', workerId: pendingWorker, machineId: workId }); return;
  }
  if (workId) id = workId;
  if (fixedId === WAREHOUSE.id) id = WAREHOUSE.id;
  if (id) { selectedId = id; placement = null; refreshInspector(); preview(); return; }
  if (fixedId) { notice(`${FIXED.find(item => item.id === fixedId).label}은 이번 의뢰의 고정 시설입니다. 이동하거나 판매할 수 없어요.`); return; }
  selectedId = null; refreshInspector();
}

function rotate() {
  if (mode !== 'edit') return;
  if (selected()?.fixed) return;
  if (placement) { placement.rotation = (placement.rotation + 1) % 4; refreshInspector(); preview(); }
  else if (selected()) { const item = selected(); apply({ type: 'move', id: item.id, x: item.x, y: item.y, rotation: (item.rotation + 1) % 4 }); }
}
function resetRun() { sim = createSimulation(session.layout, session.assignments); accumulator = 0; lastTime = 0; view?.showHeat(sim, false); }
function startOrPause() {
  if (!view) return;
  if (mode === 'edit' || mode === 'complete') {
    const result = validateLayout(session.layout);
    if (!result.valid) { notice(result.errors[0], true); return; }
    const staffing = validateStaffing(session);
    if (!staffing.valid) { notice(staffing.errors[0], true); openDrawer('workers'); return; }
    if (placement) { notice('배치를 마치거나 취소한 뒤 가동해 주세요.', true); return; }
    pendingWorker = null; selectedId = null; closeDrawer(); resetRun(); mode = 'run'; running = true;
  } else { running = !running; notice(running ? '시험 가동을 계속합니다.' : '일시정지했습니다. 생산 시간도 멈춥니다.'); }
  refreshInspector(); refreshMetrics();
}
function refreshMetrics() {
  $('#shipped').textContent = sim.shipped; $('#time').innerHTML = `${Math.max(0, STAGE.duration - sim.time).toFixed(mode === 'edit' ? 0 : 1)}<small>초</small>`;
  $('#progress').style.width = `${Math.min(100, sim.shipped / STAGE.goal * 100)}%`;
  for (const type of TYPES) {
    const machines = sim.machines.filter(item => item.type === type), el = document.querySelector(`[data-process="${type}"]`);
    el.querySelector('h3').textContent = `${EQUIPMENT[type].short}${machines.length > 1 ? ` × ${machines.length}` : ''}`;
    el.querySelector('small').textContent = !machines.length ? '설비 없음' : `재료 ${machines.reduce((n, m) => n + m.input, 0)} · 완성 ${machines.reduce((n, m) => n + m.output + m.reserved, 0)}`;
    el.querySelector('i').style.width = `${machines.length ? machines.reduce((n, m) => n + m.progress, 0) / machines.length * 100 : 0}%`;
  }
  for (const worker of sim.workers) {
    const card = document.querySelector(`[data-worker="${worker.id}"]`);
    card.querySelector('p').textContent = `${workplaceName(worker.machineId)} · ${mode === 'edit' ? worker.machineId ? '담당 자리 대기' : '자리 선택 필요' : worker.wait ? '통로에서 양보 중' : worker.status}`;
    card.querySelector('.worker-metrics').textContent = `이동 ${worker.metrics.moving.toFixed(0)}초 · 혼잡 ${worker.metrics.collision.toFixed(0)}초 · 휴식 ${worker.metrics.break.toFixed(0)}초`;
  }
  if (heatVisible) view?.showHeat(sim, true);
}
function finish() {
  running = false; mode = 'complete'; refreshInspector(); refreshMetrics();
  const data = summarize(sim), success = data.shipped >= STAGE.goal, diff = data.shipped - baseline.shipped;
  $('#result-title').textContent = success ? '사장님, 목표 달성했어요!' : '조금만 더 개선해 볼까요?';
  $('#result-copy').textContent = `${STAGE.duration}초 동안 창고에 ${data.shipped}개 보관 · 목표 ${STAGE.goal}개\n개선 전보다 ${diff >= 0 ? `${diff}개 더` : `${-diff}개 덜`} 보관했습니다.`;
  $('#result-icon').textContent = success ? '✦' : '↗';
  const values = [['창고 보관량', `${data.shipped}개`], ['개선 전 대비', `${diff >= 0 ? '+' : ''}${diff}개`], ['첫 창고 입고', data.firstShipment ? `${data.firstShipment.toFixed(1)}초` : '없음'], ['혼잡 대기 합계', `${data.collision.toFixed(1)}초`]];
  $('#report').replaceChildren(...values.map(([name, value]) => { const el = document.createElement('div'); const label = document.createElement('span'); label.textContent = name; const strong = document.createElement('strong'); strong.textContent = value; el.append(label, strong); return el; }));
  $('#result-dialog').showModal(); notice(success ? '의뢰 달성! 결과 보고서에서 개선 효과를 확인하세요.' : '가동을 마쳤어요. 운반 거리를 줄여 다시 도전해 보세요.');
}
function returnToEdit() { running = false; mode = 'edit'; placement = null; pendingWorker = null; resetRun(); refreshInspector(); refreshMetrics(); preview(); }

$('#machine-select').addEventListener('change', event => { if (mode !== 'edit') return; selectedId = event.target.value || null; placement = null; pendingWorker = null; closeDrawer(); refreshInspector(); preview(); });
$('#operator-select').addEventListener('change', event => {
  if (!selected()) return;
  const workerId = event.target.value || WORKERS.find(worker => session.assignments[worker.key] === selectedId)?.key;
  if (workerId) apply({ type: 'assign', workerId, machineId: event.target.value ? selectedId : null });
});
$('#deselect').addEventListener('click', () => { selectedId = null; cancelPlacement(); });
$('#move').addEventListener('click', () => { const item = selected(); if (!item) return; placement = { type: 'move', id: item.id, x: item.x, y: item.y, rotation: item.rotation }; refreshInspector(); preview(); notice('옮길 바닥을 눌러 주세요. 예산은 들지 않습니다.'); });
$('#rotate').addEventListener('click', rotate);
$('#sell').addEventListener('click', () => { if (selected()) apply({ type: 'sell', id: selectedId }); });
$('#cancel').addEventListener('click', cancelPlacement);
$('#placement-form').addEventListener('submit', event => { event.preventDefault(); if (placement) apply({ ...placement, x: Number($('#place-x').value) - 1, y: Number($('#place-y').value) - 1 }); });
for (const input of [$('#place-x'), $('#place-y')]) input.addEventListener('input', () => { if (placement) { placement.x = Number($('#place-x').value) - 1; placement.y = Number($('#place-y').value) - 1; preview(); } });
$('#run').addEventListener('click', startOrPause); $('#edit').addEventListener('click', returnToEdit);
$('#retry').addEventListener('click', () => { $('#result-dialog').close(); returnToEdit(); });
$('#heat').addEventListener('click', () => { heatVisible = !heatVisible; $('#heat').setAttribute('aria-pressed', String(heatVisible)); view?.showHeat(sim, heatVisible); notice(heatVisible ? sim.tick ? '붉은 타일은 작업자가 충돌을 피해 기다린 위치입니다.' : '혼잡 표시는 가동 후 작업자가 기다린 위치에 나타납니다.' : '혼잡 표시를 숨겼습니다.'); });
$('#speed-cycle').addEventListener('click', () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; $('#speed-cycle').textContent = `${speed}×`; $('#speed-cycle').setAttribute('aria-label', `가동 속도 ${speed}배`); });
$('#help').addEventListener('click', () => $('#help-dialog').showModal()); $('#help-close').addEventListener('click', () => $('#help-dialog').close());
for (const name of ['equipment', 'workers', 'mission']) {
  $('#'+name+'-tab').addEventListener('click', () => openDrawer(name));
  $('#'+name+'-open').addEventListener('click', () => { if (!$('#drawer').hidden && !$('#'+name+'-panel').hidden) closeDrawer(); else openDrawer(name); });
}
$('#drawer-close').addEventListener('click', closeDrawer);
$('#fit-view').addEventListener('click', () => view?.fit());
$('#hint').addEventListener('click', () => notice('다음 공정 직원이 이전 작업대까지 왕복합니다. 작업대를 가깝게 두고, 포장대에서 창고까지의 수거 동선도 줄여 보세요.'));
$('#reset').addEventListener('click', () => { if (mode === 'edit') $('#reset-dialog').showModal(); });
$('#cancel-reset').addEventListener('click', () => $('#reset-dialog').close());
$('#confirm-reset').addEventListener('click', () => { session = createSession(); selectedId = null; $('#reset-dialog').close(); returnToEdit(); persist(); notice('처음 공장 배치와 예산 400 G로 돌아왔습니다.'); });
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !document.querySelector('dialog[open]')) { closeDrawer(); cancelPlacement(); return; }
  if (event.target.closest('input,select,textarea,button') || document.querySelector('dialog[open]')) return;
  if (event.code === 'Space') { event.preventDefault(); startOrPause(); }
  if (event.key.toLowerCase() === 'r') rotate();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && running) { running = false; refreshInspector(); notice('다른 화면으로 이동해 가동을 일시정지했어요. 계속 가동을 누르면 이어집니다.'); }
  lastTime = 0;
});

async function boot() {
  try {
    const { createFactoryView } = await import('./view/factory.js');
    view = createFactoryView($('#scene'), { onPick: pick, onHover(cell) {
      if (!placement || mode !== 'edit') return;
      if (!cell) { view.setPreview(null); return; }
      if (placement.x === cell.x && placement.y === cell.y) return;
      placement.x = cell.x; placement.y = cell.y; $('#place-x').value = cell.x + 1; $('#place-y').value = cell.y + 1; preview();
    }, onContextLost() { running = false; $('#loading').hidden = false; $('#loading').classList.add('error'); $('#loading').textContent = '3D 연결이 끊겼습니다. 저장된 배치는 유지됩니다. 페이지를 새로고침해 주세요.'; } });
    $('#loading').hidden = true; $('#scene').dataset.ready = 'true'; refreshInspector(); refreshMetrics();
    let uiTime = 0;
    function frame(now) {
      const elapsed = lastTime ? Math.min(0.15, (now - lastTime) / 1000) : 0; lastTime = now;
      if (running) {
        accumulator += elapsed * speed;
        while (accumulator >= DT && !sim.complete) { stepSimulation(sim); accumulator -= DT; }
        if (sim.complete) { accumulator = 0; finish(); }
      }
      if (now - uiTime > 180) { refreshMetrics(); uiTime = now; }
      view.update(sim, mode === 'edit' || !running ? 1 : accumulator / DT, now / 1000); view.render(); requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  } catch (error) {
    $('#loading').classList.add('error'); $('#loading').textContent = '3D 화면을 열지 못했습니다. 브라우저를 업데이트하거나 다른 브라우저에서 다시 열어 주세요.';
    $('#run').disabled = true; console.error(error);
  }
}
refreshInspector(); refreshMetrics(); boot();

// Preserve the editable layout before an explicit return to the hosting site.
window.addEventListener("factory-fit-site-exit", () => { running = false; persist(); });
