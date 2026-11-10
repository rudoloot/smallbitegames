import * as THREE from 'three';
import { MAP, EQUIPMENT, FIXED, WORKERS, WAREHOUSE } from '../game/config.js';
import { createArtKit } from './art.js';
import { footprint, cellKey } from '../game/layout.js';

export function createFactoryView(host, callbacks) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f1dbc4');
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.95;
  host.prepend(renderer.domElement);
  renderer.domElement.setAttribute('aria-label', '3D 공장. 설비를 눌러 선택하고 옮기기 버튼으로 배치합니다.');
  renderer.domElement.tabIndex = 0;
  // A narrow field of view gives the toy factory a little depth without wide-angle distortion.
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 300);
  const cameraDirection = new THREE.Vector3(24, 36, 1.2).normalize();
  let cameraDistance = 60;
  scene.add(new THREE.HemisphereLight('#fff5e9', '#c8b7aa', 1.4));
  const sun = new THREE.DirectionalLight('#fff3e4', 2.6);
  sun.position.set(0, 22, 14); sun.target.position.set(8, 0, 6); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -16, right: 16, top: 16, bottom: -16, near: 1, far: 60 });
  sun.shadow.mapSize.set(1024, 1024); sun.shadow.normalBias = 0.035; sun.shadow.bias = -0.00015;
  sun.shadow.radius = 4; sun.shadow.intensity = 0.62;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#e9f2ff', 0.4); fill.position.set(18, 10, -4); scene.add(fill);
  const art = createArtKit(renderer);
  const { box, wood, sphere, cylinder, goods, material: colorMaterial } = art;
  function outline(cells, color, parent, dashed = true) {
    for (const cell of cells) {
      const points = [[0.06, 0.085, 0.06], [0.94, 0.085, 0.06], [0.94, 0.085, 0.94], [0.06, 0.085, 0.94], [0.06, 0.085, 0.06]].map(([x, y, z]) => new THREE.Vector3(x + cell.x, y, z + cell.y));
      const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), dashed ? new THREE.LineDashedMaterial({ color, dashSize: 0.16, gapSize: 0.09, transparent: true, opacity: 0.8 }) : new THREE.LineBasicMaterial({ color }));
      line.computeLineDistances(); parent.add(line);
    }
  }
  function clear(group) {
    group.traverse(obj => { if (obj.isLine || obj.userData.temporary) { obj.geometry?.dispose(); obj.material?.dispose(); } });
    group.clear();
  }
  function label(text, className) {
    const el = document.createElement('div'); el.className = `scene-label ${className}`; el.textContent = text; host.append(el); return el;
  }
  const environment = new THREE.Group(); scene.add(environment);
  const labels = [], warehouseBoxes = [];
  let warehouseLabel;
  box(environment, 200, 0.15, 200, 8, -0.52, 6, '#f1dbc4');
  box(environment, 16.55, 0.42, 12.55, 8, -0.25, 6, '#d0b5a0');
  box(environment, 16.1, 0.08, 12.1, 8, -0.005, 6, '#e7d4c0');
  // 타일은 하나의 인스턴스 묶음으로 그린다.
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(0.99, 0.025, 0.99), colorMaterial('#ffffff'), MAP.width * MAP.height);
  const matrix = new THREE.Matrix4();
  for (let y = 0; y < MAP.height; y++) for (let x = 0; x < MAP.width; x++) {
    const id = y * MAP.width + x; matrix.makeTranslation(x + 0.5, 0.045, y + 0.5); tiles.setMatrixAt(id, matrix);
    tiles.setColorAt(id, new THREE.Color((x + y) % 2 ? '#efddcb' : '#f1dfcd'));
  }
  tiles.receiveShadow = true; scene.add(tiles);
  box(environment, 16.4, 1.2, 0.25, 8, 0.5, -0.2, '#e6ccb8');
  box(environment, 16.5, 0.18, 0.33, 8, 1.12, -0.2, '#8aa99e');
  box(environment, 0.2, 0.65, 12.4, -0.2, 0.25, 6, '#e6ccb8');
  box(environment, 0.2, 0.35, 12.4, 16.2, 0.13, 6, '#e6ccb8');
  box(environment, 0.28, 0.14, 12.45, -0.2, 0.62, 6, '#8aa99e');
  box(environment, 0.26, 0.12, 12.45, 16.2, 0.35, 6, '#8aa99e');
  for (const x of [0, 5, 11, 16]) box(environment, 0.35, 0.85, 0.45, x, 0.3, -0.18, '#d7b7a3');
  for (const x of [0, 5.8, 10.2, 16]) box(environment, 0.34, 0.7, 0.34, x, 0.25, 12.18, '#d7b7a3');
  box(environment, 5.7, 0.35, 0.22, 2.85, 0.1, 12.2, '#e6ccb8');
  box(environment, 5.7, 0.35, 0.22, 13.15, 0.1, 12.2, '#e6ccb8');

  for (const fixture of FIXED) {
    const cells = [];
    for (let y = 0; y < fixture.height; y++) for (let x = 0; x < fixture.width; x++) cells.push({ x: fixture.x + x, y: fixture.y + y });
    outline(cells, fixture.color, scene, false);
    if (fixture.id === 'inbound') {
      for (let row = 0; row < 3; row++) for (let layer = 0; layer < 3; layer++) wood(environment, 1.55, 0.22, 0.72, 0.95, 0.22 + layer * 0.24, 1.5 + row * 0.92, layer % 2 ? '#d2a36c' : '#bd8d53');
    } else if (fixture.id === 'outbound') {
      for (const x of [0.2, 1.8]) for (const z of [8.07, 10.93]) wood(environment, 0.14, 1.88, 0.14, x, 0.99, z, '#b88b5b');
      for (let layer = 0; layer < 3; layer++) {
        for (const x of [0.28, 1.72]) wood(environment, 0.15, 0.1, 2.86, x, 0.17 + layer * 0.55, 9.5, '#ba905f');
        for (const z of [8.15, 9.5, 10.85]) wood(environment, 1.58, 0.1, 0.13, 1, 0.17 + layer * 0.55, z, '#ba905f');
      }
      for (const x of [0.2, 1.8]) wood(environment, 0.15, 0.12, 2.9, x, 1.99, 9.5, '#c39a67');
      for (let layer = 0; layer < 3; layer++) for (let row = 0; row < 3; row++) for (const x of [0.62, 1.36]) {
        const item = goods(scene, 4, x, 0.23 + layer * 0.55, 8.45 + row * 0.9, 0.6); item.visible = false; warehouseBoxes.push(item);
      }
    } else {
      box(environment, 1.9, 0.12, 1.9, 15, 0.14, 5, '#b2c8bc');
      box(environment, 1.9, 1.65, 0.13, 15, 0.95, 4.06, '#dcd9c8');
      for (const x of [14.07, 15.93]) box(environment, 0.14, 1.65, 1.9, x, 0.95, 5, '#dcd9c8');
      box(environment, 1.38, 1.35, 0.12, 14.9, 0.8, 5.97, '#89b0a4');
      cylinder(environment, 0.28, 0.21, 0.42, 15, 0.5, 4.85, '#f5f3e7');
      box(environment, 0.55, 0.6, 0.22, 15, 0.7, 4.36, '#f5f3e7');
      sphere(environment, 0.09, 15.42, 0.85, 6.05, '#e5ce88');
    }
    const fixtureLabel = label(fixture.id === 'toilet' ? 'WC · 고정' : fixture.id === WAREHOUSE.id ? '창고 · 0개' : '↓ 입고 · 고정', 'fixed-label');
    if (fixture.id === WAREHOUSE.id) { warehouseLabel = fixtureLabel; fixtureLabel.id = 'warehouse-stock'; }
    labels.push({ el: fixtureLabel, pos: new THREE.Vector3(fixture.x + fixture.width / 2, 2.1, fixture.y + fixture.height / 2) });
  }
  for (const [x, z] of [[-0.8, -0.3], [16.8, -0.3], [5.5, 12.8], [10.5, 12.8], [16.8, 10]]) art.plant(environment, x, z);
  art.compact(environment, 'environment');
  const { cat, dog, wag } = art.pets(scene);

  const equipmentGroup = new THREE.Group(), marks = new THREE.Group(), preview = new THREE.Group(), crowd = new THREE.Group(), heat = new THREE.Group();
  scene.add(equipmentGroup, marks, preview, crowd, heat);
  let layout = [], selectedId = null, modelMap = new Map(), workerModels = [], machineLabels = [], stockLabels = [], slotLabels = [], slotTargets = [];
  function machineModel(item) {
    const model = art.machine(item); equipmentGroup.add(model); return model;
  }
  function setLayout(next, selection = null, assignments = {}, pendingWorker = null) {
    layout = next; selectedId = selection; clear(equipmentGroup); clear(marks); modelMap = new Map();
    [...machineLabels, ...stockLabels, ...slotLabels, ...slotTargets].forEach(entry => entry.el.remove()); machineLabels = []; stockLabels = []; slotLabels = []; slotTargets = [];
    for (const item of layout) {
      const model = machineModel(item); modelMap.set(item.id, model);
      const place = footprint(item).work[0], operator = WORKERS.find(worker => assignments[worker.key] === item.id);
      box(marks, 0.9, 0.035, 0.9, place.x + 0.5, 0.082, place.y + 0.5, operator ? '#bdd4a2' : '#e8d7a6', false);
      outline([place], pendingWorker ? '#4b823a' : operator ? '#779b5b' : '#b69b58', marks, false);
      slotLabels.push({ el: label(operator ? operator.name : '＋ 작업자', `slot-label ${operator ? 'assigned' : 'empty'}${selection === item.id || pendingWorker ? ' active' : ''}`), pos: new THREE.Vector3(place.x + 0.5, operator ? 1.8 : 0.35, place.y + 0.5) });
      const target = document.createElement('button'); target.type = 'button'; target.className = 'slot-target'; target.dataset.workId = item.id;
      target.setAttribute('aria-label', `${EQUIPMENT[item.type].name} 작업자 자리 · ${operator?.name ?? '미배치'}`);
      target.addEventListener('click', () => callbacks.onPick?.({ cell: place, workId: item.id })); host.append(target);
      slotTargets.push({ el: target, pos: new THREE.Vector3(place.x + 0.5, 0.12, place.y + 0.5) });
      if (item.id === selection) outline(footprint(item).body, '#fff6b9', marks, false);
      machineLabels.push({ el: label(EQUIPMENT[item.type].short, item.id === selection ? 'machine-label active' : 'machine-label'), pos: new THREE.Vector3(model.position.x, item.type === 'paint' ? 2.7 : 2.1, model.position.z), id: item.id });
      const stockLabel = label('', 'stock-label'); stockLabel.hidden = true; stockLabel.dataset.machineId = item.id; stockLabel.dataset.outputCount = '0';
      stockLabels.push({ el: stockLabel, pos: new THREE.Vector3(model.position.x + 0.65, 1.65, model.position.z + 0.6), id: item.id });
    }
    const place = WAREHOUSE.access, operator = WORKERS.find(worker => assignments[worker.key] === WAREHOUSE.id);
    box(marks, 0.9, 0.035, 0.9, place.x + 0.5, 0.082, place.y + 0.5, operator ? '#bdd4a2' : '#e8d7a6', false);
    outline([place], pendingWorker || selection === WAREHOUSE.id ? '#4b823a' : '#779b5b', marks, false);
    slotLabels.push({ el: label(operator ? operator.name : '＋ 창고 직원', `slot-label ${operator ? 'assigned' : 'empty'}${selection === WAREHOUSE.id || pendingWorker ? ' active' : ''}`), pos: new THREE.Vector3(place.x + 0.5, operator ? 1.8 : 0.35, place.y + 0.5) });
    const target = document.createElement('button'); target.type = 'button'; target.className = 'slot-target'; target.dataset.workId = WAREHOUSE.id;
    target.setAttribute('aria-label', `창고 직원 자리 · ${operator?.name ?? '미배치'}`);
    target.addEventListener('click', () => callbacks.onPick?.({ cell: place, workId: WAREHOUSE.id })); host.append(target);
    slotTargets.push({ el: target, pos: new THREE.Vector3(place.x + 0.5, 0.12, place.y + 0.5) });
  }
  function setPreview(item, valid) {
    clear(preview);
    if (!item) return;
    for (const cell of footprint(item).body) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.94, 0.3, 0.94), new THREE.MeshStandardMaterial({ color: valid ? '#84bb83' : '#d57a67', transparent: true, opacity: 0.65 }));
      mesh.position.set(cell.x + 0.5, 0.3, cell.y + 0.5); mesh.userData.temporary = true; preview.add(mesh);
    }
    outline(footprint(item).work, valid ? '#477c55' : '#ab5544', preview);
  }
  function workerModel(color, index) {
    const model = art.worker(color, index); crowd.add(model.group); return model;
  }
  function update(sim, alpha, seconds) {
    if (!workerModels.length) workerModels = sim.workers.map((worker, index) => workerModel(worker.color, index));
    for (const worker of sim.workers) {
      const obj = workerModels[worker.id];
      const x = THREE.MathUtils.lerp(worker.from.x, worker.x, alpha), y = THREE.MathUtils.lerp(worker.from.y, worker.y, alpha);
      obj.group.position.set(x + 0.5, 0.07, y + 0.5);
      const dx = worker.x - worker.from.x, dy = worker.y - worker.from.y;
      if (dx || dy) obj.body.rotation.y = Math.atan2(dx, dy);
      else if (!sim.tick) obj.body.rotation.y = 1.1;
      const own = sim.machines.find(machine => machine.id === worker.machineId);
      if (sim.tick && !(dx || dy) && own?.processing > 0) obj.body.rotation.y = Math.atan2(modelMap.get(own.id).position.x - (x + .5), modelMap.get(own.id).position.z - (y + .5));
      obj.legs.forEach((leg, index) => { leg.rotation.x = (dx || dy) ? Math.sin(seconds * 15 + index * Math.PI) * 0.45 : 0; });
      obj.arms.forEach((arm, index) => { arm.rotation.x = worker.carrying ? -1.05 : (dx || dy) ? Math.sin(seconds * 15 + index * Math.PI) * -0.32 : -0.08; });
      obj.cargo.forEach((item, stage) => { item.visible = worker.carrying && worker.job?.stage === stage; });
      obj.marker.visible = worker.wait > 0 || worker.breakLeft > 0 || worker.job?.phase === 'toilet';
      obj.marker.position.y = 1.85 + Math.sin(seconds * 3) * 0.05;
    }
    for (const entry of machineLabels) {
      const machine = sim.machines.find(machine => machine.id === entry.id);
      if (machine) entry.el.textContent = `${EQUIPMENT[machine.type].short}${sim.tick ? machine.processing > 0 ? ' · 가공' : machine.output + machine.reserved >= 2 ? ' · 적체' : ' · 대기' : ''}`;
    }
    for (const entry of stockLabels) {
      const machine = sim.machines.find(item => item.id === entry.id), count = machine.output + machine.reserved;
      entry.el.hidden = count === 0; entry.el.textContent = `완료 ${count}`; entry.el.dataset.outputCount = String(count);
      const inventory = modelMap.get(machine.id)?.userData.inventory;
      if (inventory) { inventory.processingItem.visible = machine.processing > 0; inventory.outputItems.forEach((item, index) => { item.visible = index < count; }); }
    }
    warehouseBoxes.forEach((item, index) => { item.visible = index < sim.warehouse.stock; });
    warehouseLabel.textContent = `창고 · ${sim.warehouse.stock}개`; warehouseLabel.dataset.count = String(sim.warehouse.stock);
    cat.position.y = 0.075 + Math.sin(seconds * 1.8) * 0.008;
    dog.rotation.y = 1.3 + Math.sin(seconds * 0.6) * 0.09;
    wag.rotation.z = Math.sin(seconds * 5) * 0.28;
  }
  function showHeat(sim, visible) {
    clear(heat); if (!visible) return;
    for (const [key, count] of Object.entries(sim.heat)) {
      const [x, y] = key.split(',').map(Number);
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.03, 0.86), new THREE.MeshBasicMaterial({ color: '#c76e52', transparent: true, opacity: Math.min(0.7, count / 4 + 0.18) }));
      mesh.position.set(x + 0.5, 0.07, y + 0.5); mesh.userData.temporary = true; heat.add(mesh);
    }
  }
  let width = 1, height = 1;
  function positionCamera() {
    const target = new THREE.Vector3(8 + panX, 0, 6 + panZ);
    camera.position.copy(target).addScaledVector(cameraDirection, cameraDistance);
    camera.lookAt(target); camera.updateMatrixWorld();
  }
  function resize() {
    width = host.clientWidth; height = host.clientHeight;
    renderer.setSize(width, height);
    const aspect = width / height;
    const half = Math.max(8.7, 7.5 / aspect);
    camera.aspect = aspect;
    cameraDistance = half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    positionCamera();
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(host);
  const raycaster = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08);
  function pick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
    const point = raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
    const cell = point ? { x: Math.floor(point.x), y: Math.floor(point.z) } : null;
    const hit = raycaster.intersectObjects(equipmentGroup.children, true)[0];
    const fixture = cell && FIXED.find(item => cell.x >= item.x && cell.x < item.x + item.width && cell.y >= item.y && cell.y < item.y + item.height);
    const workId = cell && layout.find(item => cellKey(footprint(item).work[0]) === cellKey(cell))?.id;
    return { cell, id: hit?.object.userData.machineId, fixedId: fixture?.id, workId };
  }
  const pointers = new Map();
  let dragged = false, start = null, panX = 0, panZ = 0;
  function planePoint(clientX, clientY) {
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1), camera);
    return raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
  }
  function zoom(ratio) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * ratio, 0.75, 3); camera.updateProjectionMatrix(); }
  function fit() { panX = panZ = 0; camera.zoom = 1; positionCamera(); camera.updateProjectionMatrix(); }
  renderer.domElement.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) { callbacks.onHover?.(pick(event).cell); return; }
    const oldPair = [...pointers.values()];
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.size >= 2) {
      const pair = [...pointers.values()];
      const oldDistance = Math.hypot(oldPair[0].x - oldPair[1].x, oldPair[0].y - oldPair[1].y);
      const distance = Math.hypot(pair[0].x - pair[1].x, pair[0].y - pair[1].y);
      if (oldDistance > 0) zoom(distance / oldDistance);
      dragged = true; return;
    }
    if (dragged || start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 7) {
      const before = planePoint(previous.x, previous.y), after = planePoint(event.clientX, event.clientY);
      if (before && after) {
        const dx = before.x - after.x, dz = before.z - after.z;
        panX = THREE.MathUtils.clamp(panX + dx, -14, 14); panZ = THREE.MathUtils.clamp(panZ + dz, -12, 12);
        positionCamera();
      }
      dragged = true;
    } else callbacks.onHover?.(pick(event).cell);
  });
  renderer.domElement.addEventListener('pointerleave', () => callbacks.onHover?.(null));
  renderer.domElement.addEventListener('pointerdown', event => {
    renderer.domElement.setPointerCapture(event.pointerId);
    if (!pointers.size) { dragged = false; start = { x: event.clientX, y: event.clientY }; }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });
  renderer.domElement.addEventListener('pointerup', event => {
    if (pointers.size === 1 && !dragged) callbacks.onPick?.(pick(event));
    pointers.delete(event.pointerId);
    if (!pointers.size) { start = null; dragged = false; }
  });
  renderer.domElement.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); dragged = true; });
  renderer.domElement.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(-event.deltaY * 0.0015)); }, { passive: false });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); callbacks.onContextLost?.(); });
  function render() {
    camera.updateMatrixWorld();
    for (const entry of [...labels, ...machineLabels, ...stockLabels, ...slotLabels, ...slotTargets]) {
      const point = entry.pos.clone().project(camera);
      entry.el.style.left = `${(point.x + 1) * width / 2}px`; entry.el.style.top = `${(-point.y + 1) * height / 2}px`;
    }
    for (const entry of slotTargets) {
      // Project each slot so hit areas follow its depth, including after pan/zoom.
      const corners = [[-.4, -.4], [.4, -.4], [.4, .4], [-.4, .4]].map(([x, z]) => entry.pos.clone().add(new THREE.Vector3(x, 0, z)).project(camera));
      const spanX = (Math.max(...corners.map(p => p.x)) - Math.min(...corners.map(p => p.x))) * width / 2;
      const spanY = (Math.max(...corners.map(p => p.y)) - Math.min(...corners.map(p => p.y))) * height / 2;
      entry.el.style.width = `${THREE.MathUtils.clamp(spanX, 24, 60)}px`;
      entry.el.style.height = `${THREE.MathUtils.clamp(spanY, 20, 48)}px`;
    }
    renderer.render(scene, camera);
  }
  resize();
  return { setLayout, setPreview, update, showHeat, render, renderer, camera, fit, audit: art.audit };
}
