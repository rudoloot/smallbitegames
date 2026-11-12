import {recipeFor} from '../game/simulation.js';
import { dockSlots, isOutbound } from '../game/docks.js';
import * as THREE from 'three';
import { EQUIPMENT, STAGE } from '../game/config.js';
import { createArtKit } from './art.js';
import { operatorFacing, footprint, cellKey } from '../game/layout.js';

export function createFactoryView(host, callbacks, stage = STAGE) {
  const MAP = { width: stage.width, height: stage.height }, FIXED = stage.fixtures, WORKERS = stage.workers, WAREHOUSE = FIXED.find(f => f.id === 'outbound');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b8c1c2');
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
  // A steeper four-fifths top view, keeping the factory axes level and a little side depth.
  const cameraElevation = THREE.MathUtils.degToRad(72);
  const cameraDirection = new THREE.Vector3(Math.cos(cameraElevation), Math.sin(cameraElevation), 0);
  let cameraDistance = 60;
  scene.add(new THREE.HemisphereLight('#fff5e9', '#c8b7aa', 1.4));
  const sun = new THREE.DirectionalLight('#fff3e4', 2.6);
  sun.position.set(MAP.width / 2 - 8, 22, MAP.height / 2 + 8); sun.target.position.set(MAP.width / 2, 0, MAP.height / 2); sun.castShadow = true;
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
  let warehouseLabel, inletLabel;
  const cx = MAP.width / 2, cz = MAP.height / 2;
  box(environment, 200, .15, 200, cx, -.52, cz, '#b8c1c2', false, 'concrete');
  const rectangularFloor = !stage.cells || (stage.cells.length === stage.width * stage.height && stage.cells.every(k=>{const [x,y]=k.split(',').map(Number);return x>=0&&x<stage.width&&y>=0&&y<stage.height;}));
  if (rectangularFloor) {
    box(environment, MAP.width + .55, .42, MAP.height + .55, cx, -.25, cz, '#d0b5a0');
    box(environment, MAP.width + .1, .08, MAP.height + .1, cx, -.005, cz, '#e7d4c0');
  } else for (const key of stage.cells) { const [x,z]=key.split(',').map(Number); box(environment, 1, .42, 1, x+.5, -.25, z+.5, '#d0b5a0', false); }
  const tileCells = [];
  const floor = stage.cells ?? Array.from({length:MAP.width*MAP.height}, (_,i)=>(i%MAP.width)+','+Math.floor(i/MAP.width));
  for (const key of floor) {
    const [x,y]=key.split(',').map(Number);
    if (!stage.holes.some(h=>h.x===x && h.y===y)) tileCells.push({x,y});
  }
  const tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(.99, .025, .99), colorMaterial('#ffffff'), tileCells.length), matrix = new THREE.Matrix4();
  tileCells.forEach((cell, i) => { matrix.makeTranslation(cell.x + .5, .045, cell.y + .5); tiles.setMatrixAt(i, matrix); tiles.setColorAt(i, new THREE.Color((cell.x + cell.y) % 2 ? '#efddcb' : '#f1dfcd')); });
  tiles.receiveShadow = true; scene.add(tiles);
  for (const hole of stage.holes) box(environment, .99, .015, .99, hole.x + .5, .04, hole.y + .5, '#655244', false);
  // Continuous plaster walls with restrained trim; openings stay outside playable cells.
  const wallPaint = '#eee6d7', trim = '#b3bbae', frame = '#f9f5e9';
  function wallPart(parent, length, height, x = 0) {
    if (length <= 0) return;
    box(parent, length, height, .18, x, height / 2, 0, wallPaint);
    box(parent, length, .055, .22, x, height + .025, 0, trim);
    box(parent, length, .10, .20, x, .075, 0, '#d0cabb');
  }
  function wallGroup(x, z, rotation = 0) {
    const group = new THREE.Group(); group.position.set(x, 0, z); group.rotation.y = rotation; environment.add(group); return group;
  }
  if (rectangularFloor) {
  const rear = wallGroup(-.18, cz, Math.PI / 2), wallHeight = 1.22, windowWidth = 1.65;
  const windowCenters = [-MAP.height * .25, MAP.height * .25];
  let edge = -MAP.height / 2 - .18;
  for (const center of windowCenters) {
    const left = center - windowWidth / 2, right = center + windowWidth / 2;
    wallPart(rear, left - edge, wallHeight, (edge + left) / 2);
    wallPart(rear, windowWidth, .39, center);
    box(rear, windowWidth, .12, .18, center, 1.16, 0, wallPaint);
    // Pale blue inset glazing and a simple white cross frame.
    box(rear, windowWidth - .12, .64, .055, center, .76, 0, '#a9cbd2', false);
    for (const x of [left + .035, right - .035, center]) box(rear, .065, .74, .19, x, .76, 0, frame);
    for (const y of [.40, .77, 1.12]) box(rear, windowWidth, .055, .20, center, y, 0, frame);
    box(rear, windowWidth + .13, .07, .34, center, .37, 0, frame);
    box(rear, windowWidth, .055, .22, center, wallHeight + .025, 0, trim);
    edge = right;
  }
  wallPart(rear, MAP.height / 2 + .18 - edge, wallHeight, (edge + MAP.height / 2 + .18) / 2);
  for (const z of [-.18, MAP.height + .18]) wallPart(wallGroup(cx, z), MAP.width + .18, wallHeight);
  const front = wallGroup(MAP.width + .18, cz, Math.PI / 2), doorway = 1.45;
  const sideLength = (MAP.height + .36 - doorway) / 2;
  for (const sign of [-1, 1]) {
    wallPart(front, sideLength, wallHeight, sign * (doorway / 2 + sideLength / 2));
    box(front, .10, wallHeight, .24, sign * (doorway / 2 + .025), wallHeight / 2, 0, frame);
  }
  box(front, doorway, .055, .48, 0, .06, 0, '#c5c3b5');
  // Closed decorative door stays outside the playable grid.
  const door = new THREE.Group(); door.position.set(-doorway / 2, 0, 0); door.rotation.y = 0; front.add(door);
  box(door, doorway - .09, wallHeight - .10, .09, (doorway - .09) / 2, wallHeight / 2, 0, '#849d99');
  box(door, .76, .30, .105, .66, .88, 0, '#bbd5d8', false);
  box(door, .16, .045, .08, doorway - .27, .41, -.075, '#dbbd76');
  box(front, doorway + .10, .055, .24, 0, wallHeight + .025, 0, trim);
  } else {
    const cells = new Set(stage.cells), edges = new Map();
    for (const key of cells) {
      const [x,z]=key.split(',').map(Number);
      for(const [dx,dz,axis,line,start] of [[-1,0,'z',x-.10,z],[1,0,'z',x+1.10,z],[0,-1,'x',z-.10,x],[0,1,'x',z+1.10,x]]) {
        if(cells.has((x+dx)+','+(z+dz)))continue;
        const edgeKey=axis+':'+line; if(!edges.has(edgeKey))edges.set(edgeKey,[]);edges.get(edgeKey).push(start);
      }
    }
    for(const [key,starts] of edges){
      const [axis,lineText]=key.split(':'), line=Number(lineText);starts.sort((a,b)=>a-b);
      for(let i=0;i<starts.length;){let end=i;while(end+1<starts.length&&starts[end+1]===starts[end]+1)end++;
        const length=starts[end]-starts[i]+1, middle=(starts[i]+starts[end]+1)/2;
        const group=axis==='z'?wallGroup(line,middle,Math.PI/2):wallGroup(middle,line);
        wallPart(group,length,1.22);
        if(axis==='z'&&line<0)for(let offset=-length/2+1;offset<length/2-.5;offset+=3){
          box(group,1.15,.55,.205,offset,.79,0,'#a9cbd2');
          for(const y of [.5,1.08])box(group,1.25,.065,.24,offset,y,0,frame);
          for(const x of [-.6,0,.6])box(group,.06,.62,.24,offset+x,.79,0,frame);
        }
        if(axis==='z'&&line>MAP.width&&starts[i]<=Math.floor(cz)&&starts[end]>=Math.floor(cz)){
          box(group,.88,1.1,.215,0,.57,0,'#849d99');box(group,.58,.28,.23,0,.88,0,'#bbd5d8');
          box(group,.12,.05,.25,.28,.48,0,'#dbbd76');
        }
        i=end+1;
      }
    }
  }
  for(const pillar of stage.pillars ?? []){
    box(environment,.88,.14,.88,pillar.x+.5,.12,pillar.y+.5,'#aaa99d');
    box(environment,.62,1.65,.62,pillar.x+.5,.93,pillar.y+.5,'#c8c8bb');
    box(environment,.72,.12,.72,pillar.x+.5,1.78,pillar.y+.5,'#e0dfd1');
  }
  const inletGroup = new THREE.Group(); scene.add(inletGroup);
  let currentFixtures = FIXED;
  for (const fixture of FIXED) {
    const cells = Array.from({ length: fixture.width * fixture.height }, (_, i) => ({ x: fixture.x + i % fixture.width, y: fixture.y + Math.floor(i / fixture.width) }));
    outline(cells, fixture.color, fixture.id==='inbound'?inletGroup:scene, false);
    if (fixture.id === 'inbound') {
      for (let row = 0; row < fixture.height; row++) for (let layer = 0; layer < 3; layer++) wood(inletGroup, fixture.width - .22, .16, .66, fixture.x + fixture.width / 2, .17 + layer * .17, fixture.y + .5 + row, layer % 2 ? '#d2a36c' : '#bd8d53');
    } else {
      wood(environment, fixture.width - .15, .15, fixture.height - .16, fixture.x + fixture.width / 2, .15, fixture.y + fixture.height / 2, '#b88b5b');
      for (let i = 0; i < 4; i++) { const item = goods(scene, 4, fixture.x + .5, .24 + Math.floor(i / 2) * .49, fixture.y + (fixture.height === 1 ? .28 + (i % 2) * .44 : .55 + (i % 2) * .8), .6); warehouseBoxes.push(item); }
    }
    const el = label(fixture.id === 'outbound' ? '출고장' : '입고장', 'fixed-label');
    el.hidden = true;
    if (fixture.id === 'outbound') { warehouseLabel = el; el.id = 'warehouse-stock'; }
    const entry={ el, pos: new THREE.Vector3(fixture.x + fixture.width / 2, 1.2, fixture.y + fixture.height / 2) };
    labels.push(entry);if(fixture.id==='inbound') inletLabel=entry;
  }
  for (const [x, z] of [[MAP.width + .8, -.2], [MAP.width + .8, MAP.height + .2]]) art.plant(environment, x, z);
  art.compact(environment, 'environment');

  const equipmentGroup = new THREE.Group(), marks = new THREE.Group(), preview = new THREE.Group(), crowd = new THREE.Group(), heat = new THREE.Group();
  scene.add(equipmentGroup, marks, preview, crowd, heat);
  let waitingWorkers = {}, layout = [], selectedId = null, modelMap = new Map(), workerModels = [], machineLabels = [], stockLabels = [], slotLabels = [], slotTargets = [];
  function machineModel(item) {
    const model = art.machine(item,recipeFor(item,stage)); equipmentGroup.add(model); return model;
  }
  function setLayout(next, selection = null, assignments = {}, pendingWorker = null, waiting = {}, liveStage = stage) {
    currentFixtures=liveStage.fixtures;
    const inlet=currentFixtures.find(f=>f.id==='inbound'), original=FIXED.find(f=>f.id==='inbound');
    inletGroup.visible=!!inlet;
    if (inlet) {
      inletLabel.pos.set(inlet.x+inlet.width/2,1.2,inlet.y+inlet.height/2);
      inletGroup.position.set(inlet.x-original.x,0,inlet.y-original.y);
    }
    waitingWorkers = waiting;
    layout = next; selectedId = selection; clear(equipmentGroup); clear(marks); modelMap = new Map();
    [...machineLabels, ...stockLabels, ...slotLabels, ...slotTargets].forEach(entry => entry.el.remove()); machineLabels = []; stockLabels = []; slotLabels = []; slotTargets = [];
    for (const item of layout) {
      const model = machineModel(item); modelMap.set(item.id, model);
      if (EQUIPMENT[item.type].belt) continue;
      const place = footprint(item).work[0], operator = WORKERS.find(worker => assignments[worker.key] === item.id);
      box(marks, 0.9, 0.035, 0.9, place.x + 0.5, 0.082, place.y + 0.5, operator ? '#a8c6e6' : '#d1ddec', false);
      outline([place], pendingWorker ? '#366ba3' : operator ? '#5b89b8' : '#91a9c1', marks, false);
      slotLabels.push({ el: label(operator ? operator.name : '＋ 작업자', `slot-label ${operator ? 'assigned' : 'empty'}${selection === item.id || pendingWorker ? ' active' : ''}`), pos: new THREE.Vector3(place.x + 0.5, operator ? 1.8 : 0.35, place.y + 0.5) });
      const target = document.createElement('button'); target.type = 'button'; target.className = 'slot-target'; target.dataset.workId = item.id;
      target.setAttribute('aria-label', `${EQUIPMENT[item.type].name} 작업자 자리 · ${operator?.name ?? '미배치'}`);
      target.addEventListener('click', event => { if (event.detail === 0) callbacks.onPick?.({ cell: place, workId: item.id }); }); host.append(target);
      slotTargets.push({ el: target, pos: new THREE.Vector3(place.x + 0.5, 0.12, place.y + 0.5) });
      if (item.id === selection) outline(footprint(item).body, '#fff6b9', marks, false);
      machineLabels.push({ el: label(EQUIPMENT[item.type].short, item.id === selection ? 'machine-label active' : 'machine-label'), pos: new THREE.Vector3(model.position.x, item.type === 'paint' ? 2.7 : 2.1, model.position.z), id: item.id });
      const stockLabel = label('', 'stock-label'); stockLabel.hidden = true; stockLabel.dataset.machineId = item.id; stockLabel.dataset.outputCount = '0';
      stockLabels.push({ el: stockLabel, pos: new THREE.Vector3(model.position.x + 0.65, 1.65, model.position.z + 0.6), id: item.id });
    }
    const occupied=new Set(layout.flatMap(m=>{const f=footprint(m);return [...f.body,...f.work];}).map(cellKey));
    for (const {id,cell:place} of dockSlots(liveStage)) {
    if (occupied.has(cellKey(place))) continue;
    const operator=WORKERS.find(w=>assignments[w.key]===id);
    box(marks, 0.9, 0.035, 0.9, place.x + 0.5, 0.082, place.y + 0.5, operator ? '#a8c6e6' : '#d1ddec', false);
    outline([place], pendingWorker || selection === WAREHOUSE.id ? '#4b823a' : '#779b5b', marks, false);
    slotLabels.push({ el: label(operator ? operator.name : '＋ 창고 직원', `slot-label ${operator ? 'assigned' : 'empty'}${selection === WAREHOUSE.id || pendingWorker ? ' active' : ''}`), pos: new THREE.Vector3(place.x + 0.5, operator ? 1.8 : 0.35, place.y + 0.5) });
    const target = document.createElement('button'); target.type = 'button'; target.className = 'slot-target'; target.dataset.workId = id;
    target.setAttribute('aria-label', `창고 직원 자리 · ${operator?.name ?? '미배치'}`);
    target.addEventListener('click', event => { if (event.detail === 0) callbacks.onPick?.({ cell: place, workId: id }); }); host.append(target);
    slotTargets.push({ el: target, pos: new THREE.Vector3(place.x + 0.5, 0.12, place.y + 0.5) });
  }
  }
  const ghostMaterials = new Map();
  let previewState = null;
  function setPreview(item, valid) {
    clear(preview); previewState = null;
    if (!item) return;
    const model = art.machine(item,recipeFor(item,stage));
    model.traverse(mesh => {
      if (!mesh.isMesh) return;
      const original = mesh.material, key = original.uuid + '/' + valid;
      if (!ghostMaterials.has(key)) ghostMaterials.set(key, original.clone());
      const ghost = ghostMaterials.get(key);
      ghost.color.copy(valid ? original.color : new THREE.Color('#ef4238'));
      ghost.transparent = true; ghost.opacity = .36; ghost.depthWrite = false;
      ghost.polygonOffset = true; ghost.polygonOffsetFactor = -2; ghost.polygonOffsetUnits = -2;
      mesh.material = ghost; mesh.castShadow = false; mesh.receiveShadow = false; mesh.renderOrder = 3;
    });
    preview.add(model);
    previewState = { id: item.id, x: item.x, y: item.y, rotation: item.rotation, valid, opacity: .36 };
    outline(footprint(item).body, valid ? '#477c55' : '#ef4238', preview);
    outline(footprint(item).work, valid ? '#477c55' : '#ab5544', preview);
  }
  const workerBubbles = [];
  function workerModel(worker, index) {
    const model = art.worker(worker.color, index, worker); crowd.add(model.group);
    for(const [stage,item] of model.cargo.entries()) item.name=worker.key+'-cargo-'+stage;
    const el = label('...', 'worker-bubble'); el.hidden = true;
    el.dataset.workerBubble = worker.key; el.setAttribute('aria-label', worker.name + ' · 10초 이상 작업 대기');
    const bubble = { el, pos: new THREE.Vector3() }; workerBubbles.push(bubble); model.bubble = bubble;
    return model;
  }
  function transferEndpoint(kind, event, sim, worker, body) {
    const hand=new THREE.Vector3(0,.4+(event.stack ?? 0)*.24,.4);
    if(kind==='hand') return hand;
    const model=modelMap.get(event.id);
    const anchor=kind==='output' ? model?.userData.inventory?.outputItem :
      kind==='process' ? model?.userData.inventory?.processingItem : null;
    let point;
    if(anchor) point=anchor.getWorldPosition(new THREE.Vector3());
    else if(kind==='belt' && model) point=model.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.38,0));
    else {
      const dock=sim.stage.fixtures.find(f=>f.id===kind);
      if(!dock) return hand;
      point=new THREE.Vector3(
        THREE.MathUtils.clamp(worker.x+.5,dock.x+.5,dock.x+dock.width-.5),
        kind==='inbound' ? .65 : .72,
        THREE.MathUtils.clamp(worker.y+.5,dock.y+.5,dock.y+dock.height-.5));
    }
    return body.worldToLocal(point);
  }
  function update(sim, alpha, seconds, paused = false) {
    for (const entry of labels) entry.el.hidden = !paused || (entry===inletLabel && !inletGroup.visible);
    const receivingOutput=new Set(), receivingInput=new Set();
    if (!workerModels.length) workerModels = sim.workers.map((worker, index) => workerModel(worker, index));
    for (const worker of sim.workers) {
      const obj = workerModels[worker.id];
      // A pickup and deposit may both finish in one tick when the operator
      // stands next to both surfaces. Play those transfers in simulation order.
      const events=worker.transfers;
      const phase=Math.max(0,Math.min(1,alpha))*events.length;
      const index=Math.floor(phase), event=events[index], fraction=phase-index;
      for(let i=index;i<events.length;i++){
        if(events[i].to==='output') receivingOutput.add(events[i].id);
        if(events[i].to==='process') receivingInput.add(events[i].id);
      }
      obj.body.rotation.x = event ? Math.sin(fraction*Math.PI)*.12 : 0;
      const waiting = waitingWorkers[worker.key];
      const x = waiting?.x ?? THREE.MathUtils.lerp(worker.from.x, worker.x, alpha), y = waiting?.y ?? THREE.MathUtils.lerp(worker.from.y, worker.y, alpha);
      obj.group.visible = !!worker.machineId || !!waiting;
      obj.group.position.set(x + 0.5, 0.07, y + 0.5);
      obj.bubble.pos.set(x + .5, 2.05, y + .5);
      const dx = worker.x - worker.from.x, dy = worker.y - worker.from.y;
      if (dx || dy) obj.body.rotation.y = Math.atan2(dx, dy);
      else if (!sim.tick) obj.body.rotation.y = 1.1;
      const own = sim.machines.find(machine => machine.id === worker.machineId);
      const processingHere = !own?.parked && own?.processing > 0 && !worker.job && cellKey(worker) === cellKey(own.work[0]);
      obj.bubble.el.hidden = !worker.machineId || processingHere || worker.idleSeconds < 10;
      const waitingSource = worker.waitingForSource && modelMap.get(worker.waitingForSource);
      if (sim.tick && !(dx || dy) && waitingSource) obj.body.rotation.y = Math.atan2(waitingSource.position.x - (x + .5), waitingSource.position.z - (y + .5));
      if (!(dx || dy) && own && !waitingSource && cellKey(worker) === cellKey(own.work[0])) {
        const facing = operatorFacing(footprint(own));
        if (facing) obj.body.rotation.y = Math.atan2(facing.x,facing.y);
      }
      const working = !event && !own?.parked && own?.processing > 0 && !worker.job && !(dx || dy);
      // Drive work gestures from simulation time so pausing also freezes the hands.
      const workTime = Math.max(0, sim.time - .2 + alpha * .2);
      const workPhase = workTime * 7 + worker.id * 1.7;
      if (working) obj.body.rotation.x = .055 + Math.sin(workPhase * .5) * .018;
      obj.head.rotation.x = working ? .10 : 0;
      obj.legs.forEach((leg, index) => { leg.rotation.x = (dx || dy) ? Math.sin(seconds * 15 + index * Math.PI) * 0.45 : 0; });
      obj.arms.forEach((arm, index) => {
        const phase = workPhase + index * Math.PI;
        arm.position.y = working ? .82 : .75;
        arm.rotation.x = working ? -1.85 + Math.sin(phase) * .16 : event ? -1.05 - Math.sin(fraction*Math.PI)*.25 : (worker.carrying || own?.pendingOutput) ? -1.05 : (dx || dy) ? Math.sin(seconds * 15 + index * Math.PI) * -0.32 : -.08;
        arm.rotation.y = working ? (index ? -.12 : .12) + Math.sin(phase * .5) * .06 : 0;
        arm.rotation.z = working ? (index ? .10 : -.10) : 0;
      });
      let heldStage;
      if (worker.carrying) heldStage = worker.cargo.stage;
      else if (own?.pendingOutput) heldStage = recipeFor(own,sim.stage).outputStage ?? 4;
      const stack=event?.stack ?? 0;
      const count=event ? event.count ?? stack+1 : worker.carrying ? Math.max(1,worker.load.length) : 1;
      if(event) heldStage=event.stage;
      const offset=new THREE.Vector3();
      if(event){
        const start=transferEndpoint(event.from,event,sim,worker,obj.body);
        const end=transferEndpoint(event.to,event,sim,worker,obj.body);
        const t=fraction*fraction*(3-2*fraction);
        offset.copy(start).lerp(end,t);
        offset.y+=Math.sin(t*Math.PI)*.14;
        offset.sub(new THREE.Vector3(0,.4+stack*.24,.4));
      }
      obj.cargo.forEach((item, stage) => {
        item.visible = stage === heldStage;
        if(item.visible){
          item.position.set(0,.4,.4);
          if(!stack) item.position.add(offset);
        }
      });
      while(obj.extraCargo.length<count-1){
        const item=art.goods(obj.body,4,0,0,0,.43);
        obj.extraCargo.push(item);
      }
      obj.extraCargo.forEach((item,i)=>{
        item.visible=i+1<count;
        if(item.visible){
          item.position.set(0,.4+(i+1)*.24,.4);
          if(!stack || stack===i+1) item.position.add(offset);
        }
      });
      obj.marker.visible = worker.wait > 0;
      obj.marker.position.y = 1.85 + Math.sin(seconds * 3) * 0.05;
    }
    for (const entry of machineLabels) {
      const machine = sim.machines.find(machine => machine.id === entry.id);
      if (machine) entry.el.textContent = `${EQUIPMENT[machine.type].short}${machine.parked ? ' · 공장 밖 대기' : sim.tick ? machine.processing > 0 ? ' · 가공' : machine.pendingOutput ? ' · 출력 대기' : ' · 대기' : ''}`;
    }
    for (const entry of stockLabels) {
      const machine = sim.machines.find(item => item.id === entry.id);
      if (!machine) { entry.el.hidden = true; continue; }
      const count = machine.output + machine.reserved;
      entry.el.hidden = true; entry.el.textContent = ''; entry.el.dataset.outputCount = String(count);
      const inventory = modelMap.get(machine.id)?.userData.inventory;
      if (inventory) { inventory.processingItem.visible = machine.processing > 0 && !receivingInput.has(machine.id); inventory.outputItem.visible = count > 0 && !receivingOutput.has(machine.id); }
    }
    warehouseLabel.textContent = '출고장'; warehouseLabel.dataset.count = String(sim.warehouse.stock); warehouseLabel.dataset.displayBoxes = String(warehouseBoxes.length);
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
    const target = new THREE.Vector3(MAP.width / 2 + panX, 0, MAP.height / 2 + panZ);
    camera.position.copy(target).addScaledVector(cameraDirection, cameraDistance);
    camera.lookAt(target); camera.updateMatrixWorld();
  }
  function resize() {
    if(!host.clientWidth || !host.clientHeight) return;
    width = host.clientWidth; height = host.clientHeight;
    renderer.setSize(width, height);
    const aspect = width / height;
    const half = Math.max(MAP.width * .62, MAP.height * .62 / aspect);
    camera.aspect = aspect;
    camera.setViewOffset(width, height, 0, height * .06, width, height);
    cameraDistance = half / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    positionCamera();
    camera.updateProjectionMatrix(); callbacks.onCameraChange?.();
  }
  const observer = new ResizeObserver(resize); observer.observe(host);
  const raycaster = new THREE.Raycaster(), floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.08);
  function pick(event) {
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1), camera);
    const point = raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
    const cell = point ? { x: Math.floor(point.x), y: Math.floor(point.z) } : null;
    const hit = raycaster.intersectObjects(equipmentGroup.children, true)[0];
    const fixture = cell && currentFixtures.find(item => cell.x >= item.x && cell.x < item.x + item.width && cell.y >= item.y && cell.y < item.y + item.height);
    const workId = cell && (slotTargets.find(t=>t.el.dataset.workId && isOutbound(t.el.dataset.workId) && Math.floor(t.pos.x)===cell.x && Math.floor(t.pos.z)===cell.y)?.el.dataset.workId ?? layout.find(item => footprint(item).work.some(place => cellKey(place) === cellKey(cell)))?.id);
    const bodyId = cell && layout.find(item => footprint(item).body.some(place => cellKey(place) === cellKey(cell)))?.id;
    return { cell, id: hit?.object.userData.machineId ?? bodyId, fixedId: fixture?.id, workId };
  }
  const pointers = new Map();
  let dragged = false, start = null, panX = 0, panZ = 0;
  function planePoint(clientX, clientY) {
    const bounds = renderer.domElement.getBoundingClientRect();
    raycaster.setFromCamera(new THREE.Vector2((clientX - bounds.left) / bounds.width * 2 - 1, -(clientY - bounds.top) / bounds.height * 2 + 1), camera);
    return raycaster.ray.intersectPlane(floorPlane, new THREE.Vector3());
  }
  function zoom(ratio) { camera.zoom = THREE.MathUtils.clamp(camera.zoom * ratio, 0.75, 3); camera.updateProjectionMatrix(); callbacks.onCameraChange?.(); }
  function fit() { panX = panZ = 0; camera.zoom = 1; positionCamera(); camera.updateProjectionMatrix(); }
  host.addEventListener('pointermove', event => {
    const previous = pointers.get(event.pointerId);
    if (!previous) { if(event.pointerType==='mouse' && callbacks.onHover) callbacks.onHover(pick(event).cell); return; }
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
        positionCamera(); callbacks.onCameraChange?.();
      }
      dragged = true;
    }
  });
  host.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    host.setPointerCapture(event.pointerId);
    if (!pointers.size) { dragged = false; start = { x: event.clientX, y: event.clientY, workId: event.target.closest('[data-work-id]')?.dataset.workId }; } else dragged = true;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
  });
  host.addEventListener('pointerup', event => {
    if (!pointers.has(event.pointerId)) return;
    if (pointers.size === 1 && !dragged && Math.hypot(event.clientX - start.x, event.clientY - start.y) <= 7) {
      const hit = pick(event);
      if (start.workId) { hit.workId = start.workId; hit.id = null; }
      callbacks.onPick?.(hit);
    }
    pointers.delete(event.pointerId);
    if (!pointers.size) { start = null; dragged = false; }
  });
  host.addEventListener('pointercancel', event => { pointers.delete(event.pointerId); dragged = true; });
  host.addEventListener('wheel', event => { event.preventDefault(); zoom(Math.exp(-event.deltaY * 0.0015)); }, { passive: false });
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); callbacks.onContextLost?.(); });
  function render() {
    camera.updateMatrixWorld();
    for (const entry of [...labels, ...machineLabels, ...stockLabels, ...slotLabels, ...slotTargets, ...workerBubbles]) {
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
  function projectCell(cell) { camera.updateMatrixWorld(); const p = new THREE.Vector3(cell.x + .5, .08, cell.y + .5).project(camera), bounds = host.getBoundingClientRect(); return { x: bounds.left + (p.x + 1) * width / 2, y: bounds.top + (1 - p.y) * height / 2 }; }
  function dispose() {
    observer.disconnect(); art.dispose();
    scene.traverse(o=>{o.geometry?.dispose(); if(o.material&&!Array.isArray(o.material)) o.material.dispose();});
    renderer.dispose(); renderer.forceContextLoss();
    host.replaceChildren();
  }
  const cameraState=()=>({panX,panZ,zoom:camera.zoom});
  function restoreCamera(state){panX=state.panX;panZ=state.panZ;camera.zoom=state.zoom;positionCamera();camera.updateProjectionMatrix();}
  return { dispose, cameraState, restoreCamera, setLayout, setPreview, inspectPreview: () => previewState, update, showHeat, render, renderer, camera, fit, audit: art.audit, projectCell, pickAt: (clientX, clientY) => pick({ clientX, clientY }) };
}

