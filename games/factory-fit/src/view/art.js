import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { FACTORIES } from '../game/products.js';
import { workshopProduct } from './workshop-product-models.js';
import { buildProduct } from './product-models.js';
import { EQUIPMENT, TYPES, STAGE } from '../game/config.js';
import { shapeFor } from '../game/equipment-shapes.js';
import { buildEquipment } from './equipment-models.js';

// The approved concept image is the visual reference. Geometry stays in tile units.
export function createArtKit(renderer, factory=STAGE) {
  const materials = new Map(), geometries = new Map();
  let seed = 12771;
  const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  function surfaceTexture(wood = false) {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.createImageData(256, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const value = 249 + Math.floor(random() * 6);
      pixels.data.set([value, value - (wood ? 2 : 0), value - (wood ? 5 : 1), 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
    if (wood) {
      for (let y = 3; y < 256; y += 5 + random() * 8) {
        ctx.strokeStyle = `rgba(112,77,41,${0.035 + random() * 0.045})`; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.moveTo(0, y);
        ctx.bezierCurveTo(64, y + random() * 8, 184, y - random() * 7, 256, y + 1); ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(126,85,49,.045)';
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(36 + random() * 185, 20 + random() * 215, 24, 3, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  const textures = { clay: surfaceTexture(), wood: surfaceTexture(true) };
  function concreteTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
    const ctx = canvas.getContext('2d'), pixels = ctx.createImageData(256, 256);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const shade = Math.round(211 + random() * 34);
      pixels.data.set([shade, shade, shade, 255], i);
    }
    ctx.putImageData(pixels, 0, 0);
    // Fine aggregate flecks distinguish the exterior from the smooth interior tiles.
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = i % 3 ? '#858b8b38' : '#ffffff50';
      ctx.fillRect(random() * 256, random() * 256, 1 + random() * 2, 1 + random() * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(50, 50);
    texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    return texture;
  }
  textures.concrete = concreteTexture();
  const concreteBump = textures.concrete.clone(); concreteBump.colorSpace = THREE.NoColorSpace; concreteBump.needsUpdate = true;
  const woodBump = textures.wood.clone(); woodBump.colorSpace = THREE.NoColorSpace; woodBump.needsUpdate = true;
  function material(color, kind = 'clay') {
    const key = `${color}/${kind}`;
    if (!materials.has(key)) materials.set(key, new THREE.MeshStandardMaterial({
      color, map: kind === 'metal' ? null : textures[kind] ?? textures.clay,
      roughness: kind === 'concrete' ? .98 : kind === 'wood' ? 0.72 : kind === 'cloth' ? 0.95 : kind === 'metal' ? 0.44 : 0.61,
      metalness: kind === 'metal' ? 0.22 : 0,
      bumpMap: kind === 'concrete' ? concreteBump : kind === 'wood' ? woodBump : null, bumpScale: kind === 'concrete' ? .025 : kind === 'wood' ? 0.008 : 0,
    }));
    return materials.get(key);
  }
  function cached(key, create) { if (!geometries.has(key)) geometries.set(key, create()); return geometries.get(key); }
  function mesh(group, geometry, color, x, y, z, kind = 'clay') {
    const item = new THREE.Mesh(geometry, material(color, kind)); item.position.set(x, y, z);
    item.castShadow = true; item.receiveShadow = true; group.add(item); return item;
  }
  function box(group, w, h, d, x, y, z, color, round = true, kind = 'clay') {
    const radius = Math.min(0.12, w / 5, h / 3, d / 5);
    return mesh(group, cached(`box/${w}/${h}/${d}/${round}`, () => round ? new RoundedBoxGeometry(w, h, d, 2, radius) : new THREE.BoxGeometry(w, h, d)), color, x, y, z, kind);
  }
  const wood = (group, w, h, d, x, y, z, color) => box(group, w, h, d, x, y, z, color, true, 'wood');
  function sphere(group, radius, x, y, z, color, scale = [1, 1, 1]) {
    const item = mesh(group, cached(`sphere/${radius}`, () => new THREE.SphereGeometry(radius, radius < .1 ? 12 : 24, radius < .1 ? 8 : 16)), color, x, y, z);
    item.scale.set(...scale); return item;
  }
  function cylinder(group, top, bottom, h, x, y, z, color, segments = 24, kind = 'clay') {
    return mesh(group, cached(`cyl/${top}/${bottom}/${h}/${segments}`, () => new THREE.CylinderGeometry(top, bottom, h, segments)), color, x, y, z, kind);
  }
  function ring(group, radius, tube, x, y, z, color) {
    return mesh(group, cached(`ring/${radius}/${tube}`, () => new THREE.TorusGeometry(radius, tube, 10, 24)), color, x, y, z);
  }
  // Collapse immutable details by material; animation and stock visibility stay on their parent groups.
  const templates = new Map();
  function compact(group, key) {
    if (!templates.has(key)) {
      group.updateWorldMatrix(true, true);
      const inverse = group.matrixWorld.clone().invert(), batches = new Map();
      group.traverse(child => {
        if (!child.isMesh || child.material.transparent) return;
        const geometry = child.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, child.matrixWorld));
        const flat = geometry.index ? geometry.toNonIndexed() : geometry;
        if (flat !== geometry) geometry.dispose();
        if (!batches.has(child.material)) batches.set(child.material, []);
        batches.get(child.material).push(flat);
      });
      const template = new THREE.Group();
      for (const [mat, parts] of batches) {
        const geometry = new THREE.BufferGeometry();
        for (const name of ['position', 'normal', 'uv']) {
          const arrays = parts.map(part => part.getAttribute(name).array);
          const values = new Float32Array(arrays.reduce((sum, array) => sum + array.length, 0));
          let offset = 0; for (const array of arrays) { values.set(array, offset); offset += array.length; }
          geometry.setAttribute(name, new THREE.BufferAttribute(values, name === 'uv' ? 2 : 3));
        }
        parts.forEach(part => part.dispose()); geometry.computeBoundingSphere();
        geometries.set(`${key}/${mat.uuid}`, geometry);
        const item = new THREE.Mesh(geometry, mat); item.castShadow = item.receiveShadow = true; template.add(item);
      }
      templates.set(key, template);
    }
    const transparent = group.children.filter(child => child.isMesh && child.material.transparent);
    group.clear(); group.add(...transparent, ...templates.get(key).clone().children.slice()); return group;
  }
  const shade = (color, amount) => `#${new THREE.Color(color).lerp(new THREE.Color(amount > 0 ? '#fff1d3' : '#5b4030'), Math.abs(amount)).getHexString()}`;
  function crate(group, x, y, z, size = 0.65, color = '#c49159') {
    const item = new THREE.Group(); item.position.set(x, y, z); group.add(item);
    const post = size * 0.11, height = size * 0.78;
    for (let i = 0; i < 3; i++) wood(item, size - 0.04, size * 0.09, size / 3 - 0.014, 0, size * 0.045, (i - 1) * size / 3, color);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) wood(item, post, height, post, sx * (size - post) / 2, height / 2, sz * (size - post) / 2, shade(color, 0.12));
    for (let row = 0; row < 3; row++) {
      const level = size * (0.18 + row * 0.245);
      for (const sign of [-1, 1]) {
        wood(item, size, size * 0.19, size * 0.065, 0, level, sign * size * 0.475, shade(color, row % 2 ? 0.05 : 0));
        wood(item, size * 0.065, size * 0.19, size - post, sign * size * 0.475, level, 0, color);
      }
    }
    for (const sign of [-1, 1]) { const brace = wood(item, size * 0.98, size * 0.09, size * 0.045, 0, height / 2, sign * size * 0.52, shade(color, 0.18)); brace.rotation.z = 0.55; }
    return item;
  }
  function goods(group, stage, x, y, z, size = 0.55) {
    const key = `goods/${stage}/${size}`;
    if (templates.has(key)) {
      const item = templates.get(key).clone(); item.position.set(x, y, z); group.add(item); return item;
    }
    let item;
    const name=factory.goods?.[stage];
    const workshopStep=factory.modelSteps?.[stage];
    const boxStep=workshopStep??stage;
    if((name || workshopStep!==undefined) && factory.factory!=='box'){
      item=new THREE.Group();group.add(item);item.position.set(x,y,z);
      const miniature=new THREE.Group();item.add(miniature);miniature.scale.setScalar(size);
      const kit={box,sphere,cylinder,ring};
      if(workshopStep==null && name)buildProduct(name,miniature,kit);
      else workshopProduct(FACTORIES[factory.factory],workshopStep,miniature,kit);
    } else if (boxStep < 2) {
      item = new THREE.Group(); item.position.set(x, y, z); group.add(item);
      for (let i = 0; i < 3; i++) wood(item, size * (boxStep ? 0.87 : 1.35), size * 0.16, size * 0.25, 0, size * 0.08 + (boxStep ? i * size * 0.16 : 0), boxStep ? 0 : (i - 1) * size * 0.27, i % 2 ? '#e3b681' : '#cda069');
    } else {
      item = crate(group, x, y, z, size, boxStep >= 3 ? '#80a9d1' : '#c99c60');
      if (stage === 4 || workshopStep===3 || name==='띠 두른 상자') {
        for (let i = 0; i < 3; i++) wood(item, size, size * 0.07, size / 3 - 0.01, 0, size * 0.81, (i - 1) * size / 3, '#87afd5');
        box(item, size * 0.16, size * 0.86, size + 0.065, 0, size * 0.43, 0, '#f3d9a9');
        box(item, size + 0.065, size * 0.86, size * 0.16, 0, size * 0.43, 0, '#f3d9a9');
      }
    }
    return compact(item, key);
  }
  const shadowCanvas = document.createElement('canvas'); shadowCanvas.width = shadowCanvas.height = 128;
  const shadowContext = shadowCanvas.getContext('2d'), gradient = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(91,62,49,.28)'); gradient.addColorStop(.42, 'rgba(91,62,49,.18)'); gradient.addColorStop(1, 'rgba(91,62,49,0)');
  shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128);
  const shadowMap = new THREE.CanvasTexture(shadowCanvas); shadowMap.colorSpace = THREE.SRGBColorSpace;
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.75 });
  function contactShadow(group, w, d, x = 0, y = 0.07, z = 0) {
    const item = new THREE.Mesh(cached('shadow-plane', () => new THREE.PlaneGeometry(1, 1)), shadowMaterial);
    item.rotation.x = -Math.PI / 2; item.scale.set(w, d, 1); item.position.set(x, y, z); group.add(item); return item;
  }
  function bench(group, w, d, color) {
    for (const x of [-w / 2 + .27, w / 2 - .27]) for (const z of [-d / 2 + .26, d / 2 - .26]) {
      const leg = wood(group, .24, .92, .25, x, .46, z, '#bf9566'); leg.rotation.z = x > 0 ? -.025 : .025;
    }
    wood(group, w - .22, .13, d - .3, 0, .76, 0, '#bc9260');
    for (let i = 0; i < 4; i++) wood(group, w - .12, .23, (d - .13) / 4 - .012, 0, .92, (i - 1.5) * (d - .13) / 4, i % 2 ? shade(color, .045) : color);
  }
  function inbound({x=0,y=0,width=2,height=2,supplies}) {
    const group=new THREE.Group();
    if(supplies || factory.modelSteps){
      wood(group,width-.12,.16,height-.12,width/2,.12,height/2,'#aa835a');
      for(let i=0;i<(supplies?.length===0?0:4);i++)goods(group,supplies?factory.goods.indexOf(supplies[i%supplies.length]):0,.52+(i%2)*.93,.23,.53+(i>>1)*.9,.7);
    }else for(let row=0;row<height;row++) for(let layer=0;layer<3;layer++){
      wood(group,width-.22,.16,.66,width/2,.17+layer*.17,row+.5,layer%2?'#d2a36c':'#bd8d53');
    }
    group.position.set(x,0,y);
    return group;
  }
  function machine(item, spec = EQUIPMENT[item.type]) {
    if (EQUIPMENT[item.type]?.mask) {
      spec = {...spec, ...shapeFor(item),inputTray:factory.forward};
      const group = new THREE.Group();
      const model = buildEquipment(item, spec, { box, wood, cylinder, sphere, material, cached });
      const output = model.userData.outputAnchor.clone(), process = model.userData.processAnchor.clone();
      group.add(model); group.position.set(item.x + (item.rotation % 2 ? spec.height : spec.width)/2, .07, item.y + (item.rotation % 2 ? spec.width : spec.height)/2);
      model.rotation.y = -item.rotation * Math.PI / 2;
      // Merge local-space geometry before applying the machine rotation.
      model.rotation.y = 0; compact(model, `reference/${item.type}/${item.variant ?? spec.defaultVariant}`); model.rotation.y = -item.rotation * Math.PI / 2;
      const processingItem = goods(model, spec.inputStage ?? 0, process.x, process.y, process.z, .45); processingItem.visible = false;
      const outputItem = goods(model,spec.outputStage ?? 4,output.x,output.y,output.z,.45);
      outputItem.visible = false;
      const stockItems=[];
      const slots=Object.entries(spec.needs??{}).flatMap(([product,count])=>Array(count).fill(product));
      slots.forEach((product,i)=>{
        const cols=Math.min(slots.length,3),rows=Math.ceil(slots.length/cols);
        const anchor=factory.paired?process:output;
        const piece=goods(model,factory.goods.indexOf(product),anchor.x+(i%cols-(cols-1)/2)*.26,
          anchor.y,anchor.z+(Math.floor(i/cols)-(rows-1)/2)*.33,slots.length===1?.48:.25);
        piece.visible=false;stockItems.push({product,piece,quantity:slots.slice(0,i+1).filter(p=>p===product).length});
      });
      group.userData.inventory = { processingItem, outputItem,stockItems };
      group.traverse(obj=>{if(obj.isMesh)obj.userData.machineId=item.id;}); return group;
    }
    const group = new THREE.Group(), model = new THREE.Group(); group.add(model);
    const w = spec.width, d = spec.height;
    group.position.set(item.x + (item.rotation % 2 ? d : w) / 2, .07, item.y + (item.rotation % 2 ? w : d) / 2);
    model.rotation.y = -item.rotation * Math.PI / 2;
    contactShadow(model, w + .6, d + .5, 0, 0, 0);
    if (spec.belt) {
      box(model, .94, .32, .96, 0, .23, 0, spec.color);
      for (const z of [-.32, -.16, 0, .16, .32]) {
        const roller = cylinder(model, .065, .065, .75, 0, .41, z, '#414b50');
        roller.rotation.z = Math.PI / 2;
      }
      compact(model, 'machine/conveyor');
      group.traverse(obj => { if (obj.isMesh) obj.userData.machineId = item.id; });
      return group;
    }
    if (item.type === 'cutter') {
      box(model, w - .3, .85, d - .35, 0, .47, 0, '#629b82');
      box(model, w - .62, .35, .12, 0, .43, d / 2 - .12, '#68977f');
      box(model, w - .1, .15, d - .12, 0, .98, 0, '#c8cec7');
      box(model, .13, .018, 1.25, -.05, 1.062, .02, '#6c7774');
      box(model, .72, 1.05, .5, -.75, 1.34, -.5, '#76a48e');
      box(model, 1.15, .33, .36, -.25, 1.7, -.5, '#83b09d');
      const blade = cylinder(model, .45, .45, .065, -.045, 1.36, .05, '#d7d9d3', 40, 'metal'); blade.rotation.z = Math.PI / 2;
      for (let i = 0; i < 18; i++) { const angle = i / 18 * Math.PI * 2; const tooth = box(model, .07, .075, .07, -.045, 1.36 + Math.sin(angle) * .45, .05 + Math.cos(angle) * .45, '#c7cfcb'); tooth.rotation.x = -angle; }
      const coverShape = new THREE.Shape(); coverShape.moveTo(-.53, 0); coverShape.absarc(0, 0, .53, Math.PI, 0, true); coverShape.closePath();
      const cover = mesh(model, cached('saw-cover', () => new THREE.ExtrudeGeometry(coverShape, { depth: .2, bevelEnabled: true, bevelSegments: 3, bevelSize: .035, bevelThickness: .035, steps: 1, curveSegments: 20 })), '#efbb4c', -.08, 1.56, .05); cover.rotation.y = Math.PI / 2;
      for (const y of [.34, .46, .58]) box(model, .025, .045, .52, w / 2 - .14, y, -.25, '#618b76');
      const button = cylinder(model, .095, .095, .045, w / 2 - .12, .65, .45, '#ed9851'); button.rotation.z = Math.PI / 2;
    } else if (item.type === 'paint') {
      for (const x of [-.7, .7]) for (const z of [-1.15, 1.15]) box(model, .22, .92, .23, x, .46, z, '#8fa4b1');
      box(model, w - .12, .22, d - .15, 0, .9, 0, '#9cb9d5');
      for (const x of [-w / 2 + .15, w / 2 - .15]) { const near = x > 0; box(model, .19, near ? .53 : .98, d - .25, x, near ? 1.175 : 1.4, 0, '#88a9ce'); }
      box(model, w - .22, .98, .18, 0, 1.4, -d / 2 + .17, '#88a9ce');
      box(model, w - .09, .22, .76, 0, 1.99, -.98, '#9ab6d5');
      box(model, .5, .38, .49, 0, 2.26, -1.02, '#b1b7b6');
      const light = box(model, .82, .045, .17, 0, 1.85, -1.12, '#fff0b0'); if (!materials.has('booth-light')) materials.set('booth-light', new THREE.MeshStandardMaterial({ color: '#fff2c1', emissive: '#ffe3a0', emissiveIntensity: .6, roughness: .6 })); light.material = materials.get('booth-light');
      const tin = cylinder(model, .16, .16, .26, .56, 1.12, .28, '#f0c267'); ring(model, .16, .025, .56, 1.255, .28, '#f5d690').rotation.x = Math.PI / 2;
    } else {
      bench(model, w, d, item.type === 'assembly' ? '#ca9659' : '#d1a05f');
      if (item.type === 'assembly') {
        wood(model, .95, .07, .15, -.65, 1.09, -.95, '#ebc58e');
        const handle = cylinder(model, .045, .045, .43, .91, 1.1, -.76, '#b6834b'); handle.rotation.z = Math.PI / 2;
        box(model, .18, .14, .32, 1.12, 1.15, -.76, '#899a9b');
        box(model, .34, .21, .32, -1.12, 1.13, -.82, '#7d9995');
      } else {
        ring(model, .17, .07, .52, 1.21, -.48, '#f1ce7d');
        wood(model, .5, .035, .4, -.5, 1.055, -.5, '#ecd5ac');
        ring(model, .085, .025, -.57, 1.11, -.52, '#6b929d').rotation.x = Math.PI / 2;
      }
    }
    compact(model, `machine/${item.type}`);
    const stage = spec.inputStage, top = item.type === 'paint' ? 1.02 : 1.065;
    const processingItem = goods(model, stage, item.type === 'cutter' ? -.65 : 0, top, item.type === 'assembly' || item.type === 'packing' ? -.35 : 0, .7); processingItem.visible = false;
    const [x,z] = item.type === 'cutter' ? [-.85,.6] : item.type === 'assembly' ? [-.85,.85] : item.type === 'paint' ? [-.4,1] : [-.43,.55];
    const outputItem = goods(model,spec.outputStage,x,top,z,.54);
    outputItem.visible = false;
    group.userData.inventory = { processingItem, outputItem };
    group.traverse(obj => { if (obj.isMesh) obj.userData.machineId = item.id; }); return group;
  }
  function faceMaterial(index = 0, skin = '#edc5a1') {
    const key = `painted-face/${index}/${skin}`;
    if (!materials.has(key)) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
      const ctx = canvas.getContext('2d'); ctx.fillStyle = skin; ctx.fillRect(0, 0, 512, 256);
      const spacing = 22 + (index % 3) * 3, eyeY = 123;
      ctx.fillStyle = '#3b302c'; ctx.strokeStyle = '#3b302c';ctx.lineWidth=3;ctx.lineCap='round';
      for (const x of [128-spacing,128+spacing]) {
        ctx.beginPath();
        if(index%5===1){ctx.moveTo(x-5,eyeY+1);ctx.quadraticCurveTo(x,eyeY-7,x+5,eyeY+1);ctx.stroke();}
        else {ctx.ellipse(x,eyeY,4+(index%2),5+(index%3),0,0,Math.PI*2);ctx.fill();}
        ctx.beginPath();ctx.moveTo(x-7,eyeY-15+(index%3));ctx.lineTo(x+6,eyeY-16-(index%3));ctx.stroke();
      }
      ctx.strokeStyle='#805441';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(128,134);ctx.lineTo(125,140);ctx.lineTo(129,140);ctx.stroke();
      ctx.strokeStyle='#714338';ctx.lineWidth=3;ctx.beginPath();
      ctx.moveTo(117,151);ctx.quadraticCurveTo(128,151+(index%4)*4,140,149);ctx.stroke();
      if(index%5===2){ctx.strokeStyle='#354952';ctx.lineWidth=3;for(const x of [128-spacing,128+spacing]){ctx.beginPath();ctx.ellipse(x,124,12,10,0,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(116,123);ctx.lineTo(140,123);ctx.stroke();}
      if(index%4===0){ctx.fillStyle='#b47552';for(const x of [90,96,102,154,160,166]){ctx.beginPath();ctx.arc(x,139+(x%3)*2,1.6,0,Math.PI*2);ctx.fill();}}
      if(index%5===3){ctx.fillStyle='#634632';ctx.beginPath();ctx.ellipse(128,145,11,3,0,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='rgba(218,132,116,.32)';for(const x of [87,169]){ctx.beginPath();ctx.ellipse(x,141,9,4,0,0,Math.PI*2);ctx.fill();}
      const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
      materials.set(key,new THREE.MeshStandardMaterial({map,roughness:.8}));
    }
    return materials.get(key);
  }
  function worker(color, index = 0, appearance = {}) {
    const hairstyle = appearance.hairstyle ?? (appearance.gender === 'female' ? 'ponytail' : 'short');
    const group = new THREE.Group(), body = new THREE.Group(); group.add(body);
    group.scale.setScalar(1.1);
    contactShadow(group, .85, .68, 0, .003, 0);
    const head = new THREE.Group(); head.position.y = 1.08; body.add(head);
    const face = sphere(head, .31, 0, 0, 0, '#edc5a1', [1.02, 1.02, .96]); face.material = faceMaterial(appearance.faceStyle ?? index, appearance.skin ?? '#edc5a1');
    const hair = appearance.hairColor ?? (hairstyle === 'bob' ? '#59402f' : '#795337');
    sphere(head, .29, 0, -.045, -.075, hair, [1, .92, .8]);
    for (const sign of [-1, 1]) {
      sphere(head, .065, sign * .29, -.015, 0, appearance.skin ?? '#e5b58d', [.7, 1, .8]);
      if (hairstyle === 'bob') sphere(head, .16, sign * .255, -.13, -.07, hair, [.65, 1.35, 1.2]);
      else box(head, .11, .15, .12, sign * .245, .005, -.12, hair);
    }
    if (hairstyle === 'ponytail') {
      sphere(head, .14, 0, -.025, -.34, hair, [.8, .8, 1]);
      sphere(head, .17, 0, -.14, -.47, hair, [.7, 1.6, .9]);
      sphere(head, .09, 0, -.025, -.37, color, [1, .65, .65]);
    } else if (hairstyle === 'bob') sphere(head, .28, 0, -.11, -.14, hair, [1.03, 1, .7]);
    const hat = color;
    const dome = mesh(head, cached('helmet-dome', () => new THREE.SphereGeometry(.355, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2)), hat, 0, .16, -.015); dome.scale.z = 1.04;
    cylinder(head, .374, .374, .048, 0, .17, 0, hat, 32);
    box(head, .48, .05, .25, 0, .17, .265, hat);
    box(head, .055, .048, .47, 0, .5, -.015, shade(hat, .12));
    box(head, .11, .04, .018, 0, .215, .35, color);
    compact(head, `head/${color}/${index}/${hairstyle}/${appearance.skin}/${hair}`);
    box(body, .4, .4, .32, 0, .62, 0, '#e2dfcf', true, 'cloth');
    box(body, .32, .3, .065, 0, .57, .173, '#7297b1', true, 'cloth');
    box(body, .15, .12, .035, 0, .57, .219, '#6489a5', true, 'cloth');
    for (const sign of [-1, 1]) { box(body, .055, .3, .045, sign * .115, .73, .18, '#7297b1'); box(body, .055, .35, .045, sign * .115, .65, -.17, '#7297b1'); sphere(body, .018, sign * .115, .66, .211, '#ebcf8a'); }
    const legs = [-.115, .115].map(x => { const leg = new THREE.Group(); leg.position.set(x, .38, 0); body.add(leg); box(leg, .17, .27, .18, 0, -.12, 0, '#668ba4', true, 'cloth'); box(leg, .2, .14, .29, 0, -.31, .045, '#627375'); return leg; });
    const arms = [-1, 1].map(sign => { const arm = new THREE.Group(); arm.position.set(sign * .235, .75, 0); body.add(arm); sphere(arm, .105, 0, -.08, 0, '#e0ddcd', [.85, 1.35, 1]); sphere(arm, .085, 0, -.28, .045, appearance.skin ?? '#edc39a', [.9, 1.1, 1]); return arm; });
    const cargo = Array.from({ length: factory.goods?.length??factory.modelSteps?.length??5 }, (_, stage) => { const item = goods(body, stage, 0, .4, .4, .43); item.visible = false; return item; });
    const marker = sphere(group, .09, 0, 1.85, 0, '#f1c366'); marker.visible = false;
    const extraCargo = [1, 2].map(i => {
      const item = goods(body, factory.modelSteps?factory.modelSteps.length-1:4, 0, .4 + i * .24, .4, .43); item.visible = false; return item;
    });
    return { group, body, head, arms, legs, cargo, extraCargo, marker };
  }
  function plant(group, x, z) {
    cylinder(group, .27, .2, .4, x, .18, z, '#d59a71');
    ring(group, .25, .045, x, .39, z, '#e2b18c').rotation.x = Math.PI / 2;
    cylinder(group, .21, .21, .03, x, .39, z, '#8c7352');
    for (let i = 0; i < 5; i++) { const angle = i * Math.PI * 2 / 5; const leaf = sphere(group, .25, x + Math.cos(angle) * .15, .65 + i % 2 * .05, z + Math.sin(angle) * .15, i % 2 ? '#a6bb79' : '#8ba967', [.55, 1.3, .65]); leaf.rotation.z = -Math.cos(angle) * .4; leaf.rotation.x = Math.sin(angle) * .4; }
    contactShadow(group, .85, .75, x, .069, z);
  }
  function audit() {
    let invalid = 0, triangles = 0;
    for (const geometry of geometries.values()) {
      const p = geometry.getAttribute('position'); for (const value of p.array) if (!Number.isFinite(value)) invalid++;
      triangles += (geometry.index ? geometry.index.count : p.count) / 3;
    }
    return { geometries: geometries.size, materials: materials.size, cachedTriangles: Math.round(triangles), invalidValues: invalid, proceduralTextures: 3 + [...materials.keys()].filter(k=>k.startsWith('painted-face/')).length };
  }
  function dispose() {
    shadowMaterial.dispose(); shadowMap.dispose();
    const maps = new Set([...Object.values(textures), woodBump, concreteBump]);
    for (const mat of materials.values()) { for (const value of Object.values(mat)) if (value?.isTexture) maps.add(value); mat.dispose(); }
    for (const map of maps) map.dispose();
    for (const geometry of geometries.values()) geometry.dispose();
  }
  return { box, wood, sphere, cylinder, ring, crate, goods, material, contactShadow, compact, inbound, machine, worker, plant, audit, dispose };
}
